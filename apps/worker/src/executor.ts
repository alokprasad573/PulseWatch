import * as http from 'http';
import * as https from 'https';
import { MonitorMethod } from '@pulsewatch/shared';
import { ValidatedTarget, validateTargetUrl, SsrfValidationError } from './ssrf';

export interface ExecutionResult {
  statusCode: number | null;
  responseTimeMs: number | null;
  isSuccess: boolean;
  errorType: string | null;
  errorMessage: string | null;
}

export async function executeHttpCheck(params: {
  url: string;
  method: MonitorMethod;
  timeoutMs: number;
  expectedStatusCode: number;
  maxResponseBytes?: number;
}): Promise<ExecutionResult> {
  const { url, method, timeoutMs, expectedStatusCode, maxResponseBytes = 1048576 } = params;

  let target: ValidatedTarget;
  try {
    target = await validateTargetUrl(url);
  } catch (err: any) {
    return {
      statusCode: null,
      responseTimeMs: null,
      isSuccess: false,
      errorType: err instanceof SsrfValidationError ? 'SSRF_VIOLATION' : 'DNS_RESOLUTION_FAILURE',
      errorMessage: err.message,
    };
  }

  const isHttps = target.originalUrl.protocol === 'https:';
  const startTime = process.hrtime.bigint();

  return new Promise<ExecutionResult>((resolve) => {
    let resolved = false;

    const complete = (result: ExecutionResult) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const requestOptions: https.RequestOptions = {
      protocol: target.originalUrl.protocol,
      host: target.pinnedIp, // Connect to pinned IP to prevent DNS rebinding
      port: target.port,
      path: `${target.originalUrl.pathname}${target.originalUrl.search}`,
      method,
      headers: {
        Host: target.hostname, // Preserve original Host header
        'User-Agent': 'PulseWatch-Monitor/1.0 (+https://pulsewatch.dev)',
        Accept: '*/*',
        Connection: 'close',
      },
      servername: target.hostname, // Preserve TLS SNI
      timeout: timeoutMs,
    };

    const clientModule = isHttps ? https : http;

    const req = clientModule.request(requestOptions, (res) => {
      let bytesReceived = 0;

      res.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
        if (bytesReceived > maxResponseBytes) {
          req.destroy(new Error(`Response exceeded maximum size of ${maxResponseBytes} bytes`));
        }
      });

      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number((endTime - startTime) / BigInt(1_000_000));
        const statusCode = res.statusCode ?? 0;
        const isSuccess = statusCode === expectedStatusCode;

        complete({
          statusCode,
          responseTimeMs,
          isSuccess,
          errorType: isSuccess ? null : 'STATUS_CODE_MISMATCH',
          errorMessage: isSuccess ? null : `Expected HTTP ${expectedStatusCode}, received ${statusCode}`,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      complete({
        statusCode: null,
        responseTimeMs: null,
        isSuccess: false,
        errorType: 'TIMEOUT',
        errorMessage: `Request timed out after ${timeoutMs}ms`,
      });
    });

    req.on('error', (err: any) => {
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number((endTime - startTime) / BigInt(1_000_000));

      let errorType = 'CONNECTION_ERROR';
      if (err.code === 'ECONNREFUSED') errorType = 'CONNECTION_REFUSED';
      else if (err.code === 'ENOTFOUND') errorType = 'DNS_RESOLUTION_FAILURE';
      else if (err.code === 'CERT_HAS_EXPIRED' || err.code?.startsWith('ERR_TLS_')) errorType = 'TLS_VALIDATION_FAILURE';

      complete({
        statusCode: null,
        responseTimeMs,
        isSuccess: false,
        errorType,
        errorMessage: err.message,
      });
    });

    req.end();
  });
}
