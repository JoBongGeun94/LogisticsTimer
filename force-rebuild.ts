// 강제 재빌드 트리거 파일
// 생성 시간: 2025-06-04 07:13:00 KST
// 목적: Render 빌드 캐시 무효화

export const BUILD_INFO = {
  version: '2.0.1',
  timestamp: '2025-06-04T07:13:00.000Z',
  purpose: 'Force rebuild to clear cat error',
  hash: 'CLEAR_CAT_ERROR_' + Date.now()
};

// 이 파일은 빌드 후 삭제해도 됩니다
console.log('🔄 Forced rebuild triggered:', BUILD_INFO);
