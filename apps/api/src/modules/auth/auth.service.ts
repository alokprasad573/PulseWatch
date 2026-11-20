import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { getEnv } from '@pulsewatch/config';
import { prisma } from '@pulsewatch/database';
import { AuthTokens, UserDto } from '@pulsewatch/shared';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const env = getEnv();

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  private hashRefreshToken(token: string): string {
    return crypto
      .createHmac('sha256', env.REFRESH_TOKEN_PEPPER)
      .update(token)
      .digest('hex');
  }

  private async generateTokens(user: { id: string; email: string; name: string }): Promise<{
    tokens: AuthTokens;
    rawRefreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS);

    // Persist refresh token hash
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
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
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        user: userDto,
      },
      rawRefreshToken,
    };
  }

  async register(dto: RegisterDto): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const { tokens, rawRefreshToken } = await this.generateTokens(user);
    tokens.user.createdAt = user.createdAt.toISOString();
    tokens.user.updatedAt = user.updatedAt.toISOString();

    return { tokens, rawRefreshToken };
  }

  async login(dto: LoginDto): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { tokens, rawRefreshToken } = await this.generateTokens(user);
    tokens.user.createdAt = user.createdAt.toISOString();
    tokens.user.updatedAt = user.updatedAt.toISOString();

    return { tokens, rawRefreshToken };
  }

  async refreshTokens(rawRefreshToken: string): Promise<{ tokens: AuthTokens; rawRefreshToken: string }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: If token was already revoked, revoke ALL tokens for this user!
    if (existing.revokedAt) {
      console.warn(`[Security] Revoked refresh token reuse detected for user ${existing.userId}. Revoking all sessions.`);
      await prisma.refreshToken.updateMany({
        where: { userId: existing.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Token reuse detected. All sessions revoked for security.');
    }

    // Check expiration
    if (new Date() > existing.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Rotate: Revoke current token
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    // Issue new pair
    const { tokens, rawRefreshToken: newRawRefreshToken } = await this.generateTokens(existing.user);
    tokens.user.createdAt = existing.user.createdAt.toISOString();
    tokens.user.updatedAt = existing.user.updatedAt.toISOString();

    return { tokens, rawRefreshToken: newRawRefreshToken };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = this.hashRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    }
  }

  async getProfile(userId: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
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
