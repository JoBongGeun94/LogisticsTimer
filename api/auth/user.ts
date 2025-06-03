import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Demo user for development
    const demoUserId = "demo-user-001";
    let user = await db.select().from(schema.users).where(eq(schema.users.id, demoUserId)).then(rows => rows[0]);
    
    // Create demo user if doesn't exist
    if (!user) {
      const [newUser] = await db
        .insert(schema.users)
        .values({
          id: demoUserId,
          email: "demo@company.com",
          firstName: "데모",
          lastName: "사용자",
          profileImageUrl: null,
          workerId: "W001",
          role: "worker",
        })
        .returning();
      user = newUser;
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}