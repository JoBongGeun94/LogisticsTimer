import { Pool } from '@neondatabase/serverless';

/**
 * Single Responsibility Principle (SRP)
 * 데이터베이스 마이그레이션만을 담당하는 클래스
 */
export class DatabaseMigrationManager {
  constructor(private pool: Pool) {}

  /**
   * 안전한 제약조건 제거
   */
  async removeConstraintsSafely(): Promise<void> {
    const constraints = [
      'users_email_key',
      'users_worker_id_key'
    ];

    for (const constraint of constraints) {
      try {
        await this.pool.query(`
          ALTER TABLE users DROP CONSTRAINT IF EXISTS ${constraint};
        `);
        console.log(`Removed constraint: ${constraint}`);
      } catch (error) {
        console.log(`Constraint ${constraint} not found or already removed`);
      }
    }
  }

  /**
   * 사용자 데이터 안전 업서트
   */
  async upsertDemoUserSafely(): Promise<void> {
    try {
      // 기존 사용자 확인 및 정리
      await this.pool.query(`
        DELETE FROM users WHERE id != 'AF-001' AND (email = 'supply@airforce.mil.kr' OR worker_id = 'AF-001');
      `);

      // 안전한 업서트
      await this.pool.query(`
        INSERT INTO users (id, email, first_name, last_name, worker_id, role) 
        VALUES ('AF-001', 'supply@airforce.mil.kr', '공군', '종합보급창', 'AF-001', 'manager')
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          worker_id = EXCLUDED.worker_id,
          role = EXCLUDED.role,
          updated_at = NOW();
      `);
      
      console.log('Demo user AF-001 safely initialized');
    } catch (error) {
      console.error('Error in user upsert:', error);
      throw error;
    }
  }

  /**
   * 데이터 정합성 확인
   */
  async validateDataIntegrity(): Promise<boolean> {
    try {
      const userCheck = await this.pool.query(`
        SELECT id, email, worker_id FROM users WHERE id = 'AF-001';
      `);
      
      return userCheck.rows.length === 1;
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      return false;
    }
  }
}