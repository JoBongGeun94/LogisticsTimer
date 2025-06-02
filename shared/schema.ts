import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  real,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  workerId: varchar("worker_id").unique(),
  role: varchar("role").notNull().default("worker"), // worker, manager, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work sessions table
export const workSessions = pgTable("work_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  taskType: varchar("task_type").notNull(),
  partNumber: varchar("part_number"),
  operatorName: varchar("operator_name"),
  targetName: varchar("target_name"),
  operators: jsonb("operators"), // 측정자 목록 [{ name: "측정자1", id: "op1" }, ...]
  parts: jsonb("parts"), // 부품 목록 [{ id: "part1", name: "부품1" }, ...]
  trialsPerOperator: integer("trials_per_operator").default(3), // 측정자별 시행 횟수
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Measurements table
export const measurements = pgTable("measurements", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => workSessions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  timeInMs: integer("time_in_ms").notNull(),
  taskType: varchar("task_type").notNull(),
  partNumber: varchar("part_number"),
  operatorName: varchar("operator_name"), // 측정자 이름
  partId: varchar("part_id"), // 부품 ID (같은 부품을 여러 측정자가 측정)
  trialNumber: integer("trial_number").default(1), // 시행 번호 (각 측정자가 같은 부품을 여러 번 측정)
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gage R&R Analysis results table
export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => workSessions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  repeatability: real("repeatability"),
  reproducibility: real("reproducibility"),
  grr: real("grr"),
  partContribution: real("part_contribution"),
  operatorContribution: real("operator_contribution"),
  isAcceptable: boolean("is_acceptable"),
  analysisData: jsonb("analysis_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  workSessions: many(workSessions),
  measurements: many(measurements),
  analysisResults: many(analysisResults),
}));

export const workSessionsRelations = relations(workSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [workSessions.userId],
    references: [users.id],
  }),
  measurements: many(measurements),
  analysisResults: many(analysisResults),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  session: one(workSessions, {
    fields: [measurements.sessionId],
    references: [workSessions.id],
  }),
  user: one(users, {
    fields: [measurements.userId],
    references: [users.id],
  }),
}));

export const analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  session: one(workSessions, {
    fields: [analysisResults.sessionId],
    references: [workSessions.id],
  }),
  user: one(users, {
    fields: [analysisResults.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  workerId: true,
  role: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  workerId: true,
  role: true,
});

export const insertWorkSessionSchema = createInsertSchema(workSessions).pick({
  taskType: true,
  partNumber: true,
  operatorName: true,
  targetName: true,
});

export const insertMeasurementSchema = createInsertSchema(measurements).pick({
  attemptNumber: true,
  timeInMs: true,
  taskType: true,
  partNumber: true,
});

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).pick({
  repeatability: true,
  reproducibility: true,
  grr: true,
  partContribution: true,
  operatorContribution: true,
  isAcceptable: true,
  analysisData: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWorkSession = z.infer<typeof insertWorkSessionSchema>;
export type WorkSession = typeof workSessions.$inferSelect;
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;
export type Measurement = typeof measurements.$inferSelect;
export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;
