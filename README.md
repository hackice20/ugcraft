# UGCraft

Turn a **product URL** or **one-line creative brief** into a short-form **UGC-style vertical reel** — trending audio, meme GIF, text overlay, and background video. AI-directed, not AI-generated footage.

Built with **Next.js** for deployment on **Vercel**.

---

## What it does

Chat naturally or drop a prompt:

> `main character reel for linkedin premium`

> `check out https://linear.app`

UGCraft:

1. **Routes intent** — casual chat vs reel request (URL or text brief)
2. **Understands the product** — scrapes the URL (cheerio) or infers from your prompt (`gpt-4o-mini`)
3. **Directs the reel** — LLM outputs song, GIF search, emotion, text, and background query
4. **Fetches assets** — iTunes preview, Giphy (emotion-scored), Pexels portrait video
5. **Renders** — FFmpeg composites 4 layers → MP4 in chat

No fixed audio/GIF catalogs. The director prompt owns creative choices; the pipeline resolves them at runtime.

---

## The 4 layers

| Layer | What | Source |
|-------|------|--------|
| 1 | Background video | Pexels API |
| 2 | Text overlay | LLM punchline (max 8 words, lowercase) |
| 3 | Trending audio | iTunes preview search (title + artist from LLM) |
| 4 | Meme GIF (most visible) | Giphy search (emotion + LLM query) |

**Priority:** one punchline across all four — audio pacing, GIF reaction, text, and b-roll should feel like the same joke.

---

## Architecture

```
User message (CRT chat UI)
        │
        ▼
   POST /api/chat  ──► stream reply, detect URL / intent
        │
        ▼
   POST /api/generate
        │
        ├─ scrape URL or infer product from prompt
        ├─ summarize product (gpt-4o-mini)
        ├─ director brief (gpt-4o-mini + Zod)
        │
        ├─ iTunes audio preview
        ├─ Giphy GIF (emotion-scored search)
        ├─ Pexels background
        ├─ FFmpeg composite (4 layers)
        └─ saveVideo → local or Vercel Blob
                │
                ▼
         video URL in chat
```

### Design principles

- **LLM-directed assets** — song title/artist, GIF emotion + search query, background query; no curated id lists
- **Personality in prompts** — director rules live in `ugcraft-director.system.md`, editable without touching code
- **Emotion-first GIF resolve** — Giphy results ranked by feeling + query match, not hardcoded pairings
- **Cheap LLM** — `gpt-4o-mini` only (~$0.002 per reel)

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS 4, CRT terminal UI |
| LLM | OpenAI `gpt-4o-mini` |
| HTML parsing | Cheerio |
| Validation | Zod |
| Audio | iTunes Search API preview (`preview-fetch.ts`) |
| GIFs | Giphy API + emotion scoring |
| Backgrounds | Pexels API |
| Video | FFmpeg (`fluent-ffmpeg` + `ffmpeg-static`) |
| Storage | `public/output/` (local) or Vercel Blob |
| Hosting | Vercel |

---

## Project structure

```
ugcraft/
├── assets/fonts/                   # Anton (text overlay)
├── public/output/                  # Rendered MP4s (local mode)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts       # Streaming chat + intent
│   │   │   └── generate/route.ts   # Full scrape → render pipeline
│   │   ├── globals.css             # CRT design system
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/chat/
│   │   ├── Chat.tsx                # Chat + progress bar + auto-generate
│   │   ├── ChatInput.tsx
│   │   └── MessageBubble.tsx
│   └── lib/
│       ├── types.ts                # UGCBrief, ChatMessage
│       ├── vibes.ts                # audioVibe enum
│       ├── audio/
│       │   └── preview-fetch.ts    # iTunes / Deezer preview lookup
│       ├── gif/
│       │   ├── resolver.ts         # Giphy search + emotion scoring
│       │   └── emotion-search.ts   # Emotion → search terms
│       ├── scraper/                # fetch, extract, summarize
│       ├── orchestrator/
│       │   ├── schema.ts           # Zod validation
│       │   └── run.ts              # Director LLM call
│       ├── pexels/
│       ├── video/
│       │   ├── render.ts             # Asset fetch + orchestration
│       │   ├── compose.ts          # FFmpeg 4-layer composite
│       │   └── download.ts
│       ├── storage/
│       ├── chat/                   # intent, openai client, format-brief
│       └── prompts/
│           ├── ugcraft-director.system.md   # Reel director personality
│           ├── ugcraft-chat.system.md       # Chat assistant personality
│           ├── load-system-prompt.ts
│           └── orchestrator.ts
├── .env.example
└── README.md
```

---

## Getting started

### 1. Install

```bash
cd ugcraft
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `OPENAI_API_KEY` | Yes | [platform.openai.com](https://platform.openai.com) |
| `GIPHY_API_KEY` | Yes | [developers.giphy.com](https://developers.giphy.com) |
| `PEXELS_API_KEY` | Yes | [pexels.com/api](https://www.pexels.com/api/) |
| `VIDEO_STORAGE_MODE` | No | `local` (default) or `blob` |
| `BLOB_READ_WRITE_TOKEN` | When `blob` | Vercel → Storage → Blob |

**Local dev:**

```env
VIDEO_STORAGE_MODE=local
OPENAI_API_KEY=sk-...
GIPHY_API_KEY=...
PEXELS_API_KEY=...
```

Rendered videos → `public/output/ugc-{timestamp}-{id}.mp4` → served at `/output/...`

**Vercel production:**

```env
VIDEO_STORAGE_MODE=blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Try it:**

- `hi` → casual streamed reply
- `what can you do?` → explains the product
- `https://linear.app` → scrapes → renders reel
- `skepticism reel for rabbit r1 launch` → prompt-only mode, no URL needed

### 4. Deploy to Vercel

```bash
npx vercel
```

Add all env vars in the dashboard.

> FFmpeg on serverless can hit timeout/size limits on cold starts. Local `npm run dev` is the most reliable place to test full renders.

---

## API routes

### `POST /api/chat`

Streaming conversational endpoint.

**Body:**

```json
{
  "messages": [
    { "role": "user", "content": "hi" }
  ]
}
```

**Response:** `text/plain` stream.

**Headers:**

| Header | Value |
|--------|-------|
| `X-UGCraft-Intent` | `casual` or `video_request` |
| `X-UGCraft-Url` | detected URL (when `video_request`) |

### `POST /api/generate`

Full pipeline — brief + render.

**Body (URL mode):**

```json
{
  "url": "https://linear.app"
}
```

**Body (prompt mode):**

```json
{
  "prompt": "chaos ad for liquid death mountain water"
}
```

**Response (abbreviated):**

```json
{
  "mode": "prompt",
  "product": {
    "productName": "Liquid Death",
    "category": "beverage",
    "summary": "..."
  },
  "brief": {
    "audioTitle": "MONTERO",
    "audioArtist": "Lil Nas X",
    "audioVibe": "unhinged-chaos",
    "gifEmotion": "chaos",
    "gifSearchQuery": "ishowspeed rage backflip",
    "textOverlay": "water that kills your thirst",
    "backgroundSearchQuery": "skate park energy vertical"
  },
  "video": {
    "url": "/output/ugc-....mp4",
    "usedAudio": true,
    "audioSource": "itunes",
    "audioTitle": "MONTERO — Lil Nas X",
    "gifLabel": "...",
    "gifSearchQuery": "ishowspeed rage backflip",
    "gifUrl": "https://media.giphy.com/..."
  }
}
```

---

## Chat flow

| Step | What happens |
|------|----------------|
| 1 | User sends message (URL or text brief) |
| 2 | `/api/chat` streams reply; detects URL or reel intent |
| 3 | Client calls `/api/generate` with `url` or `prompt` |
| 4 | Progress bar while rendering |
| 5 | Video + summary (audio, gif, text) in chat bubble |

---

## Director output schema

The LLM returns JSON validated by Zod in `src/lib/orchestrator/schema.ts`:

| Field | Purpose |
|-------|---------|
| `audioTitle` / `audioArtist` | iTunes preview search |
| `audioVibe` / `vibe` | Creative lane (7 vibes in `vibes.ts`) |
| `gifEmotion` | Primary feeling (chaos, flex, cringe, etc.) |
| `gifSearchQuery` | Concrete Giphy search (character + action) |
| `textOverlay` | Max 8 words, lowercase punchline |
| `backgroundSearchQuery` | Pexels portrait b-roll query |

Edit the director personality in `src/lib/prompts/ugcraft-director.system.md`. Chat tone in `ugcraft-chat.system.md`.

---

## Example prompts

```
main character reel for linkedin premium
skepticism reel for rabbit r1 ai device
wholesome reel for liquid death mountain water
phonk gym energy for whoop recovery band
cringe ad for salesforce dreamforce badge culture
victory reel for shopify first sale notification
awkward reel for bereal two minutes left
shock reveal for midjourney v7 launch
```

---

## Budget

| Service | Cost |
|---------|------|
| OpenAI `gpt-4o-mini` | ~$0.002 per reel |
| Giphy | Free tier |
| Pexels | Free |
| iTunes previews | Free |
| Vercel Blob | Free tier |
