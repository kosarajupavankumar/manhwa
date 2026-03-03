# Manhwa Pipeline

A fully automated pipeline that scrapes Webtoons episodes, extracts text via OCR, polishes the raw output with Gemini AI, and generates viral YouTube narration scripts — all in a single `npm start`.

```
Scrape → OCR → Polish → Narrate
```

---

## Features

- **Scraper** — Headless Playwright browser downloads every panel image from a Webtoons series, handling lazy-loading and retries automatically
- **OCR** — Tesseract.js worker pool extracts dialogue and narration text from each image; Sharp preprocessing improves accuracy
- **Polisher** — Gemini AI strips OCR noise and rescues real story text from garbled scanner output, with few-shot examples for precision
- **Narrator** — Gemini AI rewrites the cleaned text as a viral YouTube recap script (450+ words per episode, ~3 min read time)

---

## Project Structure

```
src/
├── cli/
│   ├── pipeline.cli.ts     # Full pipeline (scrape → OCR → polish → narrate)
│   ├── scraper.cli.ts      # Scrape only
│   ├── ocr.cli.ts          # OCR only
│   ├── polish.cli.ts       # Polish only
│   └── narrate.cli.ts      # Narrate only
├── core/
│   ├── scraper/            # Playwright browser, downloader, URL utils
│   ├── ocr/                # Tesseract worker pool, preprocessor, text cleaner
│   ├── polisher/           # Gemini text polisher
│   └── narrator/           # Gemini narration script generator
├── types/                  # Shared TypeScript interfaces
├── utils/                  # Concurrency helpers, filesystem utilities
└── config.ts               # Typed config loader from .env

output/
└── <Series Name>/
    ├── ocr/                # Raw Tesseract .txt files
    ├── polished/           # Gemini-cleaned .txt files
    └── narration/          # narration_script.txt

downloads/
└── <Series Name>/          # Downloaded panel images (per episode)
```

---

## Prerequisites

- **Node.js** 20+
- **npm** 9+
- A **Gemini API key** — [get one free at Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/kosarajupavankumar/manhwa.git
cd manhwa

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install chromium

# 4. Configure environment
cp .env.example .env
# Then open .env and fill in your values (see Configuration below)
```

---

## Configuration

Edit `.env` — all values have sensible defaults except `WEBTOONS_URL` and `GEMINI_API_KEY`:

```dotenv
# REQUIRED — full URL of the webtoon episode-list page
WEBTOONS_URL=https://www.webtoons.com/en/romance/shifting-tails/list?title_no=8942

# REQUIRED for polish + narrate steps
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Episode range (leave TO_EPISODE blank to scrape all)
FROM_EPISODE=1
TO_EPISODE=

# Output directories
DOWNLOAD_DIR=./downloads
OCR_OUTPUT_DIR=./output/Shifting Tails/ocr
POLISH_OUTPUT_DIR=./output/Shifting Tails/polished
NARRATION_OUTPUT_DIR=./output/Shifting Tails/narration

# Pipeline toggles
SKIP_OCR=false
SKIP_POLISH=false
SKIP_NARRATE=false

# OCR settings
OCR_CONCURRENCY=2
OCR_LANG=eng
OCR_INVERT=false
```

---

## Usage

### Full pipeline (recommended)

```bash
npm start
```

Runs: **build → scrape → OCR → polish → narrate** in sequence.

### Development (no build step)

```bash
npm run dev
```

### Individual steps

| Command | What it does |
|---|---|
| `npm run scrape` | Download images only |
| `npm run ocr` | OCR downloaded images |
| `npm run polish` | Gemini-polish OCR output |
| `npm run narrate` | Generate narration script |

### CLI flags (full pipeline)

```bash
# Scrape a different URL with a custom episode range
npm start -- "https://www.webtoons.com/..." --from 1 --to 10

# Skip specific steps
npm start -- --skip-polish        # scrape + OCR + narrate (no Gemini polish)
npm start -- --skip-narrate       # scrape + OCR + polish only
npm start -- --skip-ocr           # scrape only

# Override output directories
npm start -- --ocr-output ./custom/ocr --narrate-output ./custom/narration

# Use a different Gemini model
npm start -- --model gemini-2.0-flash

# Custom series title for the narration script
npm start -- --title "My Series Name"
```

---

## Development

```bash
# Type-check
npx tsc --noEmit

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check

# Tests (51 unit tests)
npm test
npm run test:coverage
npm run test:watch
```

The `prebuild` gate runs automatically before every `npm run build` / `npm start`:

```
lint → format:check → jest (51 tests) → tsc
```

---

## Tech Stack

| Library | Purpose |
|---|---|
| [Playwright](https://playwright.dev) | Headless browser — scrapes Webtoons panels |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | OCR — extracts text from panel images |
| [Sharp](https://sharp.pixelplumbing.com) | Image preprocessing for better OCR accuracy |
| [@google/generative-ai](https://ai.google.dev) | Gemini AI — text polisher + narrator |
| [TypeScript 5.9](https://www.typescriptlang.org) | Strict typing throughout |
| [ESLint v10](https://eslint.org) + [Prettier](https://prettier.io) | Code quality & formatting |
| [Jest](https://jestjs.io) + ts-jest | Unit testing |
| [dotenv](https://github.com/motdotla/dotenv) | Typed environment config |

---

## License

MIT
