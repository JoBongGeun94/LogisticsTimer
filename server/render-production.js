import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { eq, desc } from 'drizzle-orm';
import { pgTable, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure neon for serverless
neonConfig.webSocketConstructor = ws;

// Database schema
const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const workSessions = pgTable("work_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  operatorName: varchar("operator_name"),
  partId: varchar("part_id"),
  partName: varchar("part_name"),
  targetTimeMs: integer("target_time_ms"),
  isCompleted: integer("is_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

const measurements = pgTable("measurements", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  sessionId: integer("session_id").notNull().references(() => workSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  operatorName: varchar("operator_name"),
  partId: varchar("part_id"),
  trialNumber: integer("trial_number"),
  timeInMs: integer("time_in_ms").notNull(),
  partName: varchar("part_name"),
  taskType: varchar("task_type"),
  partNumber: varchar("part_number"),
  attemptNumber: integer("attempt_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { users, workSessions, measurements } });

// Express app setup
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

// Initialize database tables and demo user
const initializeDatabase = async () => {
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        worker_id VARCHAR UNIQUE,
        role VARCHAR NOT NULL DEFAULT 'worker',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        operator_name VARCHAR,
        part_id VARCHAR,
        part_name VARCHAR,
        target_time_ms INTEGER,
        is_completed INTEGER DEFAULT 0,
        task_type VARCHAR,
        part_number VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES work_sessions(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        operator_name VARCHAR,
        part_id VARCHAR,
        trial_number INTEGER,
        time_in_ms INTEGER NOT NULL,
        part_name VARCHAR,
        task_type VARCHAR,
        part_number VARCHAR,
        attempt_number INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert demo user
    await pool.query(`
      INSERT INTO users (id, email, first_name, last_name, worker_id, role) 
      VALUES ('demo-user-001', 'supply@airforce.mil.kr', '공군', '종합보급창', 'AF-001', 'manager')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Simple demo user middleware
const demoAuth = async (req, res, next) => {
  try {
    req.user = { claims: { sub: "demo-user-001" } };
    next();
  } catch (error) {
    console.error("Demo auth error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/auth/user', demoAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.claims.sub));
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.get('/api/work-sessions/active', demoAuth, async (req, res) => {
  try {
    const [session] = await db
      .select()
      .from(workSessions)
      .where(eq(workSessions.userId, req.user.claims.sub))
      .where(eq(workSessions.isCompleted, 0))
      .orderBy(desc(workSessions.createdAt))
      .limit(1);
    
    res.json(session || null);
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({ message: "Failed to fetch active session" });
  }
});

app.post('/api/work-sessions', demoAuth, async (req, res) => {
  try {
    const [session] = await db
      .insert(workSessions)
      .values({ ...req.body, userId: req.user.claims.sub })
      .returning();
    res.json(session);
  } catch (error) {
    console.error("Error creating work session:", error);
    res.status(500).json({ message: "Failed to create work session" });
  }
});

app.get('/api/measurements/session/:sessionId', demoAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const results = await db
      .select()
      .from(measurements)
      .where(eq(measurements.sessionId, sessionId))
      .orderBy(desc(measurements.createdAt));
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching measurements:", error);
    res.status(500).json({ message: "Failed to fetch measurements" });
  }
});

app.post('/api/measurements/session/:sessionId', demoAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [measurement] = await db
      .insert(measurements)
      .values({ 
        ...req.body, 
        sessionId, 
        userId: req.user.claims.sub 
      })
      .returning();
    
    res.json(measurement);
  } catch (error) {
    console.error("Error creating measurement:", error);
    res.status(500).json({ message: "Failed to create measurement" });
  }
});

app.get('/api/work-sessions/history', demoAuth, async (req, res) => {
  try {
    const sessions = await db
      .select()
      .from(workSessions)
      .where(eq(workSessions.userId, req.user.claims.sub))
      .orderBy(desc(workSessions.createdAt))
      .limit(20);
    
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching work sessions:", error);
    res.status(500).json({ message: "Failed to fetch work sessions" });
  }
});

app.get('/api/work-sessions/history/operators-targets', demoAuth, async (req, res) => {
  try {
    const sessions = await db
      .select()
      .from(workSessions)
      .where(eq(workSessions.userId, req.user.claims.sub))
      .orderBy(desc(workSessions.createdAt))
      .limit(100);
    
    const operators = [...new Set(sessions.map(s => s.operatorName).filter(Boolean))];
    const targets = [...new Set(sessions.map(s => s.targetTimeMs).filter(Boolean))];
    
    res.json({ operators, targets });
  } catch (error) {
    console.error("Error fetching operators and targets:", error);
    res.status(500).json({ message: "Failed to fetch operators and targets" });
  }
});

// Serve static files
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Initialize database before starting server
initializeDatabase().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
});

export default app;