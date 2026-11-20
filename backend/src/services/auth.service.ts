import * as argon2 from 'argon2';
import { UserRepository } from '../repositories/user.repository';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { AuthTokens, UserDto } from '@pulsewatch/shared';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../utils/jwt';
import config from '../config';

export class AuthService {
  constructor(private userRepo: UserRepository = new UserRepository()) {}

  private async generateTokens(user: { id: string; email: string; name: string }): Promise<{
    tokens: AuthTokens;
    rawRefreshToken: string;
  }> {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    const { rawRefreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await this.userRepo.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const userDto: UserDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      tokens: {
        accessToken,
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
        user: userDto,
      },
      rawRefreshToken,
    };
  }

  async register(dto: RegisterInput): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    const { tokens, rawRefreshToken } = await this.generateTokens(user);
    tokens.user.createdAt = user.createdAt.toISOString();
    tokens.user.updatedAt = user.updatedAt.toISOString();

    return { tokens, rawRefreshToken };
  }

  async login(dto: LoginInput): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { tokens, rawRefreshToken } = await this.generateTokens(user);
    tokens.user.createdAt = user.createdAt.toISOString();
    tokens.user.updatedAt = user.updatedAt.toISOString();

    return { tokens, rawRefreshToken };
  }

  async refreshTokens(rawRefreshToken: string): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await this.userRepo.findRefreshToken(tokenHash);

    if (!existing) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (existing.revokedAt) {
      console.warn(`[Security] Revoked refresh token reuse detected for user ${existing.userId}. Revoking all sessions.`);
      await this.userRepo.revokeAllUserRefreshTokens(existing.userId);
      throw new UnauthorizedError('Token reuse detected. All sessions revoked for security.');
    }

    if (new Date() > existing.expiresAt) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    await this.userRepo.revokeRefreshToken(existing.id);

    const { tokens, rawRefreshToken: newRawRefreshToken } = await this.generateTokens(existing.user);
    tokens.user.createdAt = existing.user.createdAt.toISOString();
    tokens.user.updatedAt = existing.user.updatedAt.toISOString();

    return { tokens, rawRefreshToken: newRawRefreshToken };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      const existing = await this.userRepo.findRefreshToken(tokenHash);
      if (existing) {
        await this.userRepo.revokeRefreshToken(existing.id);
      }
    }
  }

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
