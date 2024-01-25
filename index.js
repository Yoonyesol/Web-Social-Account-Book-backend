const httpServer = require("http").createServer(); //서버 객체 생성
// http server를 socket.io server로 upgrade
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
}); //cors 정책 설정

//socket 연결
io.on("connection", (socket) => {
  console.log("connection");
  socket.on("init", (payload) => {
    console.log(payload);
  });

  //연결이 되면 클라이언트에 메시지를 전송하고 클라이언트로부터 메시지를 수신한다
  socket.on("send message", (item) => {
    console.log(item.author + " : " + item.message);
    io.emit("receive message", { author: item.author, message: item.message, time: item.time });
    //클라이언트에 이벤트를 보냄
  });
});

httpServer.listen(80); //80번 포트 서버 실행
