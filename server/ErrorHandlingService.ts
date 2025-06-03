import { Response } from 'express';

/**
 * Single Responsibility Principle (SRP)
 * 오류 처리만을 담당하는 서비스 클래스
 */
export class ErrorHandlingService {
  
  static handleDatabaseError(error: any, res: Response): void {
    console.error('Database error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        error: 'Data conflict',
        message: '데이터 중복 오류가 발생했습니다.',
        code: 'DUPLICATE_KEY'
      });
      return;
    }
    
    if (error.code === '23503') { // Foreign key violation
      res.status(400).json({
        error: 'Reference error',
        message: '참조 데이터 오류가 발생했습니다.',
        code: 'FOREIGN_KEY_VIOLATION'
      });
      return;
    }
    
    res.status(500).json({
      error: 'Database error',
      message: '데이터베이스 오류가 발생했습니다.',
      code: 'DATABASE_ERROR'
    });
  }

  static handleSessionError(error: any, res: Response): void {
    console.error('Session error:', error);
    res.status(500).json({
      error: 'Session error',
      message: '세션 오류가 발생했습니다.',
      code: 'SESSION_ERROR'
    });
  }

  static handleMeasurementError(error: any, res: Response): void {
    console.error('Measurement error:', error);
    res.status(400).json({
      error: 'Measurement error',
      message: '측정 데이터 처리 중 오류가 발생했습니다.',
      code: 'MEASUREMENT_ERROR'
    });
  }

  static handleGenericError(error: any, res: Response): void {
    console.error('Generic error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '서버 내부 오류가 발생했습니다.',
      code: 'INTERNAL_ERROR'
    });
  }
}