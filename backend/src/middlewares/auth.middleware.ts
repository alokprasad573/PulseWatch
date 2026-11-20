import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { UserRepository } from '../repositories/user.repository';

const userRepo = new UserRepository();

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.pulsewatch_access_token) {
      token = req.cookies.pulsewatch_access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const payload = verifyAccessToken(token);
    const user = await userRepo.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedError('User account no longer exists');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    next(error);
  }
}
