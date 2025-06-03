import { Response } from 'express';

// Single Responsibility: 오류 처리 전담
export class ErrorHandlingService {
  // Open/Closed Principle: 새로운 오류 타입 추가 가능
  static handleDatabaseError(error: any, res: Response): void {
    console.error('Database error:', error);
    
    if (error.code === '23505') {
      res.status(409).json({ 
        message: '중복된 데이터입니다',
        code: 'DUPLICATE_ENTRY'
      });
      return;
    }
    
    if (error.code === '23503') {
      res.status(400).json({ 
        message: '참조 무결성 오류입니다',
        code: 'FOREIGN_KEY_VIOLATION'
      });
      return;
    }
    
    if (error.code === '42703') {
      res.status(500).json({ 
        message: '데이터베이스 스키마 오류입니다',
        code: 'COLUMN_NOT_FOUND'
      });
      return;
    }
    
    res.status(500).json({ 
      message: '데이터베이스 처리 중 오류가 발생했습니다',
      code: 'DATABASE_ERROR'
    });
  }

  // Interface Segregation: 세션 오류만 처리
  static handleSessionError(error: any, res: Response): void {
    console.error('Session error:', error);
    
    if (error.message?.includes('not found')) {
      res.status(404).json({
        message: '세션을 찾을 수 없습니다',
        code: 'SESSION_NOT_FOUND'
      });
      return;
    }
    
    if (error.message?.includes('unauthorized')) {
      res.status(401).json({
        message: '세션 권한이 없습니다',
        code: 'SESSION_UNAUTHORIZED'
      });
      return;
    }
    
    res.status(500).json({
      message: '세션 처리 중 오류가 발생했습니다',
      code: 'SESSION_ERROR'
    });
  }

  // Liskov Substitution: 일관된 측정 오류 처리
  static handleMeasurementError(error: any, res: Response): void {
    console.error('Measurement error:', error);
    
    if (error.message?.includes('invalid time')) {
      res.status(400).json({
        message: '유효하지 않은 측정 시간입니다',
        code: 'INVALID_TIME'
      });
      return;
    }
    
    if (error.message?.includes('session required')) {
      res.status(400).json({
        message: '활성 세션이 필요합니다',
        code: 'SESSION_REQUIRED'
      });
      return;
    }
    
    res.status(500).json({
      message: '측정 처리 중 오류가 발생했습니다',
      code: 'MEASUREMENT_ERROR'
    });
  }

  // Dependency Inversion: 추상화된 일반 오류 처리
  static handleGenericError(error: any, res: Response): void {
    console.error('Generic error:', error);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || '서버 내부 오류가 발생했습니다';
    
    res.status(statusCode).json({
      message,
      code: 'INTERNAL_ERROR'
    });
  }
}