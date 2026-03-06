# Radiotherapy Startup Tracker

A dark-themed interactive dashboard for tracking startup and emerging companies in the radiotherapy and radiopharmaceutical cancer space.

**Live site:** https://mattmargolis.github.io/radiotherapy-startup-tracker/

---

## Features

- **KPI cards** — total companies, total disclosed funding, # clinical-stage, # acquired/M&A
- **4 charts** — breakdown by modality, development stage, funding stage, and HQ region
- **Filterable table** — full-text search + dropdowns for modality, stage, and funding type
- **Sortable columns** — click any column header to sort ascending/descending
- **Company detail modal** — click any row for the full company profile

## Modalities Tracked

| Modality | Description |
|---|---|
| Radioligand Therapy (RLT) | Lu-177, Cu-67, and other beta-emitting radiopharmaceuticals |
| Targeted Alpha Therapy (TAT) | Ac-225, Pb-212, Ra-224 alpha-emitting agents |
| External Beam Radiotherapy (EBRT) | Advanced linac systems, biology-guided RT |
| Proton Therapy | Compact and full-scale proton accelerators |
| Brachytherapy | Internal/intracavitary radiation sources |
| Radiosensitizer | Drugs that enhance RT efficacy in combination |

## Data

Company data lives in [`data/companies.json`](data/companies.json). Each entry includes:

| Field | Description |
|---|---|
| `name`, `website`, `hq`, `founded` | Company basics |
| `modality`, `technology`, `indication` | What they do and who they treat |
| `stage` | Pre-clinical, Clinical Phase I/II, Clinical Phase III, or Commercial |
| `funding_stage` | Private, Series A/B/C, Public, or Acquired |
| `total_funding_usd_m` | Total disclosed funding in $M |
| `last_funding_date` | Date of most recent funding round |
| `key_investors` | Notable investors or acquirers |
| `pipeline` | Key assets and development status |
| `partnerships` | Notable collaborations or M&A |
| `notes` | Additional context |

Data is sourced from public filings, company websites, and press releases. Verify independently before use.

## Adding a Company

Edit `data/companies.json` and append a new object following the existing schema. Increment the `id` field. The dashboard is purely client-side — no build step required.

## Running Locally

```bash
cd radiotherapy-startup-tracker
npx serve .
```

Then open [http://localhost:3000](http://localhost:3000).

> Note: a local server is required (rather than opening `index.html` directly) because the app fetches `data/companies.json` via `fetch()`.

## Tech Stack

- Vanilla HTML/CSS/JavaScript — no framework, no build step
- [Chart.js](https://www.chartjs.org/) for charts
- Hosted on GitHub Pages
