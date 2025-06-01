import {
  users,
  workSessions,
  measurements,
  analysisResults,
  type User,
  type UpsertUser,
  type InsertWorkSession,
  type WorkSession,
  type InsertMeasurement,
  type Measurement,
  type InsertAnalysisResult,
  type AnalysisResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  upsertUserWithId(id: string, userData: UpsertUser): Promise<User>;
  
  // Work session operations
  createWorkSession(userId: string, session: InsertWorkSession): Promise<WorkSession>;
  getActiveWorkSession(userId: string): Promise<WorkSession | undefined>;
  getWorkSessionById(id: number): Promise<WorkSession | undefined>;
  updateWorkSession(id: number, updates: Partial<WorkSession>): Promise<WorkSession>;
  completeWorkSession(id: number): Promise<WorkSession>;
  
  // Measurement operations
  createMeasurement(sessionId: number, userId: string, measurement: InsertMeasurement): Promise<Measurement>;
  getMeasurementsBySession(sessionId: number): Promise<Measurement[]>;
  deleteMeasurement(id: number): Promise<void>;
  
  // Analysis operations
  createAnalysisResult(sessionId: number, userId: string, analysis: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResult(sessionId: number): Promise<AnalysisResult | undefined>;
  
  // Query operations
  getUserWorkSessions(userId: string, limit?: number): Promise<WorkSession[]>;
  getUserMeasurements(userId: string, limit?: number): Promise<Measurement[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // This method requires an ID, so it's not suitable for the current auth flow
    // Use upsertUserWithId instead
    throw new Error("Use upsertUserWithId method for user creation with ID");
  }

  async upsertUserWithId(id: string, userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ 
        id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        workerId: userData.workerId,
        role: userData.role,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          workerId: userData.workerId,
          role: userData.role,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Work session operations
  async createWorkSession(userId: string, session: InsertWorkSession): Promise<WorkSession> {
    const [workSession] = await db
      .insert(workSessions)
      .values({
        ...session,
        userId,
      })
      .returning();
    return workSession;
  }

  async getActiveWorkSession(userId: string): Promise<WorkSession | undefined> {
    const [session] = await db
      .select()
      .from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.isActive, true)))
      .orderBy(desc(workSessions.createdAt))
      .limit(1);
    return session;
  }

  async getWorkSessionById(id: number): Promise<WorkSession | undefined> {
    const [session] = await db
      .select()
      .from(workSessions)
      .where(eq(workSessions.id, id))
      .limit(1);
    return session;
  }

  async updateWorkSession(id: number, updates: Partial<WorkSession>): Promise<WorkSession> {
    const [session] = await db
      .update(workSessions)
      .set(updates)
      .where(eq(workSessions.id, id))
      .returning();
    return session;
  }

  async completeWorkSession(id: number): Promise<WorkSession> {
    const [session] = await db
      .update(workSessions)
      .set({
        isActive: false,
        completedAt: new Date(),
      })
      .where(eq(workSessions.id, id))
      .returning();
    return session;
  }

  // Measurement operations
  async createMeasurement(sessionId: number, userId: string, measurement: InsertMeasurement): Promise<Measurement> {
    const [result] = await db
      .insert(measurements)
      .values({
        ...measurement,
        sessionId,
        userId,
      })
      .returning();
    return result;
  }

  async getMeasurementsBySession(sessionId: number): Promise<Measurement[]> {
    return await db
      .select()
      .from(measurements)
      .where(eq(measurements.sessionId, sessionId))
      .orderBy(measurements.attemptNumber);
  }

  async deleteMeasurement(id: number): Promise<void> {
    await db.delete(measurements).where(eq(measurements.id, id));
  }

  // Analysis operations
  async createAnalysisResult(sessionId: number, userId: string, analysis: InsertAnalysisResult): Promise<AnalysisResult> {
    const [result] = await db
      .insert(analysisResults)
      .values({
        ...analysis,
        sessionId,
        userId,
      })
      .returning();
    return result;
  }

  async getAnalysisResult(sessionId: number): Promise<AnalysisResult | undefined> {
    const [result] = await db
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.sessionId, sessionId))
      .orderBy(desc(analysisResults.createdAt))
      .limit(1);
    return result;
  }

  // Query operations
  async getUserWorkSessions(userId: string, limit = 10): Promise<WorkSession[]> {
    return await db
      .select()
      .from(workSessions)
      .where(eq(workSessions.userId, userId))
      .orderBy(desc(workSessions.createdAt))
      .limit(limit);
  }

  async getUserMeasurements(userId: string, limit = 50): Promise<Measurement[]> {
    return await db
      .select()
      .from(measurements)
      .where(eq(measurements.userId, userId))
      .orderBy(desc(measurements.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
