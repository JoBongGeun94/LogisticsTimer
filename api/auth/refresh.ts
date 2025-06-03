import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { verifyToken, signAccessToken, signRefreshToken, extractTokenFromRequest } from '../jwt-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract refresh token
    const { refreshToken } = extractTokenFromRequest(req);
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const payload = verifyToken(refreshToken);
    
    if (!payload || payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify user exists
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.userId));
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = signAccessToken({ userId: user.id, email: user.email || undefined });
    const newRefreshToken = signRefreshToken({ userId: user.id, email: user.email || undefined });
    
    // Set new secure cookies
    res.setHeader('Set-Cookie', [
      `auth_token=${newAccessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
      `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`
    ]);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}