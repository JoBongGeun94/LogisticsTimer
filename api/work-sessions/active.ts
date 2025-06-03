import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = "demo-user-001"; // Demo user

    if (req.method === 'GET') {
      // Get active work session
      const [activeSession] = await db
        .select()
        .from(schema.workSessions)
        .where(and(
          eq(schema.workSessions.userId, userId),
          isNull(schema.workSessions.completedAt)
        ))
        .orderBy(schema.workSessions.createdAt)
        .limit(1);

      return res.json(activeSession || null);
    }

    if (req.method === 'POST') {
      // Create new work session
      const { taskType, partNumber, operatorName, targetName, operators, parts, trialsPerOperator } = req.body;

      const [newSession] = await db
        .insert(schema.workSessions)
        .values({
          userId,
          taskType,
          partNumber,
          operatorName,
          targetName,
          operators: operators ? JSON.stringify(operators) : null,
          parts: parts ? JSON.stringify(parts) : null,
          trialsPerOperator,
          completedAt: null
        })
        .returning();

      return res.status(201).json(newSession);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Error handling work session:", error);
    res.status(500).json({ message: "Failed to handle work session" });
  }
}