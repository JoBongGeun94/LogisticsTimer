-- 데이터베이스 성능 최적화를 위한 인덱스 생성
-- 프로덕션 배포 전 실행 필요

-- 1. 작업 세션 조회 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_sessions_user_id_created_at 
ON work_sessions(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_sessions_active 
ON work_sessions(user_id, is_active) WHERE is_active = true;

-- 2. 측정 데이터 조회 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_session_id_timestamp 
ON measurements(session_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_measurements_operator_part 
ON measurements(operator_name, part_name) WHERE operator_name IS NOT NULL;

-- 3. 분석 결과 조회 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_session_user 
ON analysis_results(session_id, user_id);

-- 4. 세션 스토리지 최적화 (만료된 세션 정리용)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expire 
ON sessions(expire) WHERE expire < NOW();

-- 5. 복합 쿼리 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_sessions_task_type_user 
ON work_sessions(task_type, user_id, created_at DESC);

-- 데이터베이스 통계 업데이트
ANALYZE work_sessions;
ANALYZE measurements; 
ANALYZE analysis_results;
ANALYZE sessions;

-- 자동 VACUUM 설정 확인 (권장)
-- ALTER TABLE work_sessions SET (autovacuum_vacuum_scale_factor = 0.1);
-- ALTER TABLE measurements SET (autovacuum_vacuum_scale_factor = 0.1);
-- ALTER TABLE analysis_results SET (autovacuum_vacuum_scale_factor = 0.2);

-- 성능 모니터링 뷰 생성
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public';