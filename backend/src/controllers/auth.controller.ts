import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import config from '../config';

const REFRESH_COOKIE_NAME = 'pulsewatch_refresh_token';

export class AuthController {
  constructor(private authService: AuthService = new AuthService()) {}

  private setRefreshCookie(res: Response, token: string): void {
    const isProduction = config.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: config.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });
  }

  private clearRefreshCookie(res: Response): void {
    const isProduction = config.NODE_ENV === 'production';
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
    });
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tokens, rawRefreshToken } = await this.authService.register(req.body);
      this.setRefreshCookie(res, rawRefreshToken);
      sendSuccess(res, 'Account registered successfully', tokens, 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tokens, rawRefreshToken } = await this.authService.login(req.body);
      this.setRefreshCookie(res, rawRefreshToken);
      sendSuccess(res, 'Login successful', tokens, 200);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      const { tokens, rawRefreshToken: newRefreshToken } =
        await this.authService.refreshTokens(rawRefreshToken);

      this.setRefreshCookie(res, newRefreshToken);
      sendSuccess(res, 'Token refreshed successfully', tokens, 200);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      await this.authService.logout(rawRefreshToken);
      this.clearRefreshCookie(res);
      sendSuccess(res, 'Logged out successfully', null, 200);
    } catch (error) {
      next(error);
    }
  };

  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.getProfile(req.user!.id);
      sendSuccess(res, 'Profile retrieved successfully', user, 200);
    } catch (error) {
      next(error);
    }
  };
}
