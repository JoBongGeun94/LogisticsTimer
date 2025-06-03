import { Pool } from '@neondatabase/serverless';

// Single Responsibility: 데이터베이스 동기화만 담당
export class DatabaseSyncManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Open/Closed Principle: 새로운 스키마 추가 가능
  async ensureSchemaConsistency(): Promise<void> {
    try {
      await this.createUsersTable();
      await this.createWorkSessionsTable();
      await this.createMeasurementsTable();
      await this.createAnalysisResultsTable();
      await this.insertDefaultData();
      console.log('Schema consistency ensured');
    } catch (error) {
      console.error('Schema sync error:', error);
      throw error;
    }
  }

  private async createUsersTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        worker_id VARCHAR UNIQUE,
        role VARCHAR NOT NULL DEFAULT 'worker',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  private async createWorkSessionsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        task_type VARCHAR NOT NULL,
        part_number VARCHAR,
        operator_name VARCHAR,
        target_name VARCHAR,
        operators JSONB,
        parts JSONB,
        trials_per_operator INTEGER DEFAULT 3,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  private async createMeasurementsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES work_sessions(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        attempt_number INTEGER NOT NULL,
        time_in_ms INTEGER NOT NULL,
        task_type VARCHAR NOT NULL,
        part_number VARCHAR,
        operator_name VARCHAR,
        part_id VARCHAR,
        part_name VARCHAR,
        trial_number INTEGER DEFAULT 1,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  private async createAnalysisResultsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES work_sessions(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        repeatability REAL,
        reproducibility REAL,
        grr REAL,
        part_contribution REAL,
        operator_contribution REAL,
        is_acceptable BOOLEAN,
        total_variation REAL,
        analysis_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  private async insertDefaultData(): Promise<void> {
    await this.pool.query(`
      INSERT INTO users (id, email, first_name, last_name, worker_id, role) 
      VALUES ('demo-user-001', 'supply@airforce.mil.kr', '공군', '종합보급창', 'AF-001', 'manager')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Interface Segregation: 테이블별 검증 분리
  async validateTableStructure(tableName: string): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Table validation error for ${tableName}:`, error);
      return false;
    }
  }

  // Dependency Inversion: 추상화된 스키마 업데이트
  async updateSchemaIfNeeded(): Promise<void> {
    const tables = ['users', 'work_sessions', 'measurements', 'analysis_results'];
    
    for (const table of tables) {
      const isValid = await this.validateTableStructure(table);
      if (!isValid) {
        console.log(`Recreating table: ${table}`);
        await this.ensureSchemaConsistency();
        break;
      }
    }
  }
}