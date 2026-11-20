import * as dns from 'dns';
import * as dnsPromises from 'dns/promises';
import * as net from 'net';

export interface ValidatedTarget {
  pinnedIp: string;
  family: 4 | 6;
  originalUrl: URL;
  hostname: string;
  port: number;
}

export class SsrfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfValidationError';
  }
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // invalid IP treated as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata: 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24, 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && (b === 51 || b === 18 || b === 19)) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, link-local, or IPv4-mapped private range.
 */
export function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // Unique Local Address (fc00::/7 -> fc00... to fdff...)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-Local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:192.0.2.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.substring('::ffff:'.length);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIpv4(ipv4Part);
    }
  }

  return false;
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIpv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isPrivateIpv6(ip);
  }
  return true;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Scheme must be http or https
 * - Disallows credentials in URL (user:pass@)
 * - Resolves all DNS records and ensures none point to private / loopback / metadata IPs
 * - Returns a ValidatedTarget with pinned IP for request dispatching
 */
export async function validateTargetUrl(rawUrl: string): Promise<ValidatedTarget> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfValidationError('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfValidationError(`Forbidden protocol: ${parsed.protocol}. Only http and https are allowed.`);
  }

  if (parsed.username || parsed.password) {
    throw new SsrfValidationError('URLs containing user credentials are not permitted.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost or internal metadata names explicitly
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new SsrfValidationError(`Forbidden target host: ${hostname}`);
  }

  const defaultPort = parsed.protocol === 'https:' ? 443 : 80;
  const port = parsed.port ? parseInt(parsed.port, 10) : defaultPort;

  // Check if hostname is already a raw IP
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new SsrfValidationError(`Direct access to private or reserved IP address is forbidden: ${hostname}`);
    }
    return {
      pinnedIp: hostname,
      family: net.isIPv4(hostname) ? 4 : 6,
      originalUrl: parsed,
      hostname,
      port,
    };
  }

  // Resolve DNS to verify all returned IPs are safe
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dnsPromises.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new SsrfValidationError(`DNS resolution failure for ${hostname}: ${err.message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new SsrfValidationError(`No DNS records found for host: ${hostname}`);
  }

  for (const addr of addresses) {
    if (isPrivateIp(addr.address)) {
      throw new SsrfValidationError(
        `Host ${hostname} resolved to forbidden private/reserved IP: ${addr.address}`
      );
    }
  }

  // Pin the first validated IP address to prevent DNS rebinding
  const selected = addresses[0];

  return {
    pinnedIp: selected.address,
    family: selected.family as 4 | 6,
    originalUrl: parsed,
    hostname,
    port,
  };
}
