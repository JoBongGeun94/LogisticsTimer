import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// Configure neon for serverless
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;
import { eq, desc } from 'drizzle-orm';
import { pgTable, varchar, timestamp, text, integer, real, jsonb, index } from 'drizzle-orm/pg-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { users, workSessions, measurements } });

// Storage class
class DatabaseStorage {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData) {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createWorkSession(userId, session) {
    const [workSession] = await db
      .insert(workSessions)
      .values({ ...session, userId })
      .returning();
    return workSession;
  }

  async getActiveWorkSession(userId) {
    const [session] = await db
      .select()
      .from(workSessions)
      .where(eq(workSessions.userId, userId))
      .where(eq(workSessions.isCompleted, 0))
      .orderBy(desc(workSessions.createdAt))
      .limit(1);
    return session;
  }

  async getWorkSessionById(id) {
    const [session] = await db.select().from(workSessions).where(eq(workSessions.id, id));
    return session;
  }

  async createMeasurement(sessionId, userId, measurement) {
    const [result] = await db
      .insert(measurements)
      .values({ ...measurement, sessionId, userId })
      .returning();
    return result;
  }

  async getMeasurementsBySession(sessionId) {
    return await db
      .select()
      .from(measurements)
      .where(eq(measurements.sessionId, sessionId))
      .orderBy(desc(measurements.createdAt));
  }

  async getUserWorkSessions(userId, limit = 10) {
    return await db
      .select()
      .from(workSessions)
      .where(eq(workSessions.userId, userId))
      .orderBy(desc(workSessions.createdAt))
      .limit(limit);
  }
}

const storage = new DatabaseStorage();

// Simple auth middleware (demo user)
const simpleAuth = async (req, res, next) => {
  // Create demo user if not exists
  try {
    await storage.upsertUser({
      id: "demo-user-001",
      email: "demo@company.com",
      firstName: "Demo",
      lastName: "User",
      profileImageUrl: null,
    });
    
    req.user = {
      claims: {
        sub: "demo-user-001",
        email: "demo@company.com"
      }
    };
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

// Express app setup
const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// API routes
app.get('/api/auth/user', simpleAuth, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.get("/api/work-sessions/active", simpleAuth, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const activeSession = await storage.getActiveWorkSession(userId);
    res.json(activeSession || null);
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({ message: "Failed to fetch active session" });
  }
});

app.post("/api/work-sessions", simpleAuth, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const session = await storage.createWorkSession(userId, req.body);
    res.json(session);
  } catch (error) {
    console.error("Error creating work session:", error);
    res.status(500).json({ message: "Failed to create work session" });
  }
});

app.get("/api/measurements/session/:sessionId", simpleAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const measurements = await storage.getMeasurementsBySession(sessionId);
    res.json(measurements);
  } catch (error) {
    console.error("Error fetching measurements:", error);
    res.status(500).json({ message: "Failed to fetch measurements" });
  }
});

app.post("/api/measurements/session/:sessionId", simpleAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const userId = req.user.claims.sub;
    const measurement = await storage.createMeasurement(sessionId, userId, req.body);
    res.json(measurement);
  } catch (error) {
    console.error("Error creating measurement:", error);
    res.status(500).json({ message: "Failed to create measurement" });
  }
});

app.get("/api/work-sessions/history", simpleAuth, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const sessions = await storage.getUserWorkSessions(userId, 20);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching work sessions:", error);
    res.status(500).json({ message: "Failed to fetch work sessions" });
  }
});

app.get("/api/work-sessions/history/operators-targets", simpleAuth, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const sessions = await storage.getUserWorkSessions(userId, 100);
    
    const operators = [...new Set(sessions.map(s => s.operatorName).filter(Boolean))];
    const targets = [...new Set(sessions.map(s => s.targetTimeMs).filter(Boolean))];
    
    res.json({ operators, targets });
  } catch (error) {
    console.error("Error fetching operators and targets:", error);
    res.status(500).json({ message: "Failed to fetch operators and targets" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working", env: process.env.NODE_ENV });
});

// Catch-all for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path, method: req.method });
});

// Serve index.html for all non-API routes
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

export default app;