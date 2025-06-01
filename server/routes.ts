import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertWorkSessionSchema, insertMeasurementSchema, insertAnalysisResultSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Work session routes
  app.post('/api/work-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertWorkSessionSchema.parse(req.body);
      
      const session = await storage.createWorkSession(userId, sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating work session:", error);
      res.status(500).json({ message: "Failed to create work session" });
    }
  });

  app.get('/api/work-sessions/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getActiveWorkSession(userId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active work session:", error);
      res.status(500).json({ message: "Failed to fetch active work session" });
    }
  });

  app.put('/api/work-sessions/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.completeWorkSession(sessionId);
      res.json(session);
    } catch (error) {
      console.error("Error completing work session:", error);
      res.status(500).json({ message: "Failed to complete work session" });
    }
  });

  app.get('/api/work-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const sessions = await storage.getUserWorkSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      res.status(500).json({ message: "Failed to fetch work sessions" });
    }
  });

  // Measurement routes
  app.post('/api/measurements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, ...measurementData } = req.body;
      const validatedData = insertMeasurementSchema.parse(measurementData);
      
      const measurement = await storage.createMeasurement(sessionId, userId, validatedData);
      res.json(measurement);
    } catch (error) {
      console.error("Error creating measurement:", error);
      res.status(500).json({ message: "Failed to create measurement" });
    }
  });

  app.get('/api/measurements/session/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const measurements = await storage.getMeasurementsBySession(sessionId);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching measurements:", error);
      res.status(500).json({ message: "Failed to fetch measurements" });
    }
  });

  app.delete('/api/measurements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const measurementId = parseInt(req.params.id);
      await storage.deleteMeasurement(measurementId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting measurement:", error);
      res.status(500).json({ message: "Failed to delete measurement" });
    }
  });

  app.get('/api/measurements/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const measurements = await storage.getUserMeasurements(userId, limit);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching user measurements:", error);
      res.status(500).json({ message: "Failed to fetch user measurements" });
    }
  });

  // Analysis routes
  app.post('/api/analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, ...analysisData } = req.body;
      const validatedData = insertAnalysisResultSchema.parse(analysisData);
      
      const analysis = await storage.createAnalysisResult(sessionId, userId, validatedData);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating analysis result:", error);
      res.status(500).json({ message: "Failed to create analysis result" });
    }
  });

  app.get('/api/analysis/session/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const analysis = await storage.getAnalysisResult(sessionId);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis result:", error);
      res.status(500).json({ message: "Failed to fetch analysis result" });
    }
  });

  // Excel export route
  app.post('/api/export/excel', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      const measurements = await storage.getMeasurementsBySession(sessionId);
      const analysis = await storage.getAnalysisResult(sessionId);
      
      res.json({
        measurements,
        analysis,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
