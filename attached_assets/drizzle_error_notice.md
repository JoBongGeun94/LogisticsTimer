
# ❗ Drizzle ORM Insert 오류 – 상세 통보 자료 (로드맵·권고 제외)

## 1. 오류 재현 현황
- **동일 오류가 다시 발생**: `api/measurements/session/[sessionId].ts` 파일에서 인서트 객체가 테이블 스키마와 불일치하여 TypeScript 컴파일 실패.
- 빌드 로그 커밋 해시 `282fd7e`가 이전과 동일 → 수정 사항이 배포에 반영되지 않음.

---

## 2. 근본 원인 분석 (MECE)

| 대분류 | 세부 원인 | 설명 | 증거(로그) |
|--------|----------|------|------------|
| **A. 데이터-스키마 계약 불일치** | A1. **필수 컬럼 누락** | `taskType`, `attemptNumber` 필드가 인서트 객체에 없음 | TS2769 오류가 두 필드 부재를 명시 |
| | A2. **옵셔널 컬럼 오해** | 누락된 두 컬럼은 `NOT NULL`; `timestamp` 등만 옵션 | 스키마 정의 확인 |
| **B. 변수 정의·스코프 문제** | B1. **`partName` 미선언** | 객체 shorthand `{ partName }` 사용 시 동일 변수 필요 | TS18004 “no value exists in scope” |
| **C. API 시그니처 오용** | C1. **단일 객체 vs 배열 오버로드 혼선** | 필드 누락 → 1번 오버로드 실패 → 배열 오버로드 재시도 → 추가 오류 | TS2769 경로가 `values: … []` 오버로드 |
| **D. 스키마-타입 동기화 부재** | D1. **타입 재생성 누락** | `drizzle-kit generate` 미실행, 코드와 타입 정의 불일치 | 빌드 로그에 생성 단계 없음 |
| **E. 배포 파이프라인/버전 관리** | E1. **수정 커밋 미반영** | 동일 커밋 해시로 재배포 | 빌드 로그 해시 일치 |

---

## 3. 즉각적 수정 지침

### 3.1 코드 패치 예시
```ts
// api/measurements/session/[sessionId].ts
await db.insert(measurementResults).values({
  sessionId,
  userId,
  taskType: 'gage-timer',  // 필수 컬럼
  attemptNumber: 1,        // 필수 컬럼
  operatorName,
  partId,
  trialNumber,
  partName: req.body.partName as string, // 스코프 해결
  timeInMs,
});
```

### 3.2 스키마-타입 동기화
```bash
npx drizzle-kit generate
```

### 3.3 로컬 타입 검사 및 커밋
```bash
npm run typecheck      # 오류 0 확인
git add .
git commit -m "fix: add missing fields and partName scope"
git push origin main
```

### 3.4 재배포
- **커밋 해시가 변경**되어야 빌드 서버가 수정 코드를 가져옴.
