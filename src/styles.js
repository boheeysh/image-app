// 스타일별 OpenAI 프롬프트 (id는 public/config.js의 STYLES와 일치해야 함)
const STYLE_PROMPTS = {
  caricature:
    "Turn this photo into a fun hand-drawn caricature with exaggerated facial features, bold outlines and vibrant colors. Keep the person recognizable.",
  anime:
    "Redraw this photo in a Japanese anime illustration style with clean line art, cel shading and expressive eyes. Keep the person recognizable.",
  "movie-poster":
    "Transform this photo into a dramatic Hollywood blockbuster movie poster with cinematic lighting, an epic atmosphere and a bold title. Keep the person recognizable.",
  "3d-cartoon":
    "Render this person as a cute 3D animated cartoon character with soft lighting and smooth materials. Keep the person recognizable.",
  watercolor:
    "Repaint this photo as a soft watercolor painting with gentle color washes and paper texture.",
  "pixel-art":
    "Convert this photo into retro 16-bit pixel art with a limited color palette.",
};

function buildPrompt(styleId, extraPrompt) {
  const base = STYLE_PROMPTS[styleId];
  if (!base) return null;
  return extraPrompt ? `${base}\nAdditional request: ${extraPrompt}` : base;
}

module.exports = { STYLE_PROMPTS, buildPrompt };
