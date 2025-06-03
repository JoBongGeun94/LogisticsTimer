# Render 즉시 배포 단계

## 1단계: Render 접속
- render.com 방문
- "Get Started for Free" 클릭
- GitHub 계정으로 로그인

## 2단계: 웹 서비스 생성
- "New +" 버튼 클릭
- "Web Service" 선택
- "Connect a repository" 클릭
- JoBongGeun94/LogisticsTimer 선택
- "Connect" 버튼 클릭

## 3단계: 서비스 설정
```
Name: logistics-timer
Environment: Node
Region: 가장 가까운 지역 선택
Branch: main
Build Command: npm run build
Start Command: node server/production.js
```

## 4단계: 환경 변수 설정
Advanced 섹션에서 환경 변수 추가:
```
NODE_ENV = production
DATABASE_URL = postgresql://logistics-timer_owner:npg_H8UZJeYIuSO5@ep-icy-dew-a1keey0h-pooler.ap-southeast-1.aws.neon.tech/logistics-timer?sslmode=require
JWT_SECRET = 8apaqejlpoGoyust8bru2Ridrad220ap
SESSION_SECRET = trej9joph7chlspitOp6wuvotaXiyiwa
```

## 5단계: 배포 시작
- "Create Web Service" 클릭
- 자동 빌드 시작 (5-10분)
- 배포 완료 후 URL 제공

Render는 Railway와 달리 100% 무료이며 업그레이드 요구 없음