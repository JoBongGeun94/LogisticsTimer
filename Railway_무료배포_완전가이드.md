# Railway 무료 배포 완전 가이드

## Railway 무료 플랜 정보
- **월 $5 크레딧 무료 제공**
- **슬립 모드 없음** (Vercel과 다름)
- **업그레이드 불필요**
- **GitHub 연동 자동**

## 무료 배포 실행 단계

### 1. Railway 계정 생성 (무료)
- railway.app 접속
- "Start a New Project" 클릭
- GitHub 계정으로 로그인 (무료)

### 2. GitHub 저장소 연결
- "Deploy from GitHub repo" 선택
- JoBongGeun94/LogisticsTimer 저장소 선택
- "Deploy" 버튼 클릭

### 3. 환경 변수 설정
Variables 섹션에 입력:
```
NODE_ENV=production
DATABASE_URL=postgresql://logistics-timer_owner:npg_H8UZJeYIuSO5@ep-icy-dew-a1keey0h-pooler.ap-southeast-1.aws.neon.tech/logistics-timer?sslmode=require
JWT_SECRET=8apaqejlpoGoyust8bru2Ridrad220ap
SESSION_SECRET=trej9joph7chlspitOp6wuvotaXiyiwa
```

### 4. 자동 빌드 및 배포
- Railway가 자동으로 빌드 시작
- 3-5분 후 배포 완료

### 5. 도메인 생성 (무료)
- Settings → "Generate Domain"
- *.railway.app 도메인 자동 생성

## 무료 한도
- 월 $5 크레딧 (소규모 앱에 충분)
- 500시간 실행 시간
- 1GB RAM
- 1GB 디스크

**결론: 유료 업그레이드 없이 완전 무료로 배포 가능합니다.**