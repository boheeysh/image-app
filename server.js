// 로컬 실행용 진입점: npm start
const app = require("./src/app");
const { getProvider } = require("./src/services/imageService");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI 캐리커처 스튜디오: http://localhost:${PORT}`);
  console.log(`이미지 변환 모드: ${getProvider()}`);
});
