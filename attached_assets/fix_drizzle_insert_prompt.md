
# 🛠️ Drizzle ORM Insert 오류 ‑ 자동 수정 요청 프롬프트

```prompt
## 🔹 역할
당신은 Drizzle ORM·TypeScript·PostgreSQL을 전문으로 하는 **시니어 백엔드 엔지니어**입니다.  
아래 입력 자료를 바탕으로 **컴파일 오류를 근본적으로 수정**하고 **정상 빌드가 가능하도록 코드 패치**를 작성해야 합니다.

## 🔹 입력
1. **Vercel 빌드 로그 (전체)**  
   - `{{BUILD_LOG}}`

2. **테이블 스키마 정의 (Drizzle/TypeScript)**  
   - `{{SCHEMA_CODE}}`

3. **문제 발생 소스 코드**  
   - 파일 경로: `api/measurements/session/[sessionId].ts`  
   - 내용: `{{SOURCE_CODE}}`

## 🔹 수행 과제
1. 빌드 로그에서 `TS2769`, `TS18004` 등 오류 메시지를 추출·요약한다.  
2. 오류 메시지를 스키마와 대조하여 **모든 필수 컬럼 누락·타입 불일치·스코프 오류**를 식별한다.  
3. 원인을 **한 문장**으로 단호하게 진술한다.  
4. **수정 코드**를 제시한다.  
   - (a) 필수 필드 추가(`taskType`, `attemptNumber` 등)  
   - (b) 스코프 밖 변수 선언 또는 대체  
   - (c) 타입 불일치 해결  
5. **diff 패치** 또는 **전체 수정 파일**을 `Markdown 코드 블럭`으로 제공한다.  
6. 수정 사항이 빌드 단계에서 통과될 수 있도록 **추가 의존성·구성 변경**이 필요한지 점검하고 제안한다.  
7. 동일 오류 재발 방지를 위한 **간단한 CI 타입검사 지침**을 부록으로 제시한다.

## 🔹 출력 형식 (예시)
### 근본 원인
- `taskType`, `attemptNumber` 필드가 Insert 객체에 누락되어 타입 검사 실패.

### 패치 코드 (diff)
```diff
@@ await db.insert(measurementResults).values({
-  sessionId,
-  userId,
-  operatorName,
-  partId,
-  trialNumber,
-  partName,
-  timeInMs,
+  sessionId,
+  userId,
+  taskType: 'gage-timer',  // 필수
+  attemptNumber: 1,        // 필수
+  operatorName,
+  partId,
+  trialNumber,
+  partName,                // 변수 스코프 해결
+  timeInMs,
 })
```

### 빌드 통과 확인 절차
```bash
npm run typecheck
npm run build
```

### CI 방지책
- GitHub Actions 워크플로우에 `npm run typecheck` 단계 추가
```
