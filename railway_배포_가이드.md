# Railway 배포 완전 가이드

## Railway 장점
- $5 무료 크레딧 제공
- 슬립 모드 없음 (항상 활성)
- PostgreSQL 데이터베이스 통합 제공
- GitHub 자동 동기화
- 커스텀 도메인 무료

## 즉시 실행 단계

### 1단계: Railway 계정 생성 (2분)
1. railway.app 접속
2. "Start a New Project" 클릭
3. GitHub 계정으로 로그인
4. 권한 승인

### 2단계: 프로젝트 배포 (3분)
1. "Deploy from GitHub repo" 선택
2. "JoBongGeun94/LogisticsTimer" 저장소 선택
3. "Deploy Now" 클릭
4. 자동 빌드 시작 대기

### 3단계: 환경 변수 설정 (5분)
Variables 탭에서 다음 추가:
```
NODE_ENV=production
JWT_SECRET=[32자 이상 보안키 필요]
SESSION_SECRET=[세션 보안키 필요]
DATABASE_URL=[Neon 데이터베이스 URL 필요]
```

### 4단계: PostgreSQL 데이터베이스 (선택사항)
1. "Add Plugin" 클릭
2. "PostgreSQL" 선택
3. 자동 DATABASE_URL 생성
4. 기존 Neon 대신 사용 가능

### 5단계: 도메인 설정
1. Settings 탭
2. "Generate Domain" 클릭
3. https://[앱이름].up.railway.app URL 생성

## 필요한 환경 변수

배포 완료를 위해 다음 정보를 제공해주세요:

1. **JWT_SECRET**: 32자 이상의 암호화 키
2. **SESSION_SECRET**: 세션 보안 키  
3. **DATABASE_URL**: Neon PostgreSQL 연결 문자열

또는 Railway 내장 PostgreSQL 사용을 원하시면 DATABASE_URL은 자동 생성됩니다.

이 정보들을 제공해주시면 즉시 배포를 완료하겠습니다.