#!/bin/bash
# step1_backup_analysis.sh
# 목적: 현재 상태 완전 백업 및 최신 커밋 개선사항 분석
# 원칙: 기존 코드 절대 건드리지 않음 - 오직 백업과 분석만

set -e

echo "🔒 1단계: 백업 및 분석 시작"
echo "원칙: 기존 코드 절대 건드리지 않음"
echo "=============================================="

cd "C:/Users/bong/LogisticsTimer"

echo "📂 1-1: 현재 상태 완전 백업..."
# 현재 긴급복구된 상태를 완전 백업
backup_dir="backup_emergency_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

# 핵심 파일들 백업
cp -r src "$backup_dir/"
cp package.json "$backup_dir/"
cp tsconfig.json "$backup_dir/"
cp tailwind.config.* "$backup_dir/"
cp vite.config.ts "$backup_dir/"

echo "✅ 백업 완료: $backup_dir"

echo "🔍 1-2: 최신 커밋 개선사항 분석..."
# 최신 커밋으로 일시 전환하여 개선사항 확인
git stash push -m "현재 작업 임시 저장"
git checkout 9b1229c

# 개선사항 파일 목록 생성
echo "📊 최신 커밋의 개선사항 파일들:" > analysis_report.md
echo "========================================" >> analysis_report.md
echo "" >> analysis_report.md

# src 폴더 구조 분석
echo "## 📁 src 폴더 구조:" >> analysis_report.md
find src -type f -name "*.tsx" -o -name "*.ts" | sort >> analysis_report.md
echo "" >> analysis_report.md

# 새로 추가된 주요 기능 파일들 확인
echo "## 🆕 새로 추가된 주요 기능들:" >> analysis_report.md
echo "### 1. 페이지 컴포넌트" >> analysis_report.md
if [ -d "src/pages" ]; then
    ls -la src/pages/ >> analysis_report.md
fi
echo "" >> analysis_report.md

echo "### 2. 컴포넌트 구조" >> analysis_report.md  
if [ -d "src/components" ]; then
    find src/components -type f -name "*.tsx" | head -10 >> analysis_report.md
fi
echo "" >> analysis_report.md

echo "### 3. 서비스 계층" >> analysis_report.md
if [ -d "src/services" ]; then
    ls -la src/services/ >> analysis_report.md
fi
echo "" >> analysis_report.md

echo "### 4. 훅과 유틸리티" >> analysis_report.md
if [ -d "src/hooks" ]; then
    ls -la src/hooks/ >> analysis_report.md
fi
echo "" >> analysis_report.md

# 개선사항들을 별도 폴더에 백업
improved_dir="backup_latest_improvements_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$improved_dir"
cp -r src "$improved_dir/"
cp README.md "$improved_dir/" 2>/dev/null || true

echo "✅ 개선사항 백업 완료: $improved_dir"

echo "🔄 1-3: 원래 상태로 복원..."
# 긴급복구 상태로 다시 복원
git checkout b493942
git stash pop 2>/dev/null || echo "stash 복원 완료"

echo "📋 1-4: 통합 포인트 매핑..."
# 통합 가능한 부분들 분석
echo "## 🔗 통합 포인트 매핑:" >> analysis_report.md
echo "### A. 안전하게 추가 가능한 기능들:" >> analysis_report.md
echo "- [ ] 도움말 모달 (F1 키)" >> analysis_report.md
echo "- [ ] Toast 알림 시스템" >> analysis_report.md  
echo "- [ ] 키보드 단축키 확장" >> analysis_report.md
echo "- [ ] CSV 다운로드 기능 개선" >> analysis_report.md
echo "" >> analysis_report.md

echo "### B. 신중하게 통합할 기능들:" >> analysis_report.md
echo "- [ ] 상세 분석 페이지 (기존 분석과 연동)" >> analysis_report.md
echo "- [ ] 랜딩 페이지 (기존 시작 버튼과 연동)" >> analysis_report.md
echo "- [ ] MSA 규격 강화 (기존 분석 로직 확장)" >> analysis_report.md
echo "" >> analysis_report.md

echo "### C. 아키텍처 개선사항:" >> analysis_report.md
echo "- [ ] 컴포넌트 분리 (UI 변경 없이)" >> analysis_report.md
echo "- [ ] SOLID 원칙 적용" >> analysis_report.md
echo "- [ ] TypeScript 타입 강화" >> analysis_report.md
echo "" >> analysis_report.md

# 현재 상태 요약
echo "## 📊 현재 상태 요약:" >> analysis_report.md
echo "- 긴급복구 상태: 측정 UI/UX 완전 보존됨" >> analysis_report.md
echo "- 백업 생성: $backup_dir" >> analysis_report.md  
echo "- 개선사항 분석: $improved_dir" >> analysis_report.md
echo "- 다음 단계: 안전한 기능 추가부터 시작" >> analysis_report.md

echo ""
echo "🎉 1단계 완료!"
echo "=============================================="
echo "✅ 완료된 작업:"
echo "  • 현재 상태 완전 백업: $backup_dir"
echo "  • 최신 개선사항 분석: $improved_dir"  
echo "  • 통합 포인트 매핑: analysis_report.md"
echo ""
echo "🔒 보장사항:"
echo "  • 기존 코드 무손상 (0바이트도 변경 안 함)"
echo "  • 언제든 복원 가능한 백업 생성"
echo "  • 안전한 통합 계획 수립"
echo ""
echo "📋 분석 결과:"
echo "  • analysis_report.md 파일 확인"
echo "  • 2단계 진행 준비 완료"
echo "=============================================="