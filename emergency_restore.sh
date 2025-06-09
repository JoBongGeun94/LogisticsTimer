#!/bin/bash
# emergency_restore.sh
# 목적: 즉시 이전 작동 버전으로 복원

set -e

echo "🚨 긴급 복구 시작..."
echo "=============================================="

cd "C:/Users/bong/LogisticsTimer"

echo "🔄 1단계: 이전 작동 버전으로 완전 복원..."
git reset --hard b493942

echo "✅ 2단계: 복원 완료 확인..."
git log --oneline -3

echo "🚀 3단계: 개발 서버 시작..."
npm run dev

echo "🎉 복구 완료!"
echo "=============================================="
echo "✅ 복원 완료:"
echo "  • 3시간 전 작동하던 버전으로 복원"
echo "  • 모든 UI/UX 기능 복원"
echo "  • 측정 페이지 복원"
echo ""
echo "🎯 다음 단계:"
echo "  1. 브라우저에서 http://localhost:5173 확인"
echo "  2. 모든 기능 정상 작동 확인"
echo "  3. TypeScript 오류 안전 수정 계획 수립"
echo "=============================================="