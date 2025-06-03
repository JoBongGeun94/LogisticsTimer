import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWorkSessionSchema, insertMeasurementSchema, insertAnalysisResultSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const DEMO_USER_ID = "demo-user-001";

  // Health check endpoints
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    });
  });

  app.get('/ready', async (req, res) => {
    try {
      await storage.getUserWorkSessions(DEMO_USER_ID, 1);
      res.status(200).json({
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Work session routes - no authentication required
  app.post('/api/work-sessions', async (req, res) => {
    try {
      const sessionData = insertWorkSessionSchema.parse(req.body);
      const session = await storage.createWorkSession(DEMO_USER_ID, sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating work session:", error);
      res.status(500).json({ message: "Failed to create work session" });
    }
  });

  app.get('/api/work-sessions/active', async (req, res) => {
    try {
      const session = await storage.getActiveWorkSession(DEMO_USER_ID);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active work session:", error);
      res.status(500).json({ message: "Failed to fetch active work session" });
    }
  });

  app.put('/api/work-sessions/:id/complete', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.completeWorkSession(sessionId);
      res.json(session);
    } catch (error) {
      console.error("Error completing work session:", error);
      res.status(500).json({ message: "Failed to complete work session" });
    }
  });

  app.put('/api/work-sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      const session = await storage.updateWorkSession(sessionId, updates);
      res.json(session);
    } catch (error) {
      console.error("Error updating work session:", error);
      res.status(500).json({ message: "Failed to update work session" });
    }
  });

  app.get('/api/work-sessions', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const sessions = await storage.getUserWorkSessions(DEMO_USER_ID, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
      res.status(500).json({ message: "Failed to fetch work sessions" });
    }
  });

  app.get('/api/work-sessions/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const sessions = await storage.getUserWorkSessions(DEMO_USER_ID, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching session history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.get('/api/work-sessions/history/operators-targets', async (req, res) => {
    try {
      const sessions = await storage.getUserWorkSessions(DEMO_USER_ID, 100);
      
      const operators = Array.from(new Set(sessions.map(s => s.operatorName).filter(Boolean)));
      const targets = Array.from(new Set(sessions.map(s => s.targetName).filter(Boolean)));
      
      res.json({ operators, targets });
    } catch (error) {
      console.error("Error fetching operators and targets:", error);
      res.status(500).json({ message: "Failed to fetch operators and targets" });
    }
  });

  // Measurement routes
  app.post('/api/measurements', async (req, res) => {
    try {
      const validatedData = insertMeasurementSchema.parse(req.body);
      const measurement = await storage.createMeasurement(validatedData.sessionId, DEMO_USER_ID, validatedData);
      res.json(measurement);
    } catch (error) {
      console.error("Error creating measurement:", error);
      res.status(500).json({ message: "Failed to create measurement" });
    }
  });

  app.get('/api/measurements/session/:sessionId', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const measurements = await storage.getMeasurementsBySession(sessionId);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching measurements:", error);
      res.status(500).json({ message: "Failed to fetch measurements" });
    }
  });

  app.delete('/api/measurements/:id', async (req, res) => {
    try {
      const measurementId = parseInt(req.params.id);
      await storage.deleteMeasurement(measurementId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting measurement:", error);
      res.status(500).json({ message: "Failed to delete measurement" });
    }
  });

  app.get('/api/measurements/user', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const measurements = await storage.getUserMeasurements(DEMO_USER_ID, limit);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching user measurements:", error);
      res.status(500).json({ message: "Failed to fetch user measurements" });
    }
  });

  // Analysis routes
  app.post('/api/analysis', async (req, res) => {
    try {
      const { sessionId, ...analysisData } = req.body;
      const validatedData = insertAnalysisResultSchema.parse(analysisData);
      const analysis = await storage.createAnalysisResult(sessionId, DEMO_USER_ID, validatedData);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating analysis result:", error);
      res.status(500).json({ message: "Failed to create analysis result" });
    }
  });

  app.get('/api/analysis/session/:sessionId', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const analysis = await storage.getAnalysisResult(sessionId);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis result:", error);
      res.status(500).json({ message: "Failed to fetch analysis result" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}