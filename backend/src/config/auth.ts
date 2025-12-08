import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config';

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = '1h';

export interface AuthTokenPayload {
  sub: string;
  practiceId: string;
  role: UserRole;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

