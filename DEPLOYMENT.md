
# 배포 가이드

이 프로젝트는 **Render**와 **Replit** 두 플랫폼 모두에서 배포 가능하도록 최적화되어 있습니다.

## 🌐 Render 배포

### 자동 배포 (권장)
1. **Render 대시보드**에서 "New Static Site" 선택
2. **GitHub 연결** 후 이 레포지토리 선택
3. **설정**:
   - **Name**: `logistics-timer`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
   - **Auto-Deploy**: `Yes` (main 브랜치 자동 배포)

### 수동 설정
- `render.yaml` 파일이 이미 구성되어 있어 별도 설정 불필요
- 커스텀 도메인, 헤더 최적화, 캐시 정책 포함

## ⚡ Replit 배포

### 현재 환경에서 배포
1. **Deploy 버튼** 클릭 (우상단)
2. **Static Site** 선택
3. **빌드 설정**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Domain: `<your-app-name>.replit.app`

### 특징
- 개발과 배포가 동일 환경
- 즉시 배포 가능
- 무료 Static 배포 지원

## 🔄 개발 워크플로우

### Replit에서 개발
```bash
npm run dev          # 개발 서버 (포트 5173)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기 (포트 4173)
```

### GitHub Actions
- **main 브랜치 푸시** 시 자동으로 빌드 검증
- **Render** 자동 배포 트리거
- **타입 체크, 린트, 빌드** 검증 포함

## 📋 배포 체크리스트

- [x] TypeScript 타입 오류 없음
- [x] ESLint 경고 없음  
- [x] 빌드 성공
- [x] 모바일 반응형 테스트
- [x] 다크모드 정상 작동
- [x] 키보드 단축키 동작
- [x] 데이터 내보내기 기능

## 🌍 배포된 URL

- **Replit**: `https://<your-repl-name>.replit.app`
- **Render**: `https://logistics-timer.onrender.com` (설정에 따라 변경)

두 플랫폼 모두 동일한 기능을 제공하며, 용도에 따라 선택하여 사용할 수 있습니다.
