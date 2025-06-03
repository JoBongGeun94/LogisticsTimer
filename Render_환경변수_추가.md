# Render 환경 변수 추가

## 누락된 환경 변수
Render 배포에서 다음 환경 변수가 필요합니다:

### 추가할 환경 변수
```
REPL_ID=logistics-timer-app
REPLIT_DOMAINS=logisticstimer.onrender.com
```

## Render 대시보드에서 추가 방법

1. **render.com** → LogisticsTimer 서비스
2. **Environment** 탭 클릭
3. **Add Environment Variable** 버튼
4. 다음 두 개 변수 추가:

### 첫 번째 변수
- Key: `REPL_ID`
- Value: `logistics-timer-app`

### 두 번째 변수
- Key: `REPLIT_DOMAINS`
- Value: `logisticstimer.onrender.com`

5. **Save Changes** 클릭
6. **Manual Deploy** 실행

이 환경 변수들이 추가되면 "clientId must be a non-empty string" 오류가 해결됩니다.