# Render 배포 수정 가이드

## 문제 해결
Render에서 `/opt/render/project/src/dist/index.js` 파일을 찾을 수 없다는 오류 발생

## 해결책
Start Command를 다음으로 변경:
```
node server/production.js
```

## Render 설정 수정 단계

### 1. Render 대시보드 접속
- render.com → LogisticsTimer 서비스

### 2. Settings 수정
- Settings 탭 클릭
- "Start Command" 찾기
- 현재 값: `npm start` 
- 변경할 값: `node server/production.js`

### 3. Manual Deploy 실행
- "Manual Deploy" 버튼 클릭
- "Deploy latest commit" 선택

### 4. 배포 확인
- Logs에서 성공 메시지 확인
- URL 접속하여 작동 확인

이제 배포가 성공적으로 완료됩니다.