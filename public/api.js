// 백엔드 통신 모듈
//
// 백엔드 API 규격 (Node.js에서 구현할 내용)
//   POST {API_ENDPOINT}
//   Content-Type: multipart/form-data
//   필드:
//     image  : 업로드한 이미지 파일
//     style  : 스타일 id (예: "caricature")
//     prompt : 추가 요청 문구 (선택)
//   응답 (JSON):
//     { "image": "<base64 PNG>" }  또는  { "imageUrl": "https://..." }
//   오류 응답 (JSON):
//     { "error": "메시지" }

// 서버의 OpenAI 타임아웃(150초)보다 조금 길게
const REQUEST_TIMEOUT_MS = 170 * 1000;

const ImageAPI = {
  async transform(file, styleId, extraPrompt) {
    const { API_ENDPOINT, USE_MOCK, STYLES } = window.APP_CONFIG;

    if (USE_MOCK) {
      const style = STYLES.find((s) => s.id === styleId);
      return mockTransform(file, style);
    }

    const formData = new FormData();
    formData.append("image", await resizeForUpload(file), "upload.jpg");
    formData.append("style", styleId);
    if (extraPrompt) formData.append("prompt", extraPrompt);

    let res;
    try {
      res = await fetch(API_ENDPOINT, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      if (err.name === "TimeoutError") {
        throw new Error("변환 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요.");
      }
      throw new Error("서버에 연결할 수 없어요. 서버가 실행 중인지 확인해 주세요.");
    }
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 413) throw new Error("사진 용량이 너무 커요. 더 작은 사진을 올려 주세요.");
      if (res.status === 504) throw new Error("변환 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요.");
      throw new Error(data.error || `서버 오류가 발생했어요. (${res.status})`);
    }
    if (data.image) return `data:image/png;base64,${data.image}`;
    if (data.imageUrl) return data.imageUrl;
    throw new Error("서버 응답에 이미지가 없습니다.");
  },
};

// 업로드 전에 긴 변을 UPLOAD_MAX_SIDE 이하로 줄이고 JPEG로 압축
function resizeForUpload(file) {
  const maxSide = window.APP_CONFIG.UPLOAD_MAX_SIDE;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // 투명 배경이 검게 변하지 않도록
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("이미지 압축에 실패했습니다."))),
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    img.src = URL.createObjectURL(file);
  });
}

// 백엔드 없이 UI를 확인하기 위한 가짜 변환 (캔버스 필터)
const MOCK_FILTERS = {
  caricature: "saturate(1.8) contrast(1.3)",
  anime: "saturate(1.5) brightness(1.1) contrast(1.15)",
  "movie-poster": "contrast(1.4) sepia(0.35) saturate(1.3)",
  "3d-cartoon": "saturate(1.4) brightness(1.08) blur(1px)",
  watercolor: "saturate(0.8) brightness(1.15) blur(1.5px)",
  "pixel-art": "saturate(1.6) contrast(1.2)",
};

function mockTransform(file, style) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // 정사각형으로 크롭 (OpenAI 결과물과 비슷한 비율)
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;

      if (style.id === "pixel-art") {
        const small = 64;
        ctx.imageSmoothingEnabled = false;
        ctx.filter = MOCK_FILTERS[style.id];
        ctx.drawImage(img, sx, sy, s, s, 0, 0, small, small);
        ctx.filter = "none";
        ctx.drawImage(canvas, 0, 0, small, small, 0, 0, size, size);
      } else {
        ctx.filter = MOCK_FILTERS[style.id] || "none";
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        ctx.filter = "none";
      }

      if (style.id === "movie-poster") {
        const grad = ctx.createLinearGradient(0, size * 0.6, 0, size);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 88px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText("THE LEGEND", size / 2, size - 110);
        ctx.font = "28px sans-serif";
        ctx.fillText("COMING SOON", size / 2, size - 60);
      }

      URL.revokeObjectURL(img.src);
      // 실제 API 대기 시간을 흉내
      setTimeout(() => resolve(canvas.toDataURL("image/png")), 1200);
    };
    img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    img.src = URL.createObjectURL(file);
  });
}
