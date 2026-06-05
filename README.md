# Match Point

AWS Serverless 기반 멘토-멘티 매칭 및 멘토링 관리 플랫폼.

## Architecture

```
Frontend (Vanilla JS SPA)
    └── AWS API Gateway
            ├── auth_lambda              POST /auth/signup, POST /auth/login, GET /auth/me
            ├── mentoring-request-lambda POST /requests, GET /requests, PATCH /requests/{id}/cancel|complete
            ├── matching-lambda          GET /requests/{id}/candidates
            ├── assignment-lambda        POST /assignments, POST /assignments/{id}/approve|reject
            ├── mentor-profile-lambda    GET|PUT /mentors/{id}, PUT /mentors/{id}/fields|times|active
            │                            POST /mentors/{id}/verifications, PATCH /admin/verifications/{id}
            ├── schedule-lambda          POST /requests/{id}/schedule, PATCH /requests/{id}/schedule/link
            ├── consultation-recode-lambda POST /records, GET /records
            └── admin-lambda             GET /admin/requests|mentors, GET /admin/mentors/{id}/stats
```

**Storage:** DynamoDB (사용자/신청 데이터) · S3 (증빙 파일, Presigned URL 업로드)  
**Auth:** JWT (HS256, `Authorization: Bearer <token>`)

## Requirements

- Python 3.11+
- AWS Lambda + API Gateway (HTTP API v2)
- DynamoDB 테이블 2개 (`USERS_DB_NAME`, `REQUESTS_DB_NAME`)
- S3 버킷 (증빙 파일 업로드용)

## Setup

`.env.example`을 참고해 각 Lambda의 환경변수를 설정한다.

```
USERS_DB_NAME=<DynamoDB 사용자 테이블명>
REQUESTS_DB_NAME=<DynamoDB 신청 테이블명>
JWT_SECRET=<JWT 서명 키>
```

각 Lambda 디렉토리를 독립적으로 zip 패키징해 배포한다.

```bash
cd auth_lambda && zip -r ../auth_lambda.zip . && cd ..
```

## User Roles & Flow

| 역할 | 주요 기능 |
|------|-----------|
| **mentee** | 멘토링 신청, 일정 확인, 상담 기록 조회 |
| **mentor** | 배정 요청 승인/반려, 일정 등록, 상담 기록 작성, 전문 분야 증빙 업로드 |
| **admin** | 전체 신청 관리, 멘토 배정, 증빙 검토, 통계 대시보드 |

**신청 상태 흐름:**

```
PENDING → ASSIGNED → CONFIRMED → COMPLETED
              └→ REJECTED
PENDING → CANCELED
```

## Project Structure

```
├── index.html                        SPA 메인 페이지 (로그인·회원가입·앱 화면 통합)
├── landing.html                      서비스 소개 랜딩 페이지
├── app.js                            프론트엔드 전체 로직 (라우팅, API 호출, UI 렌더링)
├── .env.example                      환경변수 템플릿
├── auth_lambda/                      인증 (회원가입/로그인/JWT 발급)
├── mentoring-request-lambda/         멘토링 신청 CRUD
├── matching-lambda/                  멘토 후보 추천 (유사도 기반 매칭)
├── assignment-lambda/                멘토 배정·승인·반려
├── mentor-profile-lambda/            멘토 프로필·가용시간·증빙 관리
├── schedule-lambda/                  상담 일정 등록·수정·화상 링크
├── consultation-recode-lambda/       상담 기록 작성·조회
└── admin-lambda/                     관리자 대시보드·통계
```
