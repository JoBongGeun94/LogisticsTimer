import { Pool } from '@neondatabase/serverless';

/**
 * Open/Closed Principle (OCP)
 * 스키마 생성은 확장에 열려있고 수정에 닫혀있도록 설계
 */
export abstract class BaseSchemaManager {
  constructor(protected pool: Pool) {}
  
  abstract createTables(): Promise<void>;
  abstract createIndexes(): Promise<void>;
}

/**
 * Interface Segregation Principle (ISP)
 * 각 테이블별로 독립적인 인터페이스 제공
 */
export interface ITableManager {
  create(): Promise<void>;
  validate(): Promise<boolean>;
}

export class UsersTableManager implements ITableManager {
  constructor(private pool: Pool) {}

  async create(): Promise<void> {
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

  async validate(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public';
      `);
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }
}

export class WorkSessionsTableManager implements ITableManager {
  constructor(private pool: Pool) {}

  async create(): Promise<void> {
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

  async validate(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'work_sessions' AND table_schema = 'public';
      `);
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Dependency Inversion Principle (DIP)
 * 구체적인 구현이 아닌 추상화에 의존
 */
export class ProductionSchemaManager extends BaseSchemaManager {
  private tableManagers: ITableManager[];

  constructor(pool: Pool) {
    super(pool);
    this.tableManagers = [
      new UsersTableManager(pool),
      new WorkSessionsTableManager(pool)
    ];
  }

  async createTables(): Promise<void> {
    for (const manager of this.tableManagers) {
      await manager.create();
    }
  }

  async createIndexes(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    `);
  }

  async validateSchema(): Promise<boolean> {
    for (const manager of this.tableManagers) {
      if (!(await manager.validate())) {
        return false;
      }
    }
    return true;
  }
}