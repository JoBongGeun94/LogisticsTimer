import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import passport from 'passport';
import * as client from 'openid-client';
import { Strategy } from 'openid-client/passport';
import memoize from 'memoizee';
import { eq, desc } from 'drizzle-orm';
import { pgTable, varchar, timestamp, text, integer, real, jsonb, index } from 'drizzle-orm/pg-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database schema
const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

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
const db = drizzle({ client: pool, schema: { sessions, users, workSessions, measurements } });

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

// Auth setup
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

const isAuthenticated = async (req, res, next) => {
  const user = req.user;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
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

// Setup auth
app.set("trust proxy", 1);
app.use(getSession());
app.use(passport.initialize());
app.use(passport.session());

const config = await getOidcConfig();

const verify = async (tokens, verified) => {
  const user = {};
  updateUserSession(user, tokens);
  await upsertUser(tokens.claims());
  verified(null, user);
};

if (process.env.REPLIT_DOMAINS) {
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }
}

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

// Auth routes
app.get("/api/login", (req, res, next) => {
  passport.authenticate(`replitauth:${req.hostname}`, {
    prompt: "login consent",
    scope: ["openid", "email", "profile", "offline_access"],
  })(req, res, next);
});

app.get("/api/callback", (req, res, next) => {
  passport.authenticate(`replitauth:${req.hostname}`, {
    successReturnToOrRedirect: "/",
    failureRedirect: "/api/login",
  })(req, res, next);
});

app.get("/api/logout", (req, res) => {
  req.logout(() => {
    res.redirect(
      client.buildEndSessionUrl(config, {
        client_id: process.env.REPL_ID,
        post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
      }).href
    );
  });
});

// API routes
app.get('/api/auth/user', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.get("/api/work-sessions/active", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const activeSession = await storage.getActiveWorkSession(userId);
    res.json(activeSession || null);
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({ message: "Failed to fetch active session" });
  }
});

app.post("/api/work-sessions", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const session = await storage.createWorkSession(userId, req.body);
    res.json(session);
  } catch (error) {
    console.error("Error creating work session:", error);
    res.status(500).json({ message: "Failed to create work session" });
  }
});

app.get("/api/measurements/session/:sessionId", isAuthenticated, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const measurements = await storage.getMeasurementsBySession(sessionId);
    res.json(measurements);
  } catch (error) {
    console.error("Error fetching measurements:", error);
    res.status(500).json({ message: "Failed to fetch measurements" });
  }
});

app.post("/api/measurements/session/:sessionId", isAuthenticated, async (req, res) => {
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

app.get("/api/work-sessions/history", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const sessions = await storage.getUserWorkSessions(userId, 20);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching work sessions:", error);
    res.status(500).json({ message: "Failed to fetch work sessions" });
  }
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
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