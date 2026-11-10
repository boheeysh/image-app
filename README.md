# AI 캐리커처 스튜디오

사진을 올리면 캐리커처, 애니메이션, 영화 포스터 등 다양한 스타일로 바꿔 주는 웹 앱입니다.
프론트엔드는 HTML/CSS/JS, 백엔드는 Node.js + Express, 이미지 변환은 OpenAI 이미지 편집 API(`gpt-image-2.5-sunburst`, `/v1/images/edits`)를 사용합니다.

## 폴더 구조

```
image app/
├── public/                 # 프론트엔드 (정적 파일)
│   ├── index.html
│   ├── style.css
│   ├── config.js           # 프론트엔드 설정 (API 주소, 스타일 목록)
│   ├── api.js              # 백엔드 호출, 업로드 전 이미지 축소
│   └── app.js              # 화면 동작
├── src/                    # 백엔드
│   ├── app.js              # Express 앱 (라우트, 업로드 처리, 오류 처리)
│   ├── styles.js           # 스타일별 OpenAI 프롬프트
│   └── services/
│       └── imageService.js # OpenAI 이미지 편집 호출, 오류 안내 메시지 변환
├── api/index.js            # Vercel 서버리스 함수 진입점
├── server.js               # 로컬 실행 진입점
├── vercel.json             # Vercel 배포 설정
├── .env                    # API 키 (git에 올리지 않음)
└── .env.example            # .env 작성 예시
```

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 서버 상태, 변환 모드, API 키 설정 여부 확인 |
| POST | `/api/transform` | 이미지 변환 (multipart/form-data) |

`POST /api/transform` 요청 필드

- `image`: 이미지 파일 (PNG/JPG/WEBP, 최대 4MB)
- `style`: `caricature`, `anime`, `movie-poster`, `3d-cartoon`, `watercolor`, `pixel-art`
- `prompt`: 추가 요청 문구 (선택, 최대 200자)

응답: `{ "image": "<base64 PNG>" }`, 오류 시 `{ "error": "메시지" }`

## 로컬에서 실행하기

1. **Node.js 18 이상**을 설치합니다. 버전은 `node -v`로 확인할 수 있습니다.
2. 터미널에서 프로젝트 폴더로 이동합니다.
   ```bash
   cd "image app"
   ```
3. 패키지를 설치합니다 (처음 한 번만).
   ```bash
   npm install
   ```
4. `.env` 파일을 준비합니다. 없다면 `.env.example`을 복사해서 키를 채웁니다.
   ```bash
   cp .env.example .env
   ```
   ```
   OPENAI_API_KEY=sk-...
   ```
5. 서버를 실행합니다.
   ```bash
   npm start        # 일반 실행
   npm run dev      # 코드 수정 시 자동 재시작
   ```
6. 브라우저에서 <http://localhost:3000> 에 접속합니다.

종료할 때는 터미널에서 `Ctrl + C`를 누릅니다.

### 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `OPENAI_API_KEY` | (필수) | OpenAI API 키 |
| `IMAGE_PROVIDER` | `openai` | `mock`으로 바꾸면 OpenAI를 호출하지 않고 원본을 그대로 돌려줍니다 (무료 테스트용) |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-sunburst` | 이미지 편집 모델 |
| `OPENAI_IMAGE_SIZE` | `1024x1024` | 결과 이미지 크기 |
| `OPENAI_IMAGE_QUALITY` | `medium` | `low`, `medium`, `high`, `xhigh`, `max`, `auto` (높을수록 느리고 비쌈) |

값을 바꾼 뒤에는 서버를 다시 시작해야 합니다. 변환은 호출할 때마다 요금이 부과되며, 공식 문서 기준 최대 2분까지 걸릴 수 있습니다.

스타일 프롬프트는 `src/styles.js`에서 수정합니다. 스타일을 추가할 때는 `public/config.js`의 `STYLES`에도 같은 `id`로 추가해야 합니다.

### API 키 보안

- API 키는 서버(`src/services/imageService.js`)에서만 `process.env.OPENAI_API_KEY`로 읽습니다. 브라우저로는 전달되지 않습니다.
- 서버는 `public/` 폴더만 정적 파일로 제공하므로 `.env`는 웹으로 접근할 수 없습니다.
- `.gitignore`에 `.env`, `.env.*`가 포함되어 있어 GitHub에 올라가지 않습니다 (`.env.example`만 예외).

## Vercel에 배포하기

1. 프로젝트를 GitHub에 올립니다. `.env`는 `.gitignore`에 포함되어 있어 올라가지 않습니다.
2. [vercel.com](https://vercel.com)에서 **Add New → Project**를 누르고 저장소를 가져옵니다. Framework Preset은 **Other**로 둡니다.
3. **Settings → Environment Variables**에 `OPENAI_API_KEY`를 등록합니다. 필요하면 다른 환경 변수도 함께 등록합니다.
4. 배포합니다. `public/` 폴더는 정적 파일로, `/api/*` 요청은 `api/index.js`의 Express 앱으로 처리됩니다.

### 배포 시 주의할 점

- Vercel 서버리스 함수의 요청 크기 한도는 4.5MB입니다. 그래서 프론트엔드에서 업로드 전에 사진을 1536px 이하 JPEG로 줄여서 보냅니다.
- 이미지 변환은 오래 걸릴 수 있어서 `vercel.json`에 함수 최대 실행 시간을 300초로 설정했습니다. 요금제에 따라 허용되는 최대 시간이 다를 수 있습니다.
- API 키는 반드시 서버(`.env` 또는 Vercel 환경 변수)에만 두고, `public/` 폴더의 파일에는 넣지 마세요.
