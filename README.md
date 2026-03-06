# Radiotherapy Startup Tracker

A dark-themed dashboard for tracking startup companies in the radiotherapy and radiopharmaceutical cancer space.

## Features

- **KPI cards** — total companies, total disclosed funding, # clinical-stage, # acquired/M&A
- **4 charts** — breakdown by modality, development stage, funding stage, and HQ region
- **Filterable table** — full-text search + dropdowns for modality, stage, and funding type
- **Sortable columns** — click any column header to sort
- **Company detail modal** — click any row for full company info

## Modalities Tracked

| Modality | Description |
|---|---|
| Radioligand Therapy (RLT) | Lu-177, Cu-67, and other beta-emitting radiopharmaceuticals |
| Targeted Alpha Therapy (TAT) | Ac-225, Pb-212, Ra-224 alpha-emitting agents |
| External Beam Radiotherapy (EBRT) | Advanced linac systems, biology-guided RT |
| Proton Therapy | Compact and full-scale proton accelerators |
| Brachytherapy | Internal/intracavitary radiation sources |
| Radiosensitizer | Drugs that enhance RT efficacy |

## Data

Company data lives in [`data/companies.json`](data/companies.json). Each entry includes:

- Name, website, HQ, founded year
- Modality, technology description, cancer indication
- Development stage (Pre-clinical → Commercial)
- Funding stage, total raised, last funding date, key investors
- Pipeline assets, partnerships, and notes

Data is sourced from public filings, company websites, and press releases. Verify independently before use.

## Adding a Company

Edit `data/companies.json` and add a new object following the existing schema. Increment the `id` field.

## Running Locally

```bash
npx serve .
```

Then open [http://localhost:3000](http://localhost:3000).

## Hosting

Deploy as a static site on Vercel, Netlify, or GitHub Pages (public repo).
