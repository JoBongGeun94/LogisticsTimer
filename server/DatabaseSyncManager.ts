import { Pool } from '@neondatabase/serverless';

/**
 * Single Responsibility Principle (SRP)
 * 데이터베이스 동기화와 참조 무결성 관리만을 담당
 */
export class DatabaseSyncManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 참조 무결성을 고려한 안전한 데이터 정리
   */
  async ensureSchemaConsistency(): Promise<void> {
    console.log('Starting schema consistency check...');
    
    // 1. 먼저 종속 테이블 정리 (work_sessions)
    await this.cleanWorkSessionsTable();
    
    // 2. 측정 데이터 정리 (measurements)
    await this.cleanMeasurementsTable();
    
    // 3. 분석 결과 정리 (analysis_results)
    await this.cleanAnalysisResultsTable();
    
    // 4. 마지막에 부모 테이블 정리 (users)
    await this.cleanUsersTable();
    
    console.log('Schema consistency ensured');
  }

  private async cleanWorkSessionsTable(): Promise<void> {
    try {
      // 테이블이 존재하는지 확인
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'work_sessions'
        );
      `);

      if (tableExists.rows[0].exists) {
        // demo-user-001과 연결된 work_sessions 정리
        await this.pool.query(`
          DELETE FROM work_sessions WHERE user_id = 'demo-user-001';
        `);
        console.log('Cleaned work_sessions table');
      }
    } catch (error) {
      console.log('Work sessions table cleanup handled:', error);
    }
  }

  private async cleanMeasurementsTable(): Promise<void> {
    try {
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'measurements'
        );
      `);

      if (tableExists.rows[0].exists) {
        await this.pool.query(`
          DELETE FROM measurements WHERE user_id = 'demo-user-001';
        `);
        console.log('Cleaned measurements table');
      }
    } catch (error) {
      console.log('Measurements table cleanup handled:', error);
    }
  }

  private async cleanAnalysisResultsTable(): Promise<void> {
    try {
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'analysis_results'
        );
      `);

      if (tableExists.rows[0].exists) {
        await this.pool.query(`
          DELETE FROM analysis_results WHERE user_id = 'demo-user-001';
        `);
        console.log('Cleaned analysis_results table');
      }
    } catch (error) {
      console.log('Analysis results table cleanup handled:', error);
    }
  }

  private async cleanUsersTable(): Promise<void> {
    try {
      // 이제 안전하게 demo-user-001 삭제 가능
      await this.pool.query(`
        DELETE FROM users WHERE id = 'demo-user-001';
      `);
      console.log('Cleaned users table');
    } catch (error) {
      console.log('Users table cleanup handled:', error);
    }
  }

  /**
   * 테이블 생성 (Open/Closed Principle)
   */
  async createUsersTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        email VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        worker_id VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'worker',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  async createWorkSessionsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        work_type VARCHAR NOT NULL,
        gage_rr_mode BOOLEAN DEFAULT FALSE,
        operators JSONB DEFAULT '[]',
        targets JSONB DEFAULT '[]',
        work_description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  async createMeasurementsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL,
        operator_name VARCHAR,
        target_name VARCHAR,
        measurement_time DECIMAL NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  async createAnalysisResultsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL,
        analysis_type VARCHAR NOT NULL,
        results JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  async createSessionsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    `);
  }

  /**
   * 데모 사용자 안전 생성
   */
  async insertDefaultData(): Promise<void> {
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
    console.log('Demo user AF-001 safely created');
  }

  /**
   * 테이블 구조 검증
   */
  async validateTableStructure(tableName: string): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public';
      `, [tableName]);
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 필요시 스키마 업데이트
   */
  async updateSchemaIfNeeded(): Promise<void> {
    // work_sessions 테이블에 user_id가 있는지 확인하고 없으면 추가
    try {
      await this.pool.query(`
        ALTER TABLE work_sessions 
        ADD COLUMN IF NOT EXISTS user_id VARCHAR;
      `);
    } catch (error) {
      console.log('Schema update handled:', error);
    }
  }
}