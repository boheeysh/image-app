// 이미지 변환 서비스
// IMAGE_PROVIDER 환경 변수로 동작 방식을 고릅니다.
//   openai : OpenAI 이미지 편집 API 호출 (기본값)
//   mock   : OpenAI를 호출하지 않고 원본 이미지를 그대로 돌려줌 (비용 없이 연결 테스트용)
const OpenAI = require("openai");
const { toFile } = require("openai");

// 공식 문서: https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
const DEFAULT_MODEL = "gpt-image-2.5-sunburst";
// 문서상 복잡한 요청은 최대 2분까지 걸릴 수 있음
const REQUEST_TIMEOUT_MS = 150 * 1000;

let client = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error("서버에 OPENAI_API_KEY가 설정되지 않았습니다."), { status: 500 });
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0, // 변환 비용이 크므로 자동 재시도하지 않음
    });
  }
  return client;
}

function getProvider() {
  return (process.env.IMAGE_PROVIDER || "openai").toLowerCase();
}

async function mockTransform({ buffer }) {
  await new Promise((r) => setTimeout(r, 800));
  return buffer.toString("base64");
}

async function openaiTransform({ buffer, mimetype, originalname, prompt }) {
  const image = await toFile(buffer, originalname || "upload.jpg", { type: mimetype });

  // gpt-image 계열은 항상 b64_json으로 응답하므로 response_format은 보내지 않음
  const result = await getClient().images.edit({
    model: process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL,
    image,
    prompt,
    size: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
    output_format: "png",
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI 응답에 이미지가 없습니다.");
  return b64;
}

// OpenAI 오류를 사용자에게 보여 줄 안내 메시지로 변환
function toUserError(err) {
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return { status: 504, message: "변환 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요." };
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return { status: 502, message: "OpenAI 서버에 연결하지 못했어요. 네트워크를 확인해 주세요." };
  }
  if (!(err instanceof OpenAI.APIError)) return null;

  const code = err.code || err.error?.code;
  if (code === "moderation_blocked" || code === "content_policy_violation") {
    return { status: 400, message: "안전 정책에 따라 이 사진은 변환할 수 없어요. 다른 사진으로 시도해 주세요." };
  }
  switch (err.status) {
    case 400:
      return { status: 400, message: `요청을 처리할 수 없어요: ${err.error?.message || err.message}` };
    case 401:
      return { status: 500, message: "서버의 OpenAI API 키가 올바르지 않아요. 관리자에게 문의해 주세요." };
    case 403:
      return { status: 500, message: "이 API 키로는 해당 이미지 모델을 사용할 수 없어요." };
    case 429:
      return { status: 429, message: "요청이 많거나 사용 한도를 초과했어요. 잠시 후 다시 시도해 주세요." };
    default:
      return { status: 502, message: "OpenAI 서버에서 오류가 발생했어요. 잠시 후 다시 시도해 주세요." };
  }
}

async function transformImage(input) {
  if (getProvider() === "mock") return mockTransform(input);

  try {
    return await openaiTransform(input);
  } catch (err) {
    const userError = toUserError(err);
    if (!userError) throw err;
    console.error(`[OpenAI] ${err.status || ""} ${err.code || ""} ${err.message}`);
    throw Object.assign(new Error(userError.message), { status: userError.status, logged: true });
  }
}

module.exports = { transformImage, getProvider };
