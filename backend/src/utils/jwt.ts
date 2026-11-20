import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import * as crypto from 'crypto';
import config from '../config';
import { JwtPayload } from '@pulsewatch/shared';
import { UnauthorizedError } from './errors';

export function signAccessToken(payload: { sub: string; email: string; name: string }): string {
  const options: SignOptions = {
    expiresIn: (config.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  };
  return jwt.sign(payload, config.JWT_ACCESS_SECRET as Secret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET as Secret, {
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    }) as JwtPayload;
    return decoded;
  } catch (error: any) {
    throw new UnauthorizedError('Authentication token missing or invalid');
  }
}

export function hashRefreshToken(token: string): string {
  return crypto
    .createHmac('sha256', config.REFRESH_TOKEN_PEPPER)
    .update(token)
    .digest('hex');
}

export function generateRefreshToken(): {
  rawRefreshToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  return {
    rawRefreshToken,
    tokenHash,
    expiresAt,
  };
}
