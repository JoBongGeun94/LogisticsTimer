import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { verifyToken, extractTokenFromRequest } from '../../jwt-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract and verify JWT token
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = payload.userId;
    const { sessionId } = req.query;

    if (req.method === 'GET') {
      // Get measurements for session
      const sessionMeasurements = await db
        .select()
        .from(schema.measurements)
        .where(eq(schema.measurements.sessionId, Number(sessionId)))
        .orderBy(schema.measurements.createdAt);

      return res.json(sessionMeasurements);
    }

    if (req.method === 'POST') {
      // Create new measurement
      const { operatorName, partId, trialNumber, timeInMs, partName, taskType, partNumber, attemptNumber } = req.body;

      const [newMeasurement] = await db
        .insert(schema.measurements)
        .values({
          sessionId: Number(sessionId),
          userId,
          attemptNumber: attemptNumber || 1,
          timeInMs,
          taskType: taskType || "measurement",
          partNumber: partNumber || null,
          operatorName: operatorName || null,
          partId: partId || null,
          partName: partName || null,
          trialNumber: trialNumber || 1
        })
        .returning();

      return res.status(201).json(newMeasurement);
    }

    if (req.method === 'DELETE') {
      const { measurementId } = req.body;

      await db
        .delete(schema.measurements)
        .where(eq(schema.measurements.id, measurementId));

      return res.json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Measurement API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}