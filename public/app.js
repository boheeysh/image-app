const { STYLES, MAX_FILE_SIZE_MB } = window.APP_CONFIG;

const state = {
  file: null,
  originalUrl: null,
  resultUrl: null,
  styleId: STYLES[0].id,
  loading: false,
};

const $ = (id) => document.getElementById(id);
const el = {
  dropZone: $("dropZone"),
  fileInput: $("fileInput"),
  dropPlaceholder: $("dropPlaceholder"),
  uploadPreview: $("uploadPreview"),
  resetBtn: $("resetBtn"),
  styleGrid: $("styleGrid"),
  extraPrompt: $("extraPrompt"),
  transformBtn: $("transformBtn"),
  statusMsg: $("statusMsg"),
  resultSection: $("resultSection"),
  sliderView: $("sliderView"),
  sideView: $("sideView"),
  sliderBefore: $("sliderBefore"),
  sliderAfter: $("sliderAfter"),
  sliderBeforeWrap: $("sliderBeforeWrap"),
  sliderHandle: $("sliderHandle"),
  sliderRange: $("sliderRange"),
  sideBefore: $("sideBefore"),
  sideAfter: $("sideAfter"),
  sideAfterCaption: $("sideAfterCaption"),
  downloadBtn: $("downloadBtn"),
  retryBtn: $("retryBtn"),
};

/* ---------- 1. 업로드 ---------- */

function handleFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    return setStatus("PNG, JPG, WEBP 이미지만 업로드할 수 있어요.", true);
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return setStatus(`파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 해요.`, true);
  }

  if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  state.file = file;
  state.originalUrl = URL.createObjectURL(file);

  el.uploadPreview.src = state.originalUrl;
  el.uploadPreview.hidden = false;
  el.dropPlaceholder.hidden = true;
  el.resetBtn.hidden = false;
  el.resultSection.hidden = true;
  setStatus("");
  updateButton();
}

el.fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

["dragenter", "dragover"].forEach((type) =>
  el.dropZone.addEventListener(type, (e) => {
    e.preventDefault();
    el.dropZone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((type) =>
  el.dropZone.addEventListener(type, (e) => {
    e.preventDefault();
    el.dropZone.classList.remove("dragover");
  })
);
el.dropZone.addEventListener("drop", (e) => {
  if (!state.loading) handleFile(e.dataTransfer.files[0]);
});

el.resetBtn.addEventListener("click", () => {
  el.fileInput.value = "";
  el.fileInput.click();
});

/* ---------- 2. 스타일 선택 ---------- */

function renderStyles() {
  el.styleGrid.innerHTML = STYLES.map(
    (s) => `
    <button type="button" class="style-card${s.id === state.styleId ? " selected" : ""}"
            role="radio" aria-checked="${s.id === state.styleId}" data-id="${s.id}">
      <span class="style-emoji">${s.emoji}</span>
      <span class="style-name">${s.name}</span>
      <span class="style-desc">${s.desc}</span>
    </button>`
  ).join("");
}

el.styleGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".style-card");
  if (!card || state.loading) return;
  state.styleId = card.dataset.id;
  renderStyles();
});

/* ---------- 3. 변환 ---------- */

function updateButton() {
  el.transformBtn.disabled = !state.file || state.loading;
  el.transformBtn.classList.toggle("loading", state.loading);
  el.transformBtn.querySelector(".btn-label").textContent = state.loading
    ? "변환 중..."
    : "✨ 이미지 변환하기";
}

function setStatus(msg, isError = false) {
  el.statusMsg.textContent = msg;
  el.statusMsg.classList.toggle("error", isError);
}

el.transformBtn.addEventListener("click", async () => {
  if (!state.file || state.loading) return;

  state.loading = true;
  updateButton();
  setInputsDisabled(true);

  // 변환은 최대 2분까지 걸릴 수 있어 경과 시간을 함께 보여 줌
  const startedAt = Date.now();
  const showProgress = () => {
    const sec = Math.floor((Date.now() - startedAt) / 1000);
    setStatus(`AI가 이미지를 그리고 있어요... ${sec}초 경과 (보통 30초~2분 걸려요)`);
  };
  showProgress();
  const timer = setInterval(showProgress, 1000);

  try {
    state.resultUrl = await ImageAPI.transform(
      state.file,
      state.styleId,
      el.extraPrompt.value.trim()
    );
    showResult();
    setStatus("변환 완료! 🎉");
  } catch (err) {
    console.error(err);
    setStatus(`⚠️ 변환에 실패했어요. ${err.message}`, true);
  } finally {
    clearInterval(timer);
    state.loading = false;
    updateButton();
    setInputsDisabled(false);
  }
});

// 변환 중에는 사진/스타일/추가 요청을 바꾸지 못하게 막음
function setInputsDisabled(disabled) {
  el.fileInput.disabled = disabled;
  el.resetBtn.disabled = disabled;
  el.extraPrompt.disabled = disabled;
  el.retryBtn.disabled = disabled;
  el.dropZone.classList.toggle("disabled", disabled);
  el.styleGrid.querySelectorAll(".style-card").forEach((c) => (c.disabled = disabled));
}

/* ---------- 4. 비교 ---------- */

function showResult() {
  const style = STYLES.find((s) => s.id === state.styleId);
  el.sliderBefore.src = el.sideBefore.src = state.originalUrl;
  el.sliderAfter.src = el.sideAfter.src = state.resultUrl;
  el.sideAfterCaption.textContent = `${style.emoji} ${style.name}`;
  setSlider(50);
  el.resultSection.hidden = false;
  el.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setSlider(value) {
  el.sliderRange.value = value;
  el.sliderBeforeWrap.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
  el.sliderHandle.style.left = `${value}%`;
}

el.sliderRange.addEventListener("input", (e) => setSlider(e.target.value));

document.querySelectorAll(".toggle-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.toggle("active", b === btn));
    const isSlider = btn.dataset.view === "slider";
    el.sliderView.hidden = !isSlider;
    el.sideView.hidden = isSlider;
  })
);

/* ---------- 5. 다운로드 ---------- */

el.downloadBtn.addEventListener("click", async () => {
  if (!state.resultUrl) return;
  const filename = `${state.styleId}-${Date.now()}.png`;

  try {
    // 외부 URL(imageUrl 응답)인 경우에도 다운로드되도록 blob으로 변환
    const blob = await (await fetch(state.resultUrl)).blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(state.resultUrl, "_blank");
  }
});

el.retryBtn.addEventListener("click", () => {
  el.styleGrid.scrollIntoView({ behavior: "smooth", block: "center" });
});

/* ---------- 초기화 ---------- */
renderStyles();
updateButton();
