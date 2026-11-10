// 앱 설정 — 백엔드 연결 시 이 파일만 수정하면 됩니다.
window.APP_CONFIG = {
  // Node.js 백엔드의 이미지 변환 엔드포인트
  API_ENDPOINT: "/api/transform",

  // true: 백엔드 없이 브라우저에서 필터로 흉내 낸 결과를 보여 줌 (화면만 테스트할 때)
  // false: 실제 백엔드(OpenAI 이미지 편집 API)를 호출
  USE_MOCK: false,

  // 업로드 전에 브라우저에서 축소하므로 원본은 더 커도 됨
  MAX_FILE_SIZE_MB: 20,

  // 서버로 보내기 전 긴 변의 최대 픽셀 (Vercel 4.5MB 요청 한도 대응)
  UPLOAD_MAX_SIDE: 1536,

  // 스타일 목록. id는 백엔드로 전달되며, 실제 프롬프트는 src/styles.js에 있습니다.
  STYLES: [
    {
      id: "caricature",
      name: "캐리커처",
      emoji: "🤪",
      desc: "특징을 과장한 유쾌한 그림",
    },
    {
      id: "anime",
      name: "애니메이션",
      emoji: "🌸",
      desc: "일본 애니메이션 스타일",
    },
    {
      id: "movie-poster",
      name: "영화 포스터",
      emoji: "🎬",
      desc: "블록버스터 영화 포스터",
    },
    {
      id: "3d-cartoon",
      name: "3D 카툰",
      emoji: "🧸",
      desc: "3D 애니메이션 캐릭터",
    },
    {
      id: "watercolor",
      name: "수채화",
      emoji: "🖌️",
      desc: "부드러운 수채화 그림",
    },
    {
      id: "pixel-art",
      name: "픽셀 아트",
      emoji: "👾",
      desc: "레트로 게임 픽셀 스타일",
    },
  ],
};
