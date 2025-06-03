import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from cookie
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>) || {};

    const userId = cookies.user_id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.query;

    const [completedSession] = await db
      .update(schema.workSessions)
      .set({ completedAt: new Date() })
      .where(eq(schema.workSessions.id, Number(sessionId)))
      .returning();

    if (!completedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(completedSession);
  } catch (error) {
    console.error("Error completing session:", error);
    res.status(500).json({ message: "Failed to complete session" });
  }
}