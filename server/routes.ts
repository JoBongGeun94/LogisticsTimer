import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWorkSessionSchema, insertMeasurementSchema, insertAnalysisResultSchema } from "@shared/schema";
import { z } from "zod";

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

  // Work session routes
  app.post('/api/work-sessions', demoAuth, async (req: any, res) => {
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

  app.get('/api/work-sessions/active', demoAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getActiveWorkSession(userId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active work session:", error);
      res.status(500).json({ message: "Failed to fetch active work session" });
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

  // Measurement routes
  app.post('/api/measurements', demoAuth, async (req: any, res) => {
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

  app.get('/api/measurements/session/:sessionId', demoAuth, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const measurements = await storage.getMeasurementsBySession(sessionId);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching measurements:", error);
      res.status(500).json({ message: "Failed to fetch measurements" });
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

  // Direct Excel file download route for mobile
  app.get('/api/export/excel/:sessionId/download', demoAuth, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const measurements = await storage.getMeasurementsBySession(parseInt(sessionId));
      const analysis = await storage.getAnalysisResult(parseInt(sessionId));
      const session = await storage.getWorkSessionById(parseInt(sessionId));
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Generate filename with Korean team names
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      
      const teamNames: { [key: string]: string } = {
        'material_inspection': '물자검수팀',
        'storage_management': '저장관리팀',
        'packaging_management': '포장관리팀',
      };
      
      const taskTypeName = teamNames[session.taskType] || session.taskType;
      const filename = `${taskTypeName} ${session.partNumber || '측정'} 결과(${timestamp}).txt`;
      
      // Create comprehensive text report
      const textReport = `=== 측정 분석 리포트 ===

[작업 정보]
작업 유형: ${taskTypeName}
공정세부번호: ${session.partNumber || '미지정'}
측정자: ${session.operatorName || '미지정'}
대상자: ${session.targetName || '미지정'}
측정 시작: ${new Date(session.createdAt).toLocaleString('ko-KR')}
측정 완료: ${session.completedAt ? new Date(session.completedAt).toLocaleString('ko-KR') : '진행중'}

[측정 데이터] (총 ${measurements.length}회)
${'='.repeat(50)}
${measurements.map((m, i) => 
  `${(i+1).toString().padStart(2, ' ')}. ${(m.timeInMs/1000).toFixed(2)}초 | ${new Date(m.timestamp).toLocaleString('ko-KR')}`
).join('\n')}

[기본 통계]
${'='.repeat(50)}
평균 시간: ${measurements.length > 0 ? (measurements.reduce((sum, m) => sum + m.timeInMs, 0) / measurements.length / 1000).toFixed(2) : '0.00'}초
최소 시간: ${measurements.length > 0 ? (Math.min(...measurements.map(m => m.timeInMs)) / 1000).toFixed(2) : '0.00'}초
최대 시간: ${measurements.length > 0 ? (Math.max(...measurements.map(m => m.timeInMs)) / 1000).toFixed(2) : '0.00'}초
측정 범위: ${measurements.length > 0 ? ((Math.max(...measurements.map(m => m.timeInMs)) - Math.min(...measurements.map(m => m.timeInMs))) / 1000).toFixed(2) : '0.00'}초

${analysis ? `[Gage R&R 분석 결과]
${'='.repeat(50)}
반복성 (Repeatability): ${analysis.repeatability.toFixed(1)}%
재현성 (Reproducibility): ${analysis.reproducibility.toFixed(1)}%
전체 GRR: ${analysis.grr.toFixed(1)}%
부품 기여도: ${analysis.partContribution.toFixed(1)}%
측정자 기여도: ${analysis.operatorContribution.toFixed(1)}%
수용성: ${analysis.grr < 30 ? '양호 (수용가능)' : '부적합 (개선필요)'}

[상세 분석]
${'='.repeat(50)}
반복성 평가: ${analysis.repeatability < 10 ? '우수 - 측정 장비가 매우 안정적' : 
               analysis.repeatability < 20 ? '양호 - 측정 장비의 정밀도가 적절' : 
               '주의 - 측정 장비 점검 및 보정 필요'}

재현성 평가: ${analysis.reproducibility < 10 ? '우수 - 측정자 간 일관성이 매우 높음' : 
               analysis.reproducibility < 20 ? '양호 - 측정자 간 편차가 적절한 수준' : 
               '주의 - 측정자 교육 및 작업 표준화 필요'}

부품 기여도: ${analysis.partContribution > 50 ? '이상적 - 실제 작업 차이가 변동의 주요 원인' : 
               analysis.partContribution > 20 ? '보통 - 작업 간 차이를 적절히 구별 가능' : 
               '낮음 - 측정시스템 오차가 실제 차이보다 큼'}

[평가 기준]
${'='.repeat(50)}
GRR < 10%: 우수 (측정시스템 수용가능)
10% ≤ GRR < 30%: 양호 (조건부 수용가능)  
GRR ≥ 30%: 부적합 (측정시스템 개선필요)

[개선 권장사항]
${'='.repeat(50)}
${analysis.grr >= 30 ? 
`우선순위 1: 측정 장비 점검 및 보정 (반복성 개선)
우선순위 2: 측정자 교육 강화 (재현성 개선)
우선순위 3: 작업 환경 및 절차 표준화
우선순위 4: 측정시스템 전면 재검토` :
analysis.grr >= 10 ?
`개선사항 1: 측정 절차 문서화 및 표준화
개선사항 2: 정기적 시스템 점검 체계 구축
개선사항 3: 측정자 간 일관성 향상 교육` :
`현재 상태: 측정시스템이 우수한 상태
유지사항: 현재 수준 지속 관리 및 모니터링
정기점검: 월 1회 정도 시스템 상태 확인`}` : 
`[Gage R&R 분석]
${'='.repeat(50)}
분석 데이터가 부족합니다.
최소 3회 이상 측정이 필요합니다.

[권장사항]
- 추가 측정 수행 (최소 10회 권장)
- 일관된 측정 조건 유지
- 측정자 교육 실시`}

${'='.repeat(50)}
리포트 생성일시: ${new Date().toLocaleString('ko-KR')}
생성 시스템: Gage R&R 측정 분석 시스템
${'='.repeat(50)}`;
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(textReport);
      
    } catch (error) {
      console.error("Direct download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
