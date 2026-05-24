# Mentoring Matching System — Backend (V1)

KMU Cloud 시나리오 5 멘토링 매칭 및 상담 기록 시스템의 V1 백엔드.

## 특징

- Node.js 20 + Express
- 단일 EC2 프로세스에서 동작하는 RESTful API
- **데이터 저장은 In-memory store** (V1 데모 단계). 추후 RDS/MySQL 등으로 교체할 수 있도록 `repositories/` 레이어로 분리됨
- S3 presigned URL 기반 첨부 파일 업로드/다운로드 (S3 미설정 시 mock URL 반환)
- JWT 단일 토큰 인증 + 역할 기반 인가(MENTEE/MENTOR/ADMIN)

## 빠른 시작

```bash
cd backend
cp .env.example .env       # JWT_SECRET 등 채우기
npm install
npm start                  # http://localhost:3000
```

서버 기동 시 `.env` 의 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 가 있으면 ADMIN 계정이 자동 생성됨.

헬스체크: `GET /healthz`

## 디렉토리 구조

```
backend/
├── src/
│   ├── app.js                # Express 앱 구성
│   ├── server.js             # 부트스트랩
│   ├── config/env.js         # 환경 변수 (zod 검증)
│   ├── domain/               # 에러/상태머신/역할 enum
│   ├── middlewares/          # 인증/인가/검증/에러 처리
│   ├── routes/               # HTTP 라우트
│   ├── controllers/          # 요청-응답 어댑터
│   ├── services/             # 도메인 로직
│   ├── repositories/         # ★ 데이터 접근 (현재 in-memory)
│   ├── schemas/              # zod 입력 스키마
│   └── store/memoryStore.js  # ★ 인메모리 저장소
└── package.json
```

> **DB 로 교체할 때**: `repositories/*` 의 함수 시그니처를 유지한 채 내부 구현만 mysql2 쿼리로 바꾸면 된다.
> `services/*` 는 repository 만 호출하므로 수정이 거의 없다.
> 트랜잭션이 필요한 작업(배정/승인/반려/기록 작성) 은 `withTransaction(pool, async (conn) => { ... })` 헬퍼로 감싸는 형태로 발전시킬 수 있다.

## API 한눈에 보기

### Auth
| Method | Path                  | 권한    | 설명 |
|--------|-----------------------|---------|------|
| POST   | `/auth/register`      | Public  | 멘티/멘토 가입 |
| POST   | `/auth/login`         | Public  | JWT 발급 |
| GET    | `/auth/me`            | *       | 토큰의 사용자 정보 |

### Mentor (본인)
| Method | Path                          | 권한    |
|--------|-------------------------------|---------|
| POST   | `/mentors/me`                 | MENTOR  |
| GET    | `/mentors/me`                 | MENTOR  |
| PATCH  | `/mentors/me`                 | MENTOR  |
| GET    | `/mentors/me/assignments`     | MENTOR  |

### Mentee
| Method | Path                          | 권한    | 설명 |
|--------|-------------------------------|---------|------|
| POST   | `/applications`               | MENTEE  | 멘토링 신청 |
| GET    | `/applications`               | MENTEE  | 본인 신청 목록 |
| GET    | `/applications/:id`           | *       | 단건(권한 검증) |
| DELETE | `/applications/:id`           | MENTEE  | SUBMITTED 신청 취소 |
| GET    | `/me/records`                 | MENTEE  | 본인 상담 기록 |

### Mentor 결정
| Method | Path                          | 권한    | 본문 |
|--------|-------------------------------|---------|------|
| POST   | `/assignments/:id/approve`    | MENTOR  | `{ scheduled_at }` |
| POST   | `/assignments/:id/reject`     | MENTOR  | `{ reject_reason }` |

### Records
| Method | Path                                | 권한 |
|--------|-------------------------------------|------|
| POST   | `/applications/:id/record`          | MENTOR (배정자만) |
| GET    | `/applications/:id/record`          | * (소유자/배정자/ADMIN) |

### Admin
| Method | Path                                              |
|--------|---------------------------------------------------|
| GET    | `/admin/mentors`                                  |
| GET    | `/admin/mentors/stats`                            |
| PATCH  | `/admin/mentors/:id/active`                       |
| GET    | `/admin/applications?status=`                     |
| GET    | `/admin/applications/:id/candidates`              |
| POST   | `/admin/applications/:id/assign`                  |
| GET    | `/admin/mentees/:id/applications`                 |
| GET    | `/admin/records`                                  |

### Files
| Method | Path                  |
|--------|-----------------------|
| POST   | `/files/upload-url`   |
| GET    | `/files/url/<key>`    |

## 상태 전이

```
SUBMITTED ──(admin assign)──▶ UNDER_REVIEW ──(mentor approve)──▶ SCHEDULED ──(record)──▶ COMPLETED
SUBMITTED ──(mentee cancel)──▶ CANCELLED
UNDER_REVIEW ──(mentor reject)──▶ SUBMITTED
UNDER_REVIEW ──(admin re-assign)──▶ UNDER_REVIEW
```

## 통합 시나리오 예시 (curl)

```bash
# 1. 회원 가입
curl -sX POST localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"mentee@example.com","password":"pw_12345","role":"MENTEE","name":"민수"}'

curl -sX POST localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"mentor@example.com","password":"pw_12345","role":"MENTOR","name":"박교수"}'

# 2. 로그인 → 토큰 획득
TOKEN_MENTEE=$(curl -sX POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"mentee@example.com","password":"pw_12345"}' | jq -r .token)
TOKEN_MENTOR=$(curl -sX POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"mentor@example.com","password":"pw_12345"}' | jq -r .token)
TOKEN_ADMIN=$(curl -sX POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"admin1234"}' | jq -r .token)

# 3. 멘토 프로필 등록
curl -sX POST localhost:3000/mentors/me -H "authorization: Bearer $TOKEN_MENTOR" \
  -H 'content-type: application/json' \
  -d '{"major":"CS","fields":["AI"],"availabilities":[{"start_at":"2030-01-01T10:00:00Z","end_at":"2030-01-01T18:00:00Z"}]}'

# 4. 멘티 신청
APP=$(curl -sX POST localhost:3000/applications -H "authorization: Bearer $TOKEN_MENTEE" \
  -H 'content-type: application/json' \
  -d '{"interest_field":"AI","topic":"진로 상담","desired_at":"2030-01-01T14:00:00Z"}')
APP_ID=$(echo $APP | jq -r .id)

# 5. 운영자 후보 조회 + 배정
curl -s -H "authorization: Bearer $TOKEN_ADMIN" \
  localhost:3000/admin/applications/$APP_ID/candidates
ASSIGN=$(curl -sX POST localhost:3000/admin/applications/$APP_ID/assign \
  -H "authorization: Bearer $TOKEN_ADMIN" -H 'content-type: application/json' \
  -d '{"mentor_id":1}')
ASSIGN_ID=$(echo $ASSIGN | jq -r .id)

# 6. 멘토 승인
curl -sX POST localhost:3000/assignments/$ASSIGN_ID/approve \
  -H "authorization: Bearer $TOKEN_MENTOR" -H 'content-type: application/json' \
  -d '{"scheduled_at":"2030-01-01T14:00:00Z"}'

# 7. 멘토 상담 기록 작성 (status -> COMPLETED)
curl -sX POST localhost:3000/applications/$APP_ID/record \
  -H "authorization: Bearer $TOKEN_MENTOR" -H 'content-type: application/json' \
  -d '{"summary":"AI 진로에 대해 상담함","needs_next_consultation":true}'

# 8. 멘티가 상담 기록 조회
curl -s -H "authorization: Bearer $TOKEN_MENTEE" localhost:3000/me/records
```

## EC2 배포 메모

1. AL2023 / Ubuntu 22.04 인스턴스에 Node.js 20 설치
2. 코드 업로드 후 `npm install --omit=dev`
3. `.env` 작성 — JWT_SECRET, S3_BUCKET, AWS_REGION 등
4. `pm2 start src/server.js --name mentoring-api` 또는 systemd unit 으로 기동
5. 보안 그룹: 80/443 인바운드(또는 ALB), DB 보안 그룹은 EC2 SG 만 허용
6. S3 버킷은 비공개 + EC2 IAM Role 에 `s3:PutObject`, `s3:GetObject` 권한 부여

## 다음 단계 (V2 후보)

- in-memory store → RDS for MySQL 로 교체 (`repositories/*` 만 변경)
- 트랜잭션 헬퍼 도입 (배정/승인/반려/기록 작성)
- presigned URL 권한 검증 강화 (key prefix 기반 소유권 검증)
- 로그인 세션 관리, 리프레시 토큰
- ALB + Auto Scaling, RDS Multi-AZ, CloudWatch 통합
