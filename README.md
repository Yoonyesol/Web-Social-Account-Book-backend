# 👨‍👨‍👦‍👦소셜 가계부 (Back-end)

## 👀 소개글

> `소셜 가계부`의 REST API 서버 레포지토리입니다.  
> `Node.js(Express)`와 `MongoDB(Mongoose)` 기반으로 구축했으며, 사용자 인증(`JWT`), 가계부 수입/지출 CRUD 및 통계 집계, 예산 기반 절약 챌린지 랭킹, 커뮤니티 게시판/댓글 기능을 제공합니다.

<br/>

## 🚖 서비스 & 관련 링크

- **서비스 링크**: https://social-account-book-frontend.vercel.app/
- **Front-end Repository**: https://github.com/Yoonyesol/Web-Social-Account-Book-frontend

#### 🔐 테스트 계정

- ID: `112@naver.com`
- PW: `qwer1234`

<br/>

## ⚙️ 기술 스택

### ✔️Back-end

<img src="https://img.shields.io/badge/nodedotjs-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"> <img src="https://img.shields.io/badge/express-000000?style=for-the-badge&logo=express&logoColor=white"> <img src="https://img.shields.io/badge/javascript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"> <img src="https://img.shields.io/badge/jsonwebtokens-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white">

### ✔️DB

<img src="https://img.shields.io/badge/mongodb-47A248?style=for-the-badge&logo=mongodb&logoColor=white"> <img src="https://img.shields.io/badge/mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white">

### ✔️Test & Deploy

<img src="https://img.shields.io/badge/jest-C21325?style=for-the-badge&logo=jest&logoColor=white"> <img src="https://img.shields.io/badge/koyeb-121212?style=for-the-badge&logo=koyeb&logoColor=white">

<br/>

## 📁 폴더 구조

관심사 분리(Separation of Concerns)를 위해 Express의 계층형 구조(`routes` - `middleware` - `controllers` - `models`)로 모듈화했습니다.

```text
Web-Social-Account-Book-backend/
├── app.js                 # Express 앱 설정, CORS/에러 미들웨어, DB 연결 및 서버 실행
├── routes/                # 도메인별 엔드포인트 매핑 및 인증 미들웨어 연결
│   ├── users-routes.js
│   ├── transactions-routes.js
│   ├── challenge-routes.js
│   ├── community-routes.js
│   └── comments-routes.js
├── middleware/            # 공통 검증 미들웨어
│   └── check-auth.js      # JWT 검증 및 req.userData 바인딩
├── controllers/           # 도메인별 비즈니스 로직 및 DB 연산 처리
│   ├── user-controller.js
│   ├── budget-controller.js
│   ├── transactions-controller.js
│   ├── challenge-controller.js
│   ├── community-controller.js
│   └── comment-controller.js
├── models/                # Mongoose 스키마 및 커스텀 에러 모델
│   ├── user.js
│   ├── transaction.js
│   ├── challenge.js
│   ├── community.js
│   ├── comment.js
│   ├── counter.js
│   └── http-error.js
├── test/                  # Jest + Supertest + mongodb-memory-server 통합 테스트
│   ├── cors.test.js
│   └── users.test.js
└── docs/                  # 트러블슈팅 및 테스트 가이드 문서
    ├── cors-troubleshooting.md
    └── testing-guide.md
```

<br/>

## 🛠️ 핵심 구현 포인트 & 트러블슈팅

### 1. Mongoose Session 기반 다중 도큐먼트 트랜잭션

- MongoDB는 RDBMS와 달리 외래키 제약조건을 DB 엔진 차원에서 강제하지 않습니다.
- 가계부 내역/게시글/댓글을 생성하거나 삭제할 때 `User` 도큐먼트의 참조 배열도 함께 갱신되어야 하므로, `mongoose.startSession()`과 `startTransaction()`을 적용해 **두 컬렉션의 작업이 원자적으로 커밋되거나 실패 시 롤백**되도록 데이터 정합성을 보장했습니다.

### 2. JWT 인증 및 본인 인가 검증

- `bcryptjs`로 비밀번호를 단방향 해싱 저장하고, 로그인 시 `jsonwebtoken`으로 서명된 토큰을 발급합니다.
- `middleware/check-auth.js`에서 `Authorization: Bearer <token>` 헤더를 검증해 `req.userData.userId`를 주입하며, 수정/삭제 요청 시 작성자 ID와 대조해 타인의 데이터 조작을 차단합니다.

### 3. CORS 프리플라이트(`OPTIONS`) 트러블슈팅

- `Authorization` 헤더와 `PATCH`/`DELETE` 메서드 사용 시 브라우저가 보내는 `OPTIONS` 프리플라이트 요청이 404로 떨어지며 CORS 차단이 발생하던 문제를 분석하고, `cors` 미들웨어 도입을 통해 `204 No Content` 응답 및 화이트리스트 제어로 해결했습니다.
- 👉 상세 기록: [`docs/cors-troubleshooting.md`](./docs/cors-troubleshooting.md)

### 4. 인메모리 DB 기반 통합 테스트 환경 구축

- 실제 운영 DB(MongoDB Atlas)를 오염시키지 않고 API를 검증하기 위해 `Jest` + `Supertest` + `mongodb-memory-server` 기반의 격리된 테스트 환경을 구축했습니다.
- `app.js`에서 앱 정의와 서버 기동(`require.main === module`)을 분리하여 CORS 프리플라이트 및 회원가입/로그인/JWT 미들웨어 흐름(14개 케이스)을 자동 검증합니다.
- 👉 상세 기록: [`docs/testing-guide.md`](./docs/testing-guide.md)

<br/>

## 🚀 실행 및 테스트 방법

### 1. 환경 변수 설정 (`.env`)

프로젝트 루트에 `.env` 파일을 생성하고 아래 값을 설정합니다.

```env
MONGO_URI=your_mongodb_connection_string
JWT_KEY=your_jwt_secret_key
FRONT_END_URL=http://localhost:5173
```

### 2. 의존성 설치 및 서버 실행

```bash
npm install

# 개발 모드 실행 (nodemon)
npm run dev

# 일반 실행
npm start
```

### 3. 테스트 실행

> `mongodb-memory-server`를 사용하므로 별도의 `.env`나 외부 DB 연결 없이 바로 실행할 수 있습니다.

```bash
npm test
```

<br/>

## 🔗 블로그

개발 기록을 남긴 블로그 링크: https://florescene.tistory.com/category/%EC%9B%B9%20%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8/%F0%9F%91%A8%E2%80%8D%F0%9F%91%A8%E2%80%8D%F0%9F%91%A7%E2%80%8D%F0%9F%91%A7%EC%86%8C%EC%85%9C%20%EA%B0%80%EA%B3%84%EB%B6%80?page=4

<br/>

## 🙋‍♀️ 배운 점

- 프론트엔드에서 요청을 보내기만 하던 입장에서 직접 `Express`와 `MongoDB`로 API 서버를 설계해 보며, **클라이언트-서버 간 HTTP 통신 흐름과 데이터 정합성 관리**를 깊이 이해할 수 있었습니다.
- NoSQL 환경에서 컬렉션 간 참조 관계(`ObjectId`, `ref`, `populate`)를 다루고, 다중 도큐먼트 작업에 **Mongoose Session 트랜잭션**을 적용하며 데이터 무결성의 중요성을 체감했습니다.
- `CORS` 프리플라이트(`OPTIONS`) 동작 원리를 브라우저 네트워크 관점에서 직접 파고들어 해결하고, `mongodb-memory-server`로 독립된 테스트 환경을 구축하며 **안정적인 백엔드 운영과 검증 방법**을 익혔습니다.

<br/>

## 🚩 개선점 (추후 고도화 예정)

- [x] CORS 프리플라이트(`OPTIONS`) 미들웨어 처리 및 트러블슈팅 문서화
- [x] Jest + Supertest + `mongodb-memory-server` 통합 테스트 환경 구축
- [ ] 민감 개인 금융 조회 API(가계부/예산) `checkAuth` 인증 및 본인 인가 검증 강화
- [ ] 가계부/게시글/댓글 생성 시 `req.body` 대신 검증된 `req.userData.userId` 바인딩 적용
- [ ] Redis 도입을 통한 Refresh Token 저장, 로그아웃 Access Token 블랙리스트 및 챌린지 랭킹 캐싱
- [ ] 최근 1년 월별 지출 조회(`getLatestYearExpenses`) 및 챌린지 랭킹 쿼리를 단일 MongoDB Aggregation Pipeline으로 최적화
- [ ] 게시판 조회수 원자적 증가(`$inc`) 및 페이지네이션 도입
