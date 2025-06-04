# 정밀 작업 시간 측정 & Gage R&R 분석 시스템 **백서 종합 개선안**  
*버전 1.1 제안 — 2025‑06‑02*

---

## 1. 개요 및 목적
본 문서는 기존 백서(버전 1.0)의 누락・취약 영역을 **MECE** 관점으로 전면 보완하여, 추가 피드백 없이 바로 개발・운영 표준으로 활용할 수 있도록 작성하였다.  
*프레임워크: ISO 9001, IATF 16949, OWASP ASVS v4, NIST SP 800‑53 Low, ITIL 4.*

---

## 2. 개선 항목 총괄표

| 영역 | 주요 개선 과제 | 상세 설명 (핵심 조치) | 우선순위 | 완료 정의 (Done Criteria) |
|------|---------------|----------------------|:--------:|-------------------------|
| **보안** | 인증·인가 강화 | • JWT + Refresh Token<br>• RBAC(읽기/쓰기/관리) 레이어 추가 | ★★★ | 모의 해킹 결과 P1 취약점 0건 |
|  | 전송/저장 암호화 | • TLS 1.3 강제<br>• AES‑256 at rest (DB, 백업) | ★★★ | Qualys SSL Rating A 이상 |
|  | 접근 로그·감사 | • 모든 API call auditing<br>• 30일 보존, 3‑축(사용자·IP·행동) | ★★☆ | 로그 누락률 < 0.1 % |
|  | 취약점 관리 | • 분기별 OWASP ZAP 스캔<br>• CVSS 7.0↑ 72h 내 패치 | ★★☆ | CVE backlog 0건 |
| **인프라** | 시스템 다이어그램 | • 클라이언트 → API GW → App (Stateless) → DB → Object Storage | ★★★ | 아키텍처 PNG 첨부 |
|  | IaC 관리 | • Terraform (Prod/Staging) + Ansible playbook | ★★☆ | PR‑based merge만 허용 |
|  | 성능 벤치마크 | • 200 VU 부하 시 p95 응답 < 300 ms | ★★★ | JMeter 리포트 포함 |
| **데이터 거버넌스** | 스키마 버전링 | • Liquibase 기반 DDL 이력화 | ★★☆ | changelog.xml 100 % 적용 |
|  | 보존 주기 | • 측정 RAW 3년, 분석 결과 5년 보관<br>• 만료 시 익명화 | ★★☆ | 정책 수립 · 공지 완료 |
| **예외·오류 처리** | SOP 확립 | • 네트워크 단절, 세션 만료, 업로드 실패 각 5단계 복구 절차 | ★★☆ | SOP v1.0 승인 |
| **품질 및 테스트** | TDD + E2E 자동화 | • Jest unit 80 %↑, Playwright 시나리오 12종 | ★★☆ | Pipeline green 기준 |
|  | GRR 알고리즘 검증 | • Minitab 결과 ±3 % 이내 오차 비교 | ★★★ | 검증 보고서 제출 |
| **운영·거버넌스** | 릴리스 노트·SemVer | • CHANGELOG.md 자동 생성(Git tag) | ★★☆ | v1.1 릴리스 시 적용 |
|  | SLA/SLO 정의 | • P0 버그 24h, P1 72h, 99.5 % 가용성 | ★★☆ | 모니터링 대시보드 구축 |
| **사용성(UX)** | 화면 캡처·튜토리얼 | • 핵심 플로우 GIF 5개·PDF 매뉴얼 | ★★☆ | 신규 교육 자료 배포 |
|  | 다국어 지원 | • i18n 라이브러리, 한/영 리소스 파일 | ★☆☆ | UI 전문 번역 완료 |
| **규정 준수** | 개인정보처리방침 | • GDPR Art.5, K‑PIPA 준수 명시 | ★★☆ | 법무 검토 OK |

---

## 3. 상세 개선 가이드

### 3.1 보안

1. **인증·인가**
   - OAuth 2.1 PKCE 흐름 + JWT Access 30 min / Refresh 7 day.
   - 관리자, 일반 사용자, 감사 전용 Read‑only Role 정의.
2. **암호화**
   - `POST /login` 포함 전 구간 TLS 1.3.
   - RDS TDE at‑rest, S3 SSE‑KMS.
3. **로깅·감사**
   - CloudTrail 형태: `timestamp|userId|ip|method|endpoint|status|latency`.
   - 30일 온사이트 보관 → 90일 Glacier 저비용.
4. **보안 테스트**
   - CI 파이프라인: `npm audit`, Dependabot.
   - 분기별 침투 테스트 보고서 이슈 트래킹.

### 3.2 인프라·아키텍처

- **시스템 다이어그램**  
  ![architecture](architecture_v1.1.png) <!-- PNG 파일 첨부 예정 -->
- **배포 파이프라인**  
  1. GitHub Actions → 2. Docker Build → 3. AWS ECR push → 4. ArgoCD Sync(K8s).  
- **성능 목표**  
  | 지표 | 목표 | 계측 도구 |
  |------|------|-----------|
  | p95 Latency | < 300 ms | k6 |
  | 에러율 | < 0.1 % | Sentry |
  | CPU 사용량 | < 70 % avg | Prometheus |

### 3.3 데이터 거버넌스

| 구분 | 보존 기간 | 보존 형태 | 파기 절차 |
|------|----------|----------|-----------|
| 원시 측정 데이터 | 3년 | RDS → Parquet S3 | 만료 시 익명화 후 삭제 로그 기록 |
| 분석 결과 | 5년 | S3 Versioned | 동등 절차 |
| 사용자 계정 | 1년 미접속 시 파기 | 암호화 해시 | GDPR Right to be Forgotten 처리 |

### 3.4 예외·오류 처리 SOP (요약)

| 단계 | 네트워크 단절 | 세션 만료 |
|------|---------------|-----------|
| **탐지** | fetch 실패 30 s 이상 | JWT 만료 or 401 |
| **알림** | Toast “연결 재시도” | modal “재로그인 필요” |
| **자동 복구** | 3·5·10 s back‑off 재시도 | Silent refresh 토큰 |
| **수동 복구** | “다시 시도” 버튼 | 로그인 화면 이동 |
| **로깅** | errorCode + stack | same |

### 3.5 테스트 전략

- **Unit**: 함수 단위, mock DB 사용, 커버리지 ≥ 80 %.
- **Integration**: 실제 RDS snapshot → LocalStack S3.
- **E2E**: Playwright, 시나리오 ①로그인 ②측정 ③GRR 분석 ④엑셀 다운로드.

### 3.6 운영·거버넌스

1. **SemVer 예시**  
   - `1.1.0`: 기능 추가, API 변경 無.  
   - `2.0.0`: Breaking Change.
2. **변경 로그 템플릿**  
   ```
   ## [1.1.0] - 2025-08-01
   ### Added
   - 다국어 지원
   ### Fixed
   - GRR 알고리즘 경계값 오류
   ```
3. **SLA / SLO**  
   - 응답 MTTA 30 min, MTTR 4 h.
   - 인시던트 SEV 1 : PagerDuty 즉시 호출.

### 3.7 규정 준수

- GDPR Art.13 통지 절차, K‑PIPA, 개인정보 적정성 평가 연 1회.  
- 제3국 전송(해외 SaaS) 시 SCC(표준계약조항) 별첨.

---

## 4. 구현 우선순위 로드맵 (1년)

| 분기 | 완료 모듈 | 산출물 |
|------|-----------|--------|
| **Q3‑25** | 보안 강화 모듈, 다이어그램, IaC | 보안 테스트 리포트 |
| **Q4‑25** | 성능 벤치마크, 테스트 자동화 | JMeter·Playwright 결과 |
| **Q1‑26** | UX 튜토리얼, 다국어 | 교육 PDF, GIF |
| **Q2‑26** | 데이터 거버넌스·SLA 완결 | 정책 문서, 대시보드 |

---

## 5. 첨부 파일 목록

1. `architecture_v1.1.png` : 시스템 구성도  
2. `CHANGELOG_template.md` : 릴리스 노트 템플릿  
3. `SOP_Error_Recovery_v1.0.pdf` : 예외 복구 절차  
4. `Security_Test_Report_Q3‑25.pdf` : 취약점 분석  
5. `Performance_Benchmark_JMeter_Q4‑25.csv` : 부하 테스트 결과

---

> **이 문서를 기준으로 개발·운영 절차를 준수하면,** ISO 9001·IATF 16949 감사 및 내부 품질 심사에서 ‘주요 미흡 사항 없음’ 판정을 받을 수 있습니다.
