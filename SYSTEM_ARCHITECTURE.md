# 정밀 작업 시간 측정 및 Gage R&R 분석 시스템 아키텍처

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   React     │  │ TypeScript  │  │ TailwindCSS │             │
│  │ Components  │  │   Types     │  │   Styling   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ TanStack    │  │   Recharts  │  │   Wouter    │             │
│  │   Query     │  │   Charts    │  │   Router    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Express   │  │    Vite     │  │   CORS      │             │
│  │   Server    │  │   Proxy     │  │  Middleware │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Replit Auth │  │ Session Mgmt│  │ Error       │             │
│  │ OpenID      │  │             │  │ Handling    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Database Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Business   │  │  Gage R&R   │  │ Statistics  │             │
│  │   Logic     │  │ Algorithms  │  │ Processing  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Timer     │  │  Excel      │  │ Performance │             │
│  │ Precision   │  │  Export     │  │ Monitoring  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ ORM (Drizzle)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ PostgreSQL  │  │   Schema    │  │   Session   │             │
│  │  Database   │  │ Management  │  │   Storage   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Work        │  │ Measurements│  │ Analysis    │             │
│  │ Sessions    │  │    Data     │  │  Results    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 상세 설명

### Client Layer (프론트엔드)
- **React 18**: 컴포넌트 기반 UI 구성
- **TypeScript**: 타입 안전성 보장
- **TailwindCSS**: 유틸리티 우선 스타일링
- **TanStack Query**: 서버 상태 관리 및 캐싱
- **Recharts**: 통계 차트 시각화
- **Wouter**: 경량 라우팅 라이브러리

### API Gateway Layer (미들웨어)
- **Express.js**: RESTful API 서버
- **Vite Proxy**: 개발 환경 API 프록시
- **Replit Auth**: OpenID Connect 인증
- **Session Management**: 세션 기반 상태 관리
- **CORS**: 교차 출처 리소스 공유 처리

### Application Layer (비즈니스 로직)
- **Timer Precision**: 0.01초 정밀도 시간 측정
- **Gage R&R Algorithms**: Minitab 호환 통계 계산
- **Statistics Processing**: 고급 통계 분석
- **Excel Export**: XLSX 형식 데이터 내보내기
- **Performance Monitoring**: 실시간 성능 추적

### Data Layer (데이터 저장소)
- **PostgreSQL**: 관계형 데이터베이스
- **Drizzle ORM**: 타입 안전 데이터베이스 접근
- **Schema Management**: 스키마 버전 관리
- **Session Storage**: 인증 세션 저장

## 데이터 플로우

```
User Action → React Component → TanStack Query → Express API → 
Business Logic → Drizzle ORM → PostgreSQL → Response Chain
```

## 보안 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Database      │
│                 │    │                 │    │                 │
│ • HTTPS Only    │◄──►│ • Session Auth  │◄──►│ • Connection    │
│ • CSP Headers   │    │ • CORS Policy   │    │   Encryption    │
│ • Input Valid.  │    │ • Rate Limiting │    │ • Data at Rest  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 성능 특성

| 메트릭 | 목표 값 | 현재 상태 |
|--------|---------|-----------|
| API 응답시간 (P95) | < 300ms | 모니터링 중 |
| 페이지 로드 시간 | < 2초 | 최적화됨 |
| 동시 사용자 | 200명 | 테스트 필요 |
| 데이터베이스 연결 | < 100ms | 안정적 |

## 확장성 고려사항

### 수평 확장 (Scale Out)
- Stateless 애플리케이션 설계
- 데이터베이스 연결 풀링
- 세션 외부 저장소 (PostgreSQL)

### 수직 확장 (Scale Up)  
- CPU 집약적 통계 계산 최적화
- 메모리 효율적 데이터 처리
- 데이터베이스 인덱스 최적화

## 배포 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ • Local DB      │    │ • Shared DB     │    │ • HA Database   │
│ • Hot Reload    │    │ • CI/CD Test    │    │ • Load Balancer │
│ • Debug Mode    │    │ • Perf Testing  │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 모니터링 및 로깅

```
Application Metrics → Performance Monitor → Console/Logs
       │
       ▼
Error Tracking → Browser Console → Development Tools
       │
       ▼  
User Actions → Analytics → Usage Statistics
```

## 기술 스택 버전

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 20+ | 런타임 환경 |
| React | 18+ | UI 프레임워크 |
| TypeScript | 5+ | 타입 시스템 |
| PostgreSQL | 14+ | 데이터베이스 |
| Express | 4+ | 웹 서버 |
| Vite | 5+ | 빌드 도구 |

## 보안 준수사항

- **인증**: OpenID Connect (Replit Auth)
- **권한**: 세션 기반 접근 제어  
- **암호화**: HTTPS 강제, 데이터베이스 연결 암호화
- **검증**: 입력 데이터 유효성 검사
- **로깅**: API 호출 및 에러 추적

## 성능 최적화

- **코드 분할**: 페이지별 번들 분리
- **캐싱**: TanStack Query 자동 캐싱
- **압축**: Gzip/Brotli 압축 활성화
- **최적화**: Tree shaking, 미사용 코드 제거

이 아키텍처는 현재 구현된 시스템의 실제 구조를 반영하며, 향후 확장성과 유지보수성을 고려한 설계입니다.