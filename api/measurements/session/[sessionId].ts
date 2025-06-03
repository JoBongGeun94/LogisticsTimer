import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { verifyToken, extractTokenFromRequest } from '../../jwt-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// Type for measurement payload
interface MeasurementPayload {
  operatorName?: string;
  partId?: string;
  trialNumber?: number;
  timeInMs: number;
  partName?: string;
  taskType?: string;
  partNumber?: string;
  attemptNumber?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const userId = payload.userId;
    const { sessionId } = req.query;

    if (req.method === 'GET') {
      // Fix TS2769: Pass measurements table directly to select()
      const sessionMeasurements = await db
        .select({
          id: schema.measurements.id,
          sessionId: schema.measurements.sessionId,
          userId: schema.measurements.userId,
          attemptNumber: schema.measurements.attemptNumber,
          timeInMs: schema.measurements.timeInMs,
          taskType: schema.measurements.taskType,
          partNumber: schema.measurements.partNumber,
          operatorName: schema.measurements.operatorName,
          partId: schema.measurements.partId,
          partName: schema.measurements.partName,
          trialNumber: schema.measurements.trialNumber,
          timestamp: schema.measurements.timestamp,
          createdAt: schema.measurements.createdAt
        })
        .from(schema.measurements)
        .where(eq(schema.measurements.sessionId, parseInt(sessionId as string)));

      return res.json(sessionMeasurements);
    }

    if (req.method === 'POST') {
      // Fix TS18004: Explicit variable declarations to ensure scope
      const requestBody = req.body as MeasurementPayload;
      
      const operatorName = requestBody.operatorName;
      const partId = requestBody.partId;
      const trialNumber = requestBody.trialNumber;
      const timeInMs = requestBody.timeInMs;
      const partName = requestBody.partName; // Explicit declaration for scope
      const taskType = requestBody.taskType;
      const partNumber = requestBody.partNumber;
      const attemptNumber = requestBody.attemptNumber;

      // Validate required fields
      if (timeInMs === undefined || timeInMs === null) {
        return res.status(400).json({ error: 'timeInMs is required' });
      }

      const [newMeasurement] = await db
        .insert(schema.measurements)
        .values({
          sessionId: parseInt(sessionId as string),
          userId: userId,
          attemptNumber: attemptNumber || 1,
          timeInMs: Number(timeInMs),
          taskType: taskType || "measurement",
          partNumber: partNumber || null,
          operatorName: operatorName || null,
          partId: partId || null,
          partName: partName || null, // Now properly in scope
          trialNumber: trialNumber || 1
        })
        .returning();

      return res.status(201).json(newMeasurement);
    }

    if (req.method === 'DELETE') {
      const { measurementId } = req.body;
      
      if (!measurementId) {
        return res.status(400).json({ error: 'Measurement ID is required' });
      }

      await db
        .delete(schema.measurements)
        .where(eq(schema.measurements.id, measurementId));

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Measurements API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}