# CareerFlow — AI-Powered Application Pipeline

A self-contained, browser-based tool that automates the job application workflow end-to-end: tailored document generation, application tracking, and iterative refinement based on direct usage feedback.

**Live demo:** _add your GitHub Pages URL here after deployment_

## What it does

CareerFlow is a single-page agentic tool built around the Claude API. It takes a job description and a candidate's base profile, and runs a multi-step pipeline:

1. **Generate** — tailors a CV summary and cover letter to the specific job description, grounded strictly in the candidate's real background (no fabricated experience)
2. **Track** — logs every application to a persistent pipeline view (Drafted → Applied → Screening → Interview → Offer / Rejected)
3. **Refine** — each application supports a feedback loop: the candidate can request a regeneration with specific notes (e.g. "emphasize the SAP project more"), and CareerFlow keeps a full version history of every draft

## Why it exists

Manually rewriting a CV summary and cover letter for every application is repetitive and easy to deprioritize under time pressure — which usually means fewer, less-tailored applications go out. CareerFlow turns that repetitive process into a five-minute step per application, while keeping a running log of what's been sent where.

## Architecture

```
career-flow/
├── index.html      # markup + view structure
├── css/
│   └── style.css   # design tokens, layout, components
├── js/
│   └── app.js       # Claude API calls, state management, rendering
└── README.md
```

- Vanilla HTML/CSS/JS — no build step, no framework dependency
- **Claude API** — called directly from the browser for document generation (`anthropic-dangerous-direct-browser-access`)
- **State** — application data, version history, and settings persist in `localStorage`; the user's own API key never leaves their browser except to call Anthropic's API directly
- **Deployment** — static hosting via GitHub Pages

## Tech stack

`Claude API` · `JavaScript (ES6)` · `HTML/CSS` · `localStorage` · `GitHub Pages`

## Running it locally

1. Clone this repo
2. Open `index.html` in a browser (or serve it with any static server)
3. Go to **Settings**, add your Claude API key and paste your base CV/profile text
4. Go to **Generate**, paste a job description, and generate your first tailored application

## Roadmap

- [ ] Export applications to CSV
- [ ] Reminder nudges for stale applications (no status change in N days)
- [ ] Multi-profile support (e.g. tailoring for different role types)
