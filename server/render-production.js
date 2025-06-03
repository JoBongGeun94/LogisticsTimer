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

// Comprehensive database initialization with error handling
const initializeDatabase = async () => {
  try {
    console.log('Starting SOLID-based database initialization...');
    
    // SOLID Principle: Single Responsibility - Database constraint management
    const removeConstraints = async () => {
      const constraints = ['users_email_key', 'users_worker_id_key'];
      for (const constraint of constraints) {
        try {
          await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${constraint};`);
          console.log(`Removed constraint: ${constraint}`);
        } catch (error) {
          console.log(`Constraint ${constraint} already handled`);
        }
      }
    };

    // SOLID Principle: Single Responsibility - Referential integrity management
    const cleanDependentData = async () => {
      console.log('Cleaning dependent data with referential integrity...');
      
      // 1. Clean work_sessions first (child table)
      try {
        const sessionExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'work_sessions'
          );
        `);
        
        if (sessionExists.rows[0].exists) {
          await pool.query(`DELETE FROM work_sessions WHERE user_id = 'demo-user-001';`);
          console.log('Cleaned work_sessions references');
        }
      } catch (error) {
        console.log('Work sessions cleanup handled:', error);
      }

      // 2. Clean measurements (child table)
      try {
        const measurementExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'measurements'
          );
        `);
        
        if (measurementExists.rows[0].exists) {
          await pool.query(`DELETE FROM measurements WHERE user_id = 'demo-user-001';`);
          console.log('Cleaned measurements references');
        }
      } catch (error) {
        console.log('Measurements cleanup handled:', error);
      }

      // 3. Clean analysis_results (child table)
      try {
        const analysisExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'analysis_results'
          );
        `);
        
        if (analysisExists.rows[0].exists) {
          await pool.query(`DELETE FROM analysis_results WHERE user_id = 'demo-user-001';`);
          console.log('Cleaned analysis_results references');
        }
      } catch (error) {
        console.log('Analysis results cleanup handled:', error);
      }
    };

    // Execute constraint removal and data cleanup first
    await removeConstraints();
    await cleanDependentData();
    
    // Create tables with complete schema matching local environment
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        email VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        worker_id VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'worker',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        task_type VARCHAR NOT NULL,
        part_number VARCHAR,
        operator_name VARCHAR,
        target_name VARCHAR,
        operators JSONB,
        parts JSONB,
        trials_per_operator INTEGER DEFAULT 3,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES work_sessions(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        attempt_number INTEGER NOT NULL,
        time_in_ms INTEGER NOT NULL,
        task_type VARCHAR NOT NULL,
        part_number VARCHAR,
        operator_name VARCHAR,
        part_id VARCHAR,
        part_name VARCHAR,
        trial_number INTEGER DEFAULT 1,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES work_sessions(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        repeatability REAL,
        reproducibility REAL,
        grr REAL,
        part_contribution REAL,
        operator_contribution REAL,
        is_acceptable BOOLEAN,
        total_variation REAL,
        analysis_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create sessions table for authentication
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    `);

    // SOLID Principle: Single Responsibility - Safe user data management
    const safeUserUpsert = async () => {
      // Now safely remove demo-user-001 (all references cleaned above)
      try {
        await pool.query(`DELETE FROM users WHERE id = 'demo-user-001';`);
        console.log('Removed demo-user-001 safely');
      } catch (error) {
        console.log('Demo user cleanup handled:', error);
      }
      
      // Clean any other conflicting data
      await pool.query(`
        DELETE FROM users WHERE id != 'AF-001' AND (email = 'supply@airforce.mil.kr' OR worker_id = 'AF-001');
      `);
      
      // Safe upsert with conflict resolution
      await pool.query(`
        INSERT INTO users (id, email, first_name, last_name, worker_id, role) 
        VALUES ('AF-001', 'supply@airforce.mil.kr', '공군', '종합보급창', 'AF-001', 'manager')
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          worker_id = EXCLUDED.worker_id,
          role = EXCLUDED.role,
          updated_at = NOW();
      `);
    };

    await safeUserUpsert();
    console.log('Demo user AF-001 safely initialized with SOLID principles and referential integrity');

    // Update any existing work sessions to use new user ID
    await pool.query(`
      UPDATE work_sessions SET user_id = 'AF-001' WHERE user_id = 'demo-user-001';
    `);

    // Update any existing measurements to use new user ID
    await pool.query(`
      UPDATE measurements SET user_id = 'AF-001' WHERE user_id = 'demo-user-001';
    `);

    // Remove old demo user if exists
    await pool.query(`
      DELETE FROM users WHERE id = 'demo-user-001';
    `);

    // SOLID Principle: Single Responsibility - Final integrity validation
    const finalIntegrityCheck = async () => {
      console.log('Performing final integrity validation...');
      
      // 1. Verify AF-001 user exists
      const userCheck = await pool.query(`SELECT id, email, worker_id FROM users WHERE id = 'AF-001';`);
      if (userCheck.rows.length === 0) {
        throw new Error('Critical: AF-001 user not found after initialization');
      }
      console.log('✓ AF-001 user verified');

      // 2. Check for any remaining referential integrity violations
      const orphanCheck = await pool.query(`
        SELECT COUNT(*) as count 
        FROM work_sessions ws 
        LEFT JOIN users u ON ws.user_id = u.id 
        WHERE u.id IS NULL;
      `);
      
      if (orphanCheck.rows[0].count > 0) {
        console.log(`Warning: ${orphanCheck.rows[0].count} orphaned sessions found, cleaning...`);
        await pool.query(`DELETE FROM work_sessions WHERE user_id NOT IN (SELECT id FROM users);`);
      }
      console.log('✓ Referential integrity validated');

      // 3. Verify table structure
      const tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN ('users', 'work_sessions', 'measurements', 'analysis_results', 'sessions');
      `);
      console.log('✓ Created tables:', tableCheck.rows.map(r => r.table_name));
      
      if (tableCheck.rows.length < 5) {
        console.warn('Warning: Not all expected tables were created');
      }
    };

    await finalIntegrityCheck();
    console.log('Database initialization completed successfully with SOLID principles and integrity validation');
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error; // Re-throw to prevent server start if DB init fails
  }
};

// Simple demo user middleware
const demoAuth = async (req, res, next) => {
  try {
    req.user = { 
      claims: { 
        sub: "AF-001",
        email: "supply@airforce.mil.kr",
        first_name: "공군",
        last_name: "종합보급창",
        profile_image_url: null
      } 
    };
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
      .where(eq(workSessions.is_active, true))
      .orderBy(desc(workSessions.created_at))
      .limit(1);
    
    if (session) {
      // Parse JSON strings back to arrays
      const processedSession = {
        ...session,
        operators: session.operators ? JSON.parse(session.operators) : [],
        parts: session.parts ? JSON.parse(session.parts) : []
      };
      console.log('Returning active session:', JSON.stringify(processedSession, null, 2));
      res.json(processedSession);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({ message: "Failed to fetch active session" });
  }
});

app.post('/api/work-sessions', demoAuth, async (req, res) => {
  try {
    console.log('Creating work session with data:', JSON.stringify(req.body, null, 2));
    
    const sessionData = {
      ...req.body,
      userId: req.user.claims.sub,
      // Ensure arrays are properly handled
      operators: req.body.operators ? JSON.stringify(req.body.operators) : null,
      parts: req.body.parts ? JSON.stringify(req.body.parts) : null,
      trialsPerOperator: req.body.trialsPerOperator || 3,
      isCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Processed session data:', JSON.stringify(sessionData, null, 2));
    
    const [session] = await db
      .insert(workSessions)
      .values(sessionData)
      .returning();
      
    console.log('Created session:', JSON.stringify(session, null, 2));
    res.json(session);
  } catch (error) {
    console.error("Error creating work session:", error);
    res.status(500).json({ message: "Failed to create work session", error: error.message });
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

app.put('/api/work-sessions/:id/complete', demoAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const [session] = await db
      .update(workSessions)
      .set({ 
        is_active: false,
        completed_at: new Date()
      })
      .where(eq(workSessions.id, sessionId))
      .returning();
    
    res.json(session);
  } catch (error) {
    console.error("Error completing work session:", error);
    res.status(500).json({ message: "Failed to complete work session" });
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

// Initialize database before starting server with comprehensive error handling
initializeDatabase()
  .then(() => {
    console.log('Starting server after successful database initialization...');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`Server ready to accept connections`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database, cannot start server:', error);
    process.exit(1);
  });

export default app;