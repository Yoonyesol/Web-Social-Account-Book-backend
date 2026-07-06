# CORS 에러 트러블슈팅 (프론트-백엔드 연동)

## 1. 문제 상황

백엔드에서 JWT 기반 인증(`Authorization: Bearer <token>`)을 사용하는 라우트를 프론트엔드에서 호출할 때, 브라우저 콘솔에 아래와 유사한 CORS 에러가 발생했다.

```
Access to XMLHttpRequest at 'http://localhost:5000/api/users/likedPosts' from origin 'http://localhost:3000'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check.
```

또는 네트워크 탭에서 `OPTIONS` 요청이 `404 Not Found`로 응답되는 것을 확인할 수 있었다.

## 2. 원인 분석

### 2.1 기존 코드

수정 전 `app.js`는 CORS를 별도 패키지 없이 응답 헤더를 직접 설정하는 방식으로 처리하고 있었다.

```js
// 수정 전
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONT_END_URL);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/transactions", transactionsRoutes);
app.use("/api/users", userRoutes);
// ...

app.use((req, res, next) => {
  throw new HttpError("라우트를 찾지 못했습니다.", 404);
});
```

각 라우터(`routes/*.js`)는 `router.get()`, `router.post()`, `router.patch()`, `router.delete()`만 등록되어 있고, **`OPTIONS` 메서드에 대한 핸들러는 어디에도 등록되어 있지 않았다.**

### 2.2 프리플라이트(Preflight) 요청이란

브라우저는 다음 조건 중 하나라도 해당하는 요청을 "단순 요청(simple request)"이 아닌 것으로 간주하고, 실제 요청을 보내기 전에 `OPTIONS` 메서드로 먼저 서버에 "이 요청을 보내도 되는지" 확인하는 프리플라이트 요청을 자동으로 보낸다.

- `GET`, `POST`, `HEAD` 외의 메서드 사용 (`PATCH`, `DELETE` 등)
- `Authorization`, 커스텀 헤더 등 단순 헤더 목록에 없는 헤더 포함
- `Content-Type`이 `application/json` 등 단순 타입이 아닌 경우

이 프로젝트는 JWT를 `Authorization` 헤더로 전달하고 `PATCH`/`DELETE` 메서드도 사용하므로, 로그인 이후 대부분의 요청에서 브라우저가 프리플라이트 `OPTIONS` 요청을 먼저 보낸다.

### 2.3 실패 흐름

1. 브라우저가 `OPTIONS /api/users/likedPosts` 요청을 보낸다.
2. Express 라우터에는 `OPTIONS`를 처리하는 핸들러가 없으므로 해당 라우터가 매칭되지 않고 `next()`로 넘어간다.
3. 결국 마지막에 등록된 404 처리 미들웨어까지 도달해 `HttpError("라우트를 찾지 못했습니다.", 404)`가 발생한다.
4. 응답에는 CORS 헤더(Access-Control-Allow-*)가 붙어 있긴 하지만, 상태 코드가 404이기 때문에 브라우저가 프리플라이트를 **실패**로 판단하고 실제 요청(`GET`, `PATCH` 등)을 아예 보내지 않는다.
5. 그 결과 콘솔에는 실제 API 에러가 아니라 CORS 정책 위반 에러만 표시된다.

즉, 근본 원인은 "CORS 헤더 자체가 잘못돼서"가 아니라 **`OPTIONS` 프리플라이트 요청에 대한 응답을 정상적으로(2xx 상태 코드로) 처리하는 로직이 없었기 때문**이다.

> 참고: `package.json`에는 `cors` 패키지가 의존성으로 이미 설치되어 있었지만, 실제 코드에서는 사용되지 않고 수동 헤더 설정 방식만 쓰이고 있었다.

## 3. 해결 방법

수동 헤더 설정 코드를 제거하고, 이미 설치돼 있던 `cors` 패키지를 미들웨어로 적용했다.

```js
// 수정 후
const cors = require("cors");
// ...
app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  })
);
```

`cors` 미들웨어는 다음을 자동으로 처리해준다.

- 모든 요청에 `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` 헤더를 설정.
- `OPTIONS` 메서드로 들어오는 프리플라이트 요청을 라우터까지 보내지 않고 **미들웨어 단계에서 가로채**, `204 No Content` 상태 코드로 즉시 응답.

즉, 이전에는 존재하지 않았던 "OPTIONS 요청에 대한 정상 응답(2xx)"을 `cors` 패키지가 대신 만들어주기 때문에 프리플라이트가 통과하고, 그 뒤를 이어 실제 요청(GET/POST/PATCH/DELETE)이 정상적으로 전달된다.

## 4. 변경 파일

- `Web-Social-Account-Book-backend/app.js`
  - 수동 CORS 헤더 설정 미들웨어 제거
  - `cors` 패키지 import 및 `app.use(cors({...}))` 적용

`middleware/check-auth.js`의 `if (req.method === "OPTIONS") return next();` 분기는 `cors` 미들웨어가 OPTIONS 요청을 애초에 라우터까지 도달하지 못하게 가로채므로 더 이상 실행되지 않지만, 다른 경로에서 우회 호출될 가능성에 대비한 안전장치로 그대로 두었다.

## 5. 확인 및 주의사항

- **Origin 값 일치 여부**: `.env`의 `FRONT_END_URL`이 프론트엔드 개발 서버의 실제 origin(프로토콜+호스트+포트)과 정확히 일치해야 한다. 기존에는 `http://localhost:3000`으로 설정되어 있었으나, `vite.config.ts`에 별도 `server.port` 설정이 없어 Vite 기본 포트인 `5173`으로 실행되는 것을 직접 확인했다(`npx vite` 실행 시 `Local: http://localhost:5173/` 출력 확인). 이 불일치도 CORS 실패의 또 다른 원인이 될 수 있어 `FRONT_END_URL=http://localhost:5173`으로 수정했다.
- **배포 환경**: Vercel(프론트)·Koyeb(백엔드) 배포 환경에서도 `FRONT_END_URL` 환경변수가 실제 배포된 프론트 도메인(`https://...vercel.app`)과 일치하도록 설정되어 있어야 한다.
- **인증 정보(쿠키) 미사용**: 이 프로젝트는 JWT를 `Authorization` 헤더로 전달하고 쿠키를 사용하지 않으므로 `credentials: true` 옵션은 필요하지 않다. 만약 추후 쿠키 기반 인증으로 변경한다면 `cors({ origin, credentials: true })`와 프론트엔드의 `axios.defaults.withCredentials = true` 설정을 함께 추가해야 한다.
- **다중 origin이 필요한 경우**: origin이 여러 개(예: 로컬 + 배포)여야 한다면 `origin`에 문자열 대신 배열이나 함수를 전달하는 방식으로 확장할 수 있다.

  ```js
  const allowedOrigins = [process.env.FRONT_END_URL, "http://localhost:5173"];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("허용되지 않은 origin입니다."));
        }
      },
    })
  );
  ```
