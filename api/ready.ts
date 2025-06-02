import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({
        status: 'not ready',
        database: 'disconnected',
        error: 'DATABASE_URL not configured',
        timestamp: new Date().toISOString()
      });
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('SELECT 1');
    
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}