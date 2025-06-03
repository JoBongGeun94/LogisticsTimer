import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET!;
const JWT_EXPIRES_IN = '7d'; // 7 days
const REFRESH_EXPIRES_IN = '30d'; // 30 days

export interface JWTPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: { userId: string; email?: string }): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(payload: { userId: string; email?: string }): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded?.exp) return true;
    
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;
    
    // Return true if token expires within 1 day
    return timeUntilExpiry < (24 * 60 * 60 * 1000);
  } catch {
    return true;
  }
}

export function extractTokenFromRequest(req: any): { accessToken: string | null; refreshToken: string | null } {
  const authHeader = req.headers.authorization;
  
  // Extract cookies
  const cookies = req.headers.cookie?.split(';').reduce((acc: Record<string, string>, cookie: string) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {}) || {};
  
  const accessToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : cookies.auth_token || null;
    
  const refreshToken = cookies.refresh_token || null;
  
  return { accessToken, refreshToken };
}