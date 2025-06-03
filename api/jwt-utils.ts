import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET!;
const JWT_EXPIRES_IN = '7d'; // 7 days

export interface JWTPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: { userId: string; email?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function extractTokenFromRequest(req: any): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback to cookie
  const cookies = req.headers.cookie?.split(';').reduce((acc: Record<string, string>, cookie: string) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {}) || {};
  
  return cookies.auth_token || null;
}