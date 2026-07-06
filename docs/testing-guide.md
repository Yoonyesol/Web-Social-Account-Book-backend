# 백엔드 테스트 가이드

## 1. 개요

이 프로젝트에는 테스트 프레임워크가 전혀 구성되어 있지 않았기 때문에, 아래 스택을 새로 도입했다.

| 구성 요소 | 역할 |
| --- | --- |
| [Jest](https://jestjs.io/) | 테스트 러너/assertion 라이브러리 |
| [Supertest](https://github.com/ladjs/supertest) | Express 앱에 실제 HTTP 요청을 보내고 응답을 검증 |
| [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server) | 테스트 전용 인메모리 MongoDB 인스턴스. 실제 `MONGO_URI`(Atlas)에 연결하지 않음 |

지금 작성한 테스트 범위는 최근 작업한 **CORS 설정**과 **인증(회원가입/로그인/JWT 미들웨어) 흐름**이다. `transactions`, `community`, `challenge`, `comment` 컨트롤러는 아직 커버하지 않는다 (5장 참고).

## 2. 변경된 파일

- `app.js` — `mongoose.connect(...).then(() => app.listen(5000))` 부분을 `if (require.main === module) { ... }`로 감쌌다. 이렇게 해야 테스트 코드가 `require("../app")`으로 앱만 가져다 쓸 때 실제 DB 연결/서버 기동 없이 Express 앱 인스턴스만 사용할 수 있다. `node app.js`로 직접 실행할 때(즉 `npm start`/`npm run dev`)는 기존과 동일하게 동작한다.
- `package.json`
  - `devDependencies`에 `jest`, `supertest`, `mongodb-memory-server` 추가.
  - `scripts.test`를 `jest --runInBand`로 변경 (`--runInBand`: 테스트 파일을 병렬이 아닌 순차 실행 — 인메모리 mongod 프로세스를 여러 개 동시에 띄우는 부담을 줄이기 위함).
  - `scripts["test:watch"]` 추가 (`jest --runInBand --watch`).
  - `jest` 설정 필드 추가: `testEnvironment: "node"`, `testTimeout: 30000` (mongod 부팅 시간을 고려해 기본 5초보다 넉넉하게 설정).
- `test/cors.test.js` — CORS 미들웨어 동작 검증.
- `test/users.test.js` — 회원가입/로그인/인증 미들웨어 흐름 검증.

## 3. 실행 방법

### 3.1 최초 1회

```bash
cd Web-Social-Account-Book-backend
npm install
```

`mongodb-memory-server`는 최초 실행 시 로컬에 MongoDB 바이너리가 캐시되어 있지 않으면 인터넷에서 내려받는다(수십 MB, 첫 실행만 다소 느릴 수 있음). 이후 실행부터는 캐시를 재사용해 빠르게 뜬다.

### 3.2 전체 테스트 실행

```bash
npm test
```

정상적으로 통과하면 다음과 유사한 결과가 출력된다.

```
Test Suites: 2 passed, 2 total
Tests:       14 passed, 14 total
```

### 3.3 파일 하나만 실행

```bash
npx jest test/cors.test.js
npx jest test/users.test.js
```

### 3.4 이름으로 특정 테스트(케이스)만 실행

```bash
npx jest -t "프리플라이트"
```

### 3.5 변경 감지 후 자동 재실행 (개발 중)

```bash
npm run test:watch
```

## 4. 무엇을 검증하는지

### 4.1 `test/cors.test.js` — CORS 설정

| 테스트 | 검증 내용 |
| --- | --- |
| 인증이 필요한 라우트의 OPTIONS 프리플라이트 | `/api/users/likedPosts`(인증 필요 라우트)에 `OPTIONS`로 프리플라이트를 보내면 **204**로 즉시 응답하고, `Access-Control-Allow-Origin`/`-Methods`/`-Headers`가 올바르게 설정되는지 확인. 수정 전에는 이 요청이 404로 응답돼 브라우저가 프리플라이트 실패로 판단했던 부분이다. |
| 일반 요청의 CORS 헤더 | `GET /api/users` 같은 일반 요청 응답에도 `Access-Control-Allow-Origin`이 `FRONT_END_URL` 값으로 붙는지 확인. |
| 허용되지 않은 origin | `Origin: http://evil.example.com`으로 요청해도 응답 헤더의 `Access-Control-Allow-Origin`은 여전히 서버에 설정된 `FRONT_END_URL` 값이며, 요청 Origin이 그대로 반사(echo)되지 않는지 확인. |
| 허용되지 않은 메서드 | `PUT`에 대한 프리플라이트 요청 시 `Access-Control-Allow-Methods`에 `PUT`이 포함되지 않는지 확인(설정한 메서드 화이트리스트가 실제로 적용되는지). |

### 4.2 `test/users.test.js` — 인증 흐름

| 테스트 | 검증 내용 |
| --- | --- |
| 회원가입 성공 | 유효한 이름/이메일/비밀번호로 가입 시 `201` + `userInfo` + `token` 반환. |
| 이메일 중복 | 동일 이메일로 재가입 시 `422`. |
| 비밀번호 길이 검증 | 6자 미만 비밀번호 시 `422` (express-validator 규칙). |
| 이메일 형식 검증 | 이메일 형식이 아니면 `422`. |
| 로그인 성공 | 올바른 이메일/비밀번호 시 `200` + `token`. |
| 로그인 실패 - 비밀번호 불일치 | `401`. |
| 로그인 실패 - 존재하지 않는 이메일 | `401`. |
| 인증 미들웨어 - 토큰 없음 | 보호된 라우트(`GET /api/users/likedPosts`) 호출 시 토큰이 없으면 `401`. |
| 인증 미들웨어 - 유효하지 않은 토큰 | 형식은 있으나 서명이 잘못된 토큰이면 `401`. |
| 인증 미들웨어 - 정상 토큰 | 회원가입으로 발급받은 토큰으로 요청하면 `200` + `likedPosts: []`. |

## 5. 동작 원리 / 설계 이유

- **실제 DB를 건드리지 않음**: 각 테스트 파일은 `beforeAll`에서 `MongoMemoryServer.create()`로 임시 MongoDB를 메모리에 띄우고, `mongoose.connect(mongoServer.getUri())`로 연결한다. 컨트롤러들은 `mongoose.model(...)`로 등록된 모델을 통해 mongoose의 **기본 커넥션**을 그대로 사용하므로, 테스트 파일에서 별도로 연결만 맺어주면 `app.js`의 컨트롤러 코드를 전혀 수정하지 않고도 격리된 DB에서 테스트할 수 있다. 테스트가 끝나면 `afterAll`에서 연결을 끊고 메모리 서버를 종료한다.
- **테스트 간 데이터 격리**: `users.test.js`는 `afterEach`에서 모든 컬렉션을 비워, 이전 테스트에서 만든 유저가 다음 테스트에 영향을 주지 않게 한다.
- **`FRONT_END_URL`/`JWT_KEY` 환경변수**: 테스트 파일 상단에서 `process.env.FRONT_END_URL`, `process.env.JWT_KEY`에 값이 없을 때만 기본값을 채워 넣는다(`||=` 대신 `||`로 처리). 로컬에 `.env`가 이미 로드되어 있으면 그 값을 존중하고, CI처럼 `.env`가 없는 환경에서도 테스트가 동작하도록 하기 위함이다.
- **`--runInBand`**: mongodb-memory-server는 테스트 파일마다 별도의 mongod 프로세스를 띄운다. 파일이 많아질수록 동시에 여러 mongod가 뜨는 부담이 커지므로, 우선은 순차 실행으로 안전하게 구성했다. 테스트 파일이 늘어나고 속도가 문제가 되면 이 옵션을 재검토할 수 있다.

## 6. 아직 다루지 않은 범위 (다음 단계)

이번에는 CORS + 인증 흐름만 범위로 잡았다. 나머지 컨트롤러(`transactions`, `community`, `comment`, `challenge`, `budget`)에 대한 테스트가 필요해지면, `test/users.test.js`와 동일한 패턴(같은 `beforeAll`/`afterEach`/`afterAll` 셋업 + `supertest(app)`)으로 파일만 추가하면 된다. 다만 이 컨트롤러들은 로그인해서 얻은 JWT를 `Authorization` 헤더에 실어 보내야 하는 라우트가 많으므로, 테스트 상단에서 회원가입 후 토큰을 발급받는 헬퍼(`beforeEach`에서 signup → token 저장)를 공통화하는 것을 권장한다.
