import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = "demo-user-001";
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const sessions = await db
      .select()
      .from(schema.workSessions)
      .where(eq(schema.workSessions.userId, userId))
      .orderBy(desc(schema.workSessions.createdAt))
      .limit(limit);

    return res.json(sessions);
  } catch (error) {
    console.error("Error fetching work sessions:", error);
    res.status(500).json({ message: "Failed to fetch work sessions" });
  }
}