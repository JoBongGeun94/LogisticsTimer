import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { measurements } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { sessionId } = req.query;
    const userId = "demo-user-001";

    if (req.method === 'GET') {
      // Get measurements for session
      const sessionMeasurements = await db
        .select()
        .from(measurements)
        .where(eq(measurements.sessionId, Number(sessionId)))
        .orderBy(measurements.createdAt);

      return res.json(sessionMeasurements);
    }

    if (req.method === 'POST') {
      // Create new measurement
      const { operatorName, partId, trialNumber, timeInMs, targetName } = req.body;

      const [newMeasurement] = await db
        .insert(measurements)
        .values({
          sessionId: Number(sessionId),
          userId,
          operatorName,
          partId,
          trialNumber,
          timeInMs,
          partName
        })
        .returning();

      return res.status(201).json(newMeasurement);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Error handling measurements:", error);
    res.status(500).json({ message: "Failed to handle measurements" });
  }
}
