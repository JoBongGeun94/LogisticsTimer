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
    // Extract and verify JWT token
    const { accessToken } = extractTokenFromRequest(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = verifyToken(accessToken);
    
    if (!payload || payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from database
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}