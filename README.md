# Midnight Manhwa - Webtoon to YouTube Automation Pipeline

A fully automated Python pipeline that scrapes Webtoon/Manhwa episodes, extracts text via OCR using Gemini AI and Tesseract, generates YouTube scripts, and creates AI-powered videos with synchronized audio for both YouTube and Shorts.

```
Scrape → OCR → Script Generation → AI Video Creation
```

## Features

- **Webtoon Scraper** — Downloads all episode images from Webtoon series automatically
- **OCR Text Extraction** — Uses Google Gemini AI for high-quality text extraction from comic panels, with Tesseract OCR as fallback
- **YouTube Script Generation** — Creates detailed, engaging narration scripts using AI for viral YouTube content
- **AI Video Generation** — Creates cinematic videos using AI services (RunwayML, etc.) with scene-based storytelling
- **Text-to-Speech** — Generates synchronized voice narration using OpenAI TTS or ElevenLabs
- **YouTube & Shorts Support** — Creates both horizontal YouTube videos (16:9) and vertical Shorts (9:16)
- **Traditional Video Fallback** — Creates scrolling videos from webtoon images when AI services are unavailable
- **Batch Processing** — Processes multiple episodes in series
- **Flexible Configuration** — Environment-based configuration for API keys and settings

## Features

- **Webtoon Scraper** — Downloads all episode images from Webtoon series automatically
- **OCR Text Extraction** — Uses Google Gemini AI for high-quality text extraction from comic panels, with Tesseract OCR as fallback
- **YouTube Script Generation** — Creates detailed, engaging narration scripts using AI for viral YouTube content
- **Batch Processing** — Processes multiple episodes in series
- **Flexible Configuration** — Environment-based configuration for API keys and settings

## Requirements

- Python 3.9+
- Google AI API key (for Gemini OCR and script generation)
- OpenAI API key (optional, used as fallback for script generation and TTS)
- RunwayML API key (optional, for AI video generation)
- ElevenLabs API key (optional, for high-quality TTS)
- Tesseract OCR (installed system-wide)
- FFmpeg (for video processing)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/kosarajupavankumar/manhwa.git
cd manhwa
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Install Tesseract OCR:
```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
```

5. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys:
# GOOGLE_AI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=your_openai_api_key (optional)
```

## Usage

### Full Pipeline
```bash
python main.py "https://www.webtoons.com/en/graphic-novel/fence/list?title_no=9575"
```

### Skip Download (Process Existing Images)
```bash
python main.py --skip-download
```

### Limit Episodes
```bash
python main.py "https://www.webtoons.com/en/..." --limit 5
```

### Individual Components

Extract text from images:
```bash
python ocr_extractor.py /path/to/images/folder
```

Generate script from text file:
```bash
python script_generator.py input_text.txt output_script.md
```

Create YouTube video from script:
```bash
python video_builder.py assets/Series/youtube_script_gemini_pro.md assets/Series/youtube_video.mp4
```

Create YouTube Shorts:
```bash
python video_builder.py assets/Series/youtube_script_gemini_pro.md assets/Series/shorts.mp4 --shorts
```

Create traditional scrolling video:
```bash
python video_builder.py /path/to/image/folder assets/traditional_video.mp4

## Project Structure

```
├── main.py                 # Main pipeline orchestrator
├── scraper.py              # Webtoon episode scraper
├── ocr_extractor.py        # OCR text extraction (Gemini + Tesseract)
├── script_generator.py     # YouTube script generation
├── video_builder.py        # Video creation (future feature)
├── webtoon_research.py     # Research utilities
├── assets/                 # Downloaded content
│   └── <Series Name>/
│       ├── images/         # Episode images
│       │   └── Episode X/
│       └── text/           # Extracted text
│           └── Episode X/
│               └── Episode X_extracted.txt
└── all_episodes_combined_text.txt  # Combined text for script generation
```

## Output Structure

After running the pipeline, you'll find:

- `assets/<Series Name>/images/` — Downloaded episode images
- `assets/<Series Name>/text/` — Individual episode extracted text
- `assets/<Series Name>/all_episodes_combined_text.txt` — Combined text from all episodes
- `assets/<Series Name>/youtube_script_gemini_pro.md` — Generated YouTube script
- `assets/<Series Name>/youtube_video.mp4` — AI-generated YouTube video (16:9)
- `assets/<Series Name>/youtube_shorts.mp4` — AI-generated YouTube Shorts (9:16)
- `assets/<Series Name>/traditional_video.mp4` — Traditional scrolling video from images

## Configuration

The pipeline uses the following environment variables:

- `GOOGLE_AI_API_KEY` — Required for Gemini OCR and script generation
- `OPENAI_API_KEY` — Optional fallback for script generation and TTS
- `RUNWAYML_API_KEY` — Optional for AI video generation (RunwayML Gen-2)
- `ELEVENLABS_API_KEY` — Optional for high-quality TTS
- `WEBTOON_LIMIT` — Default episode limit (optional)

## AI Services and Costs

### Required Services
- **Gemini API**: Free tier available, upgrade for higher limits
- **Tesseract OCR**: Free, no API key needed

### Optional AI Services
- **OpenAI API**: Paid credits required for script generation and TTS
- **RunwayML**: Paid credits for AI video generation
- **ElevenLabs**: Paid credits for premium TTS voices

### Video Generation Options
1. **AI-Generated Videos**: Uses RunwayML to create cinematic scenes from script descriptions
2. **Text-Based Videos**: Fallback with scene descriptions and text overlays
3. **Traditional Videos**: Scrolling webtoon panels (no AI required)

### Audio Options
1. **OpenAI TTS**: High-quality voice synthesis
2. **ElevenLabs**: Premium voice cloning and emotions
3. **No Audio**: Silent videos (fallback)

## Troubleshooting

### Gemini API Errors
- Check your API key in `.env`
- Free tier quota exceeded: Wait or upgrade billing
- Model not found: Ensure you're using current Gemini models

### Tesseract Issues
- Install Tesseract system-wide
- Check language packs: `tesseract --list-langs`

### Webtoon Scraping
- Some series may have anti-bot protection
- Use `--limit` to process fewer episodes initially

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This tool is for educational and personal use. Respect webtoon copyrights and platform terms of service.

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
