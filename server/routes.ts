import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWorkSessionSchema, insertMeasurementSchema, insertAnalysisResultSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { ErrorHandlingService } from "./ErrorHandlingService";

// Helper functions for analytics
function calculateDailyActivity(sessions: any[]) {
  const dailyCount: { [key: string]: number } = {};
  
  sessions.forEach(session => {
    if (session.createdAt) {
      const date = new Date(session.createdAt).toISOString().split('T')[0];
      dailyCount[date] = (dailyCount[date] || 0) + 1;
    }
  });
  
  return Object.entries(dailyCount).map(([date, count]) => ({ date, count }));
}

function calculateAverageSessionDuration(sessions: any[]) {
  let totalDuration = 0;
  let validSessions = 0;
  
  for (const session of sessions) {
    if (session.startedAt && session.completedAt) {
      const duration = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime();
      totalDuration += duration;
      validSessions++;
    }
  }
  
  return validSessions > 0 ? totalDuration / validSessions : 0;
}

// Simple demo authentication middleware
const demoAuth = (req: any, res: any, next: any) => {
  // Create a demo user session
  req.user = {
    claims: {
      sub: "demo-user-001",
      email: "demo@company.com",
      first_name: "데모",
      last_name: "사용자",
      profile_image_url: null
    }
  };
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoints for deployment monitoring
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
      await storage.getUserWorkSessions('health-check', 1);
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

  // Error reporting endpoint
  app.post('/api/errors', async (req, res) => {
    try {
      console.error('Client Error Report:', {
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...req.body
      });
      res.status(200).json({ received: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to log error' });
    }
  });

  // Demo auth routes
  app.get('/api/login', (req, res) => {
    res.redirect('/');
  });

  app.get('/api/logout', (req, res) => {
    res.redirect('/');
  });

  // Auth routes
  app.get('/api/auth/user', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Create demo user if doesn't exist
      if (!user) {
        user = await storage.upsertUserWithId(userId, {
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
          workerId: "W001",
          role: "worker",
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Work session routes with comprehensive validation
  app.post('/api/work-sessions', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertWorkSessionSchema.parse(req.body);
      
      // Close any existing active sessions first
      const existingSession = await storage.getActiveWorkSession(userId);
      if (existingSession) {
        await storage.updateWorkSession(existingSession.id, { isActive: false });
      }
      
      // Create new session with proper initialization
      const session = await storage.createWorkSession(userId, {
        ...sessionData,
        isActive: true,
        startedAt: new Date()
      });
      
      res.json(session);
    } catch (error) {
      ErrorHandlingService.handleSessionError(error, res);
    }
  });

  app.get('/api/work-sessions/active', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getActiveWorkSession(userId);
      res.json(session);
    } catch (error) {
      ErrorHandlingService.handleSessionError(error, res);
    }
  });

  app.put('/api/work-sessions/:id/complete', demoAuth, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.completeWorkSession(sessionId);
      res.json(session);
    } catch (error) {
      console.error("Error completing work session:", error);
      res.status(500).json({ message: "Failed to complete work session" });
    }
  });

  app.put('/api/work-sessions/:id', demoAuth, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      
      // Comprehensive field validation for session updates
      const allowedFields = ['operatorName', 'targetName', 'partNumber', 'isActive', 'operators', 'parts'];
      const validUpdates: any = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          validUpdates[field] = updates[field];
        }
      }
      
      // Ensure the session belongs to the current user
      const userId = req.user.claims.sub;
      const existingSession = await storage.getWorkSessionById(sessionId);
      
      if (!existingSession || existingSession.userId !== userId) {
        return res.status(404).json({ message: "Work session not found" });
      }
      
      const updatedSession = await storage.updateWorkSession(sessionId, validUpdates);
      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating work session:", error);
      res.status(500).json({ message: "Failed to update work session" });
    }
  });

  app.get('/api/work-sessions', demoAuth, async (req: any, res) => {
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

  app.get('/api/work-sessions/history/operators-targets', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getUserWorkSessions(userId, 50); // 최근 50개 세션에서 추출
      
      const operators = new Set<string>();
      const targets = new Set<string>();
      
      sessions.forEach((session: any) => {
        if (session.operatorName) {
          operators.add(session.operatorName);
        }
        if (session.targetName) {
          targets.add(session.targetName);
        }
        // GRR 모드의 operators와 parts도 포함
        if (session.operators) {
          session.operators.forEach((op: any) => {
            if (op.name) operators.add(op.name);
          });
        }
        if (session.parts) {
          session.parts.forEach((part: any) => {
            if (part.name) targets.add(part.name);
          });
        }
      });
      
      res.json({
        operators: Array.from(operators).slice(0, 20), // 최대 20개
        targets: Array.from(targets).slice(0, 20) // 최대 20개
      });
    } catch (error) {
      console.error("Error fetching operators and targets history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // Advanced session history routes
  app.get('/api/work-sessions/history', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const sessions = await storage.getUserWorkSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching session history:", error);
      res.status(500).json({ message: "Failed to fetch session history" });
    }
  });

  app.get('/api/work-sessions/compare/:sessionIds', demoAuth, async (req: any, res) => {
    try {
      const sessionIds = req.params.sessionIds.split(',').map((id: string) => parseInt(id));
      const userId = req.user.claims.sub;
      
      const comparisons = await Promise.all(
        sessionIds.map(async (sessionId: number) => {
          const session = await storage.getWorkSessionById(sessionId);
          if (!session || session.userId !== userId) {
            return null;
          }
          
          const measurements = await storage.getMeasurementsBySession(sessionId);
          const analysis = await storage.getAnalysisResult(sessionId);
          
          return {
            session,
            measurements,
            analysis,
            statistics: {
              count: measurements.length,
              average: measurements.length > 0 ? measurements.reduce((sum, m) => sum + m.timeInMs, 0) / measurements.length : 0,
              min: measurements.length > 0 ? Math.min(...measurements.map(m => m.timeInMs)) : 0,
              max: measurements.length > 0 ? Math.max(...measurements.map(m => m.timeInMs)) : 0
            }
          };
        })
      );
      
      res.json(comparisons.filter(c => c !== null));
    } catch (error) {
      console.error("Error comparing sessions:", error);
      res.status(500).json({ message: "Failed to compare sessions" });
    }
  });

  app.get('/api/work-sessions/analytics/trends', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.query.days as string) || 30;
      
      const sessions = await storage.getUserWorkSessions(userId, 100);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentSessions = sessions.filter(s => 
        s.createdAt && new Date(s.createdAt) >= cutoffDate
      );
      
      const trends = {
        sessionCount: recentSessions.length,
        taskTypes: recentSessions.reduce((acc: any, s) => {
          acc[s.taskType] = (acc[s.taskType] || 0) + 1;
          return acc;
        }, {}),
        dailyActivity: calculateDailyActivity(recentSessions),
        averageSessionDuration: calculateAverageSessionDuration(recentSessions)
      };
      
      res.json(trends);
    } catch (error) {
      console.error("Error fetching analytics trends:", error);
      res.status(500).json({ message: "Failed to fetch analytics trends" });
    }
  });



  // Measurement routes with comprehensive validation
  app.post('/api/measurements', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertMeasurementSchema.parse(req.body);
      
      // Validate measurement constraints
      if (validatedData.timeInMs <= 0) {
        return res.status(400).json({ 
          message: "측정 시간은 0보다 커야 합니다",
          code: "INVALID_TIME"
        });
      }
      
      if (validatedData.timeInMs > 3600000) {
        return res.status(400).json({ 
          message: "측정 시간이 1시간을 초과할 수 없습니다",
          code: "TIME_EXCEEDED"
        });
      }
      
      // Verify session exists and belongs to user
      const session = await storage.getWorkSessionById(validatedData.sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ 
          message: "세션을 찾을 수 없습니다",
          code: "SESSION_NOT_FOUND"
        });
      }
      
      const measurement = await storage.createMeasurement(validatedData.sessionId, userId, validatedData);
      res.json(measurement);
    } catch (error) {
      ErrorHandlingService.handleMeasurementError(error, res);
    }
  });

  app.get('/api/measurements/session/:sessionId', demoAuth, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const measurements = await storage.getMeasurementsBySession(sessionId);
      res.json(measurements);
    } catch (error) {
      ErrorHandlingService.handleDatabaseError(error, res);
    }
  });

  app.delete('/api/measurements/:id', demoAuth, async (req: any, res) => {
    try {
      const measurementId = parseInt(req.params.id);
      await storage.deleteMeasurement(measurementId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting measurement:", error);
      res.status(500).json({ message: "Failed to delete measurement" });
    }
  });

  app.get('/api/measurements/user', demoAuth, async (req: any, res) => {
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
  app.post('/api/analysis', demoAuth, async (req: any, res) => {
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

  app.get('/api/analysis/session/:sessionId', demoAuth, async (req: any, res) => {
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
  app.post('/api/export/excel', demoAuth, async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      const measurements = await storage.getMeasurementsBySession(sessionId);
      const analysis = await storage.getAnalysisResult(sessionId);
      
      // Get session info to include operator and target names
      const session = await storage.getWorkSessionById(sessionId);
      
      res.json({
        measurements,
        analysis,
        sessionInfo: session,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Direct Excel file download route
  app.get('/api/export/excel/:sessionId/download', demoAuth, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const simpleMode = req.query.simple === 'true'; // Check for simple mode
      const measurements = await storage.getMeasurementsBySession(parseInt(sessionId));
      const analysis = await storage.getAnalysisResult(parseInt(sessionId));
      const session = await storage.getWorkSessionById(parseInt(sessionId));
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Use imported XLSX library

      // Generate filename with Korean team names
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      
      const teamNames: { [key: string]: string } = {
        'material_inspection': '물자검수팀',
        'storage_management': '저장관리팀',
        'packaging_management': '포장관리팀',
      };
      
      const taskTypeName = teamNames[session.taskType] || session.taskType;
      const filename = `${taskTypeName} ${session.partNumber || '측정'} 결과(${timestamp}).xlsx`;
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Raw Data Sheet (always included)
      const rawData = [
        ["시도 번호", "측정 시간(ms)", "측정 시간(형식)", "작업 유형", "공정세부번호", "측정자", "대상자", "측정 일시", "비고"],
        ...measurements.map((m, i) => [
          i + 1,
          m.timeInMs,
          `${Math.floor(m.timeInMs / 60000).toString().padStart(2, '0')}:${(Math.floor((m.timeInMs % 60000) / 1000)).toString().padStart(2, '0')}.${(m.timeInMs % 1000).toString().padStart(2, '0').slice(0, 2)}`,
          taskTypeName,
          session.partNumber || "",
          m.operatorName || session.operatorName || "",
          m.partName || session.targetName || "",
          m.timestamp ? new Date(m.timestamp).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR'),
          m.timeInMs < 1000 ? "매우 빠름" : m.timeInMs > 10000 ? "느림" : "정상"
        ]),
      ];
      
      // Add Raw Data sheet
      const worksheet1 = XLSX.utils.aoa_to_sheet(rawData);
      XLSX.utils.book_append_sheet(workbook, worksheet1, "Raw Data");
      
      // Only add additional sheets if not in simple mode
      if (!simpleMode) {
        // Summary Sheet
        const summaryData = [
        ["작업 정보", "", ""],
        ["작업 유형", taskTypeName, ""],
        ["공정세부번호", session.partNumber || "", ""],
        ["측정자", session.operatorName || "", ""],
        ["대상자", session.targetName || "", ""],
        ["시작 시간", session.createdAt ? new Date(session.createdAt).toLocaleString('ko-KR') : '', ""],
        ["", "", ""],
        ["Gage R&R 분석 결과", "", ""],
        ["반복성 (Repeatability)", analysis?.repeatability?.toFixed(2) || "N/A", "%"],
        ["재현성 (Reproducibility)", analysis?.reproducibility?.toFixed(2) || "N/A", "%"],
        ["GRR", analysis?.grr?.toFixed(2) || "N/A", "%"],
        ["부품별 기여도", analysis?.partContribution?.toFixed(2) || "N/A", "%"],
        ["측정자별 기여도", analysis?.operatorContribution?.toFixed(2) || "N/A", "%"],
        ["수용성", analysis?.grr && analysis.grr < 30 ? "합격" : "부적합", ""],
        ["", "", ""],
        ["평가 기준", "", ""],
        ["GRR < 10%", "우수 (측정시스템 수용가능)", ""],
        ["10% ≤ GRR < 30%", "양호 (조건부 수용가능)", ""],
        ["GRR ≥ 30%", "부적합 (측정시스템 개선필요)", ""],
        ["", "", ""],
        ["통계 정보", "", ""],
        ["총 측정 횟수", measurements.length, "회"],
        ["평균 시간", measurements.length > 0 ? (measurements.reduce((sum, m) => sum + m.timeInMs, 0) / measurements.length).toFixed(2) : "0.00", "ms"],
        ["최소 시간", measurements.length > 0 ? Math.min(...measurements.map(m => m.timeInMs)).toFixed(2) : "0.00", "ms"],
        ["최대 시간", measurements.length > 0 ? Math.max(...measurements.map(m => m.timeInMs)).toFixed(2) : "0.00", "ms"]
      ];

      // Analysis Details Sheet
      const analysisData = [
        ["Gage R&R 상세 분석", "", ""],
        ["", "", ""],
        ["반복성 분석", "", ""],
        ["정의", "동일 측정자가 동일 조건에서 반복 측정 시 일관성", ""],
        ["결과", analysis?.repeatability?.toFixed(2) || "N/A", "%"],
        ["평가", analysis?.repeatability ? 
          (analysis.repeatability < 10 ? "우수" : 
           analysis.repeatability < 20 ? "양호" : "개선필요") : "N/A", ""],
        ["", "", ""],
        ["재현성 분석", "", ""],
        ["정의", "서로 다른 측정자 간의 측정 일관성", ""],
        ["결과", analysis?.reproducibility?.toFixed(2) || "N/A", "%"],
        ["평가", analysis?.reproducibility ? 
          (analysis.reproducibility < 10 ? "우수" : 
           analysis.reproducibility < 20 ? "양호" : "개선필요") : "N/A", ""],
        ["", "", ""],
        ["전체 GRR", "", ""],
        ["정의", "측정시스템의 전체 변동성", ""],
        ["결과", analysis?.grr?.toFixed(2) || "N/A", "%"],
        ["수용성", analysis?.grr ? 
          (analysis.grr < 10 ? "우수" : 
           analysis.grr < 30 ? "양호" : "부적합") : "N/A", ""]
        ];

        // Create worksheets for additional sheets
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        const analysisSheet = XLSX.utils.aoa_to_sheet(analysisData);

        // Add additional sheets to workbook
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
        XLSX.utils.book_append_sheet(workbook, analysisSheet, "Analysis Details");
      } // End of !simpleMode condition

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for Excel file download with better mobile compatibility
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', excelBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      
      res.end(excelBuffer);
      
    } catch (error) {
      console.error("Direct download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
