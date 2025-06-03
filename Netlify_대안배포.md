# Netlify 대안 배포

## Netlify 무료 배포
Render에서 문제가 지속되면 Netlify를 사용하세요.

### 배포 단계
1. **netlify.com** 접속 → GitHub 로그인
2. **"Add new site" → "Import an existing project"**
3. **GitHub 저장소** JoBongGeun94/LogisticsTimer 선택
4. **빌드 설정:**
   ```
   Build command: npm run build
   Publish directory: dist
   ```
5. **환경 변수 설정:**
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://logistics-timer_owner:npg_H8UZJeYIuSO5@ep-icy-dew-a1keey0h-pooler.ap-southeast-1.aws.neon.tech/logistics-timer?sslmode=require
   JWT_SECRET=8apaqejlpoGoyust8bru2Ridrad220ap
   SESSION_SECRET=trej9joph7chlspitOp6wuvotaXiyiwa
   ```

### 장점
- 100% 무료
- 자동 SSL
- CDN 포함
- GitHub 자동 동기화

Netlify는 정적 사이트에 최적화되어 있어 안정적입니다.