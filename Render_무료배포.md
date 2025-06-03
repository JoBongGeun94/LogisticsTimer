# Render 무료 배포 가이드

## Render 무료 플랜
- **완전 무료** (신용카드 불필요)
- 750시간/월 무료 실행
- 자동 SSL 인증서
- GitHub 자동 동기화

## 배포 실행

### 1. Render 계정 생성
- render.com 접속
- GitHub 계정으로 로그인

### 2. 웹 서비스 생성
- "New" → "Web Service"
- GitHub 저장소 연결: JoBongGeun94/LogisticsTimer
- "Connect" 클릭

### 3. 설정 구성
```
Name: logistics-timer
Environment: Node
Build Command: npm run build
Start Command: node server/production.js
```

### 4. 환경 변수 추가
Environment 섹션에서:
```
NODE_ENV=production
DATABASE_URL=postgresql://logistics-timer_owner:npg_H8UZJeYIuSO5@ep-icy-dew-a1keey0h-pooler.ap-southeast-1.aws.neon.tech/logistics-timer?sslmode=require
JWT_SECRET=8apaqejlpoGoyust8bru2Ridrad220ap
SESSION_SECRET=trej9joph7chlspitOp6wuvotaXiyiwa
```

### 5. 배포 시작
- "Create Web Service" 클릭
- 자동 빌드 및 배포

Render는 100% 무료이며 신용카드가 필요하지 않습니다.