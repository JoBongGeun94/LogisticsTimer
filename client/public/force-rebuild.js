// public/force-rebuild.js
// MIME 타입 오류 해결을 위한 강제 재빌드 트리거

const FORCE_REBUILD_INFO = {
  version: '3.0.1',
  timestamp: new Date().toISOString(),
  purpose: 'Fix MIME type and 404 errors',
  buildId: 'MIME_FIX_' + Date.now(),
  changes: [
    'Fixed CSS MIME type from text/plain to text/css',
    'Resolved JavaScript 404 errors',
    'Added explicit headers in render.yaml',
    'Cleared build cache completely'
  ],
  renderConfig: {
    staticSite: true,
    mimeTypesFixed: true,
    headersConfigured: true,
    cacheCleared: true
  }
};

console.log('🔧 Force rebuild info:', FORCE_REBUILD_INFO);

// 브라우저 환경에서만 실행
if (typeof window !== 'undefined') {
  // 캐시된 리소스 강제 새로고침
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
  
  // 서비스 워커 업데이트
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.update();
      });
    });
  }
}
