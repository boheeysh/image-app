// Express 앱 정의 (로컬 server.js와 Vercel api/index.js가 함께 사용)
require("dotenv").config({ quiet: true });

const path = require("path");
const express = require("express");
const multer = require("multer");
const { buildPrompt } = require("./styles");
const { transformImage, getProvider } = require("./services/imageService");

// Vercel 서버리스 함수의 요청 본문 한도(4.5MB)보다 작게 설정
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// 서버리스 환경은 디스크에 저장할 수 없으므로 메모리에 보관
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error("PNG, JPG, WEBP 이미지만 업로드할 수 있습니다."), { status: 400 }));
  },
});

const app = express();

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    provider: getProvider(),
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst",
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post("/api/transform", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "이미지 파일이 필요합니다." });
  }

  const style = req.body.style;
  const extraPrompt = (req.body.prompt || "").trim().slice(0, 200);
  const prompt = buildPrompt(style, extraPrompt);
  if (!prompt) {
    return res.status(400).json({ error: `알 수 없는 스타일입니다: ${style}` });
  }

  const image = await transformImage({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
    prompt,
  });

  res.json({ image });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "존재하지 않는 API입니다." });
});

// 공통 오류 처리 (Express 5는 async 핸들러의 오류도 여기로 전달)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`
        : err.message;
    return res.status(400).json({ error: message });
  }

  // OpenAI SDK 오류는 status를 가지고 있음 (401: 키 오류, 429: 한도 초과 등)
  const status = err.status && err.status < 600 ? err.status : 500;
  if (status >= 500 && !err.logged) console.error(err);
  // 예상하지 못한 오류는 내부 정보가 노출되지 않도록 일반 메시지로 응답
  const message = err.status ? err.message : "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  res.status(status).json({ error: message });
});

module.exports = app;
