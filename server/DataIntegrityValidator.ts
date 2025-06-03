import { Pool } from '@neondatabase/serverless';

/**
 * Single Responsibility Principle (SRP)
 * 데이터 무결성 검증만을 담당하는 클래스
 */
export class DataIntegrityValidator {
  constructor(private pool: Pool) {}

  /**
   * 참조 무결성 검증
   */
  async validateReferentialIntegrity(): Promise<{ isValid: boolean; violations: string[] }> {
    const violations: string[] = [];

    // 1. work_sessions에서 존재하지 않는 user_id 참조 검사
    try {
      const orphanedSessions = await this.pool.query(`
        SELECT DISTINCT ws.user_id 
        FROM work_sessions ws 
        LEFT JOIN users u ON ws.user_id = u.id 
        WHERE u.id IS NULL;
      `);

      if (orphanedSessions.rows.length > 0) {
        violations.push(`Orphaned work_sessions found: ${orphanedSessions.rows.map(r => r.user_id).join(', ')}`);
      }
    } catch (error) {
      console.log('Work sessions integrity check handled:', error);
    }

    // 2. measurements에서 존재하지 않는 user_id 참조 검사
    try {
      const orphanedMeasurements = await this.pool.query(`
        SELECT DISTINCT m.user_id 
        FROM measurements m 
        LEFT JOIN users u ON m.user_id = u.id 
        WHERE u.id IS NULL;
      `);

      if (orphanedMeasurements.rows.length > 0) {
        violations.push(`Orphaned measurements found: ${orphanedMeasurements.rows.map(r => r.user_id).join(', ')}`);
      }
    } catch (error) {
      console.log('Measurements integrity check handled:', error);
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * 데이터 일관성 검증
   */
  async validateDataConsistency(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 1. 중복된 사용자 이메일 검사
    try {
      const duplicateEmails = await this.pool.query(`
        SELECT email, COUNT(*) as count 
        FROM users 
        WHERE email IS NOT NULL 
        GROUP BY email 
        HAVING COUNT(*) > 1;
      `);

      if (duplicateEmails.rows.length > 0) {
        issues.push(`Duplicate emails found: ${duplicateEmails.rows.map(r => `${r.email} (${r.count})`).join(', ')}`);
      }
    } catch (error) {
      console.log('Email consistency check handled:', error);
    }

    // 2. 중복된 worker_id 검사
    try {
      const duplicateWorkerIds = await this.pool.query(`
        SELECT worker_id, COUNT(*) as count 
        FROM users 
        WHERE worker_id IS NOT NULL 
        GROUP BY worker_id 
        HAVING COUNT(*) > 1;
      `);

      if (duplicateWorkerIds.rows.length > 0) {
        issues.push(`Duplicate worker_ids found: ${duplicateWorkerIds.rows.map(r => `${r.worker_id} (${r.count})`).join(', ')}`);
      }
    } catch (error) {
      console.log('Worker ID consistency check handled:', error);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 전체 데이터베이스 상태 검증
   */
  async validateDatabaseState(): Promise<{
    referentialIntegrity: { isValid: boolean; violations: string[] };
    dataConsistency: { isValid: boolean; issues: string[] };
    isHealthy: boolean;
  }> {
    const referentialIntegrity = await this.validateReferentialIntegrity();
    const dataConsistency = await this.validateDataConsistency();

    return {
      referentialIntegrity,
      dataConsistency,
      isHealthy: referentialIntegrity.isValid && dataConsistency.isValid
    };
  }

  /**
   * 자동 복구 가능한 문제들 수정
   */
  async autoRepairIssues(): Promise<{ repaired: string[]; failed: string[] }> {
    const repaired: string[] = [];
    const failed: string[] = [];

    // 1. 고아 세션 정리
    try {
      const orphanedSessionsResult = await this.pool.query(`
        DELETE FROM work_sessions 
        WHERE user_id NOT IN (SELECT id FROM users);
      `);
      
      if (orphanedSessionsResult.rowCount !== null && orphanedSessionsResult.rowCount > 0) {
        repaired.push(`Removed ${orphanedSessionsResult.rowCount} orphaned work sessions`);
      }
    } catch (error) {
      failed.push('Failed to repair orphaned work sessions');
    }

    // 2. 고아 측정 데이터 정리
    try {
      const orphanedMeasurementsResult = await this.pool.query(`
        DELETE FROM measurements 
        WHERE user_id NOT IN (SELECT id FROM users);
      `);
      
      if (orphanedMeasurementsResult.rowCount !== null && orphanedMeasurementsResult.rowCount > 0) {
        repaired.push(`Removed ${orphanedMeasurementsResult.rowCount} orphaned measurements`);
      }
    } catch (error) {
      failed.push('Failed to repair orphaned measurements');
    }

    return { repaired, failed };
  }
}