import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { verifyToken, extractTokenFromRequest } from '../jwt-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1) Extract token
    const { accessToken } = extractTokenFromRequest(req);
    if (!accessToken) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 2) Verify token with detailed error handling
    let payload;
    try {
      payload = verifyToken(accessToken);
    } catch (jwtError) {
      console.error('JWT verify error:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!payload || payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const userId = payload.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Missing user ID in token' });
    }

    // 3) Database query with detailed error handling
    let user;
    try {
      const result = await db.select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        profileImageUrl: schema.users.profileImageUrl,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
      
      user = result[0];
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (unexpectedError) {
    console.error('Unexpected auth/user error:', unexpectedError);
    return res.status(500).json({ error: 'Internal server error' });
  }
}