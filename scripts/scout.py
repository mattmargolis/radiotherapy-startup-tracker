"""
Weekly scout: searches ClinicalTrials.gov for radiotherapy/radiopharmaceutical
companies not already in companies.json, and writes a markdown report.
"""

import json
import re
import requests
from datetime import datetime, timedelta
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
COMPANIES_FILE = ROOT / "data" / "companies.json"
META_FILE = ROOT / "data" / "meta.json"
REPORT_FILE = ROOT / "scripts" / "scout_report.md"

SEARCH_TERMS = [
    "radioligand therapy",
    "targeted alpha therapy",
    "radiopharmaceutical",
    "lutetium-177",
    "actinium-225",
    "PSMA radioligand",
    "radioimmunotherapy",
    "FLASH radiotherapy",
    "proton therapy",
    "carbon ion therapy",
    "boron neutron capture",
]

CTGOV_BASE = "https://clinicaltrials.gov/api/v2/studies"

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_existing_companies():
    with open(COMPANIES_FILE) as f:
        return json.load(f)


def existing_names(companies):
    return {c["name"].lower() for c in companies}


def search_ctgov(query, days_back=30):
    """Search ClinicalTrials.gov for studies matching query, updated recently."""
    cutoff = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    params = {
        "query.term": query,
        "filter.advanced": f"AREA[LastUpdatePostDate]RANGE[{cutoff},MAX]",
        "fields": "NCTId,BriefTitle,Condition,InterventionName,LeadSponsorName,OverallStatus,StartDate,Phase",
        "pageSize": 20,
        "format": "json",
    }
    try:
        resp = requests.get(CTGOV_BASE, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("studies", [])
    except Exception as e:
        print(f"  Warning: ClinicalTrials.gov search failed for '{query}': {e}")
        return []


def extract_sponsor(study):
    try:
        return study["protocolSection"]["sponsorCollaboratorsModule"]["leadSponsor"]["name"]
    except (KeyError, TypeError):
        return None


def extract_phase(study):
    try:
        phases = study["protocolSection"]["designModule"].get("phases", [])
        return ", ".join(phases) if phases else "N/A"
    except (KeyError, TypeError):
        return "N/A"


def extract_conditions(study):
    try:
        return study["protocolSection"]["conditionsModule"].get("conditions", [])
    except (KeyError, TypeError):
        return []


def extract_interventions(study):
    try:
        arms = study["protocolSection"].get("armsInterventionsModule", {})
        interventions = arms.get("interventions", [])
        return [i.get("name", "") for i in interventions]
    except (KeyError, TypeError):
        return []


def extract_title(study):
    try:
        return study["protocolSection"]["identificationModule"]["briefTitle"]
    except (KeyError, TypeError):
        return "Unknown"


def extract_nct(study):
    try:
        return study["protocolSection"]["identificationModule"]["nctId"]
    except (KeyError, TypeError):
        return "Unknown"


def extract_status(study):
    try:
        return study["protocolSection"]["statusModule"]["overallStatus"]
    except (KeyError, TypeError):
        return "Unknown"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Loading existing companies...")
    companies = load_existing_companies()
    known = existing_names(companies)
    print(f"  {len(companies)} companies currently tracked.")

    # Collect unique sponsors from ClinicalTrials.gov
    all_sponsors = {}  # sponsor_name -> list of study dicts

    for term in SEARCH_TERMS:
        print(f"Searching ClinicalTrials.gov: '{term}'...")
        studies = search_ctgov(term, days_back=30)
        print(f"  Found {len(studies)} recent studies.")

        for study in studies:
            sponsor = extract_sponsor(study)
            if not sponsor:
                continue
            # Skip if already tracked (fuzzy match on name)
            sponsor_lower = sponsor.lower()
            if any(k in sponsor_lower or sponsor_lower in k for k in known):
                continue
            # Skip generic academic/hospital sponsors
            skip_keywords = [
                "university", "hospital", "institute", "college", "center",
                "clinic", "national cancer", "nci", "nih", "memorial",
                "cancer center", "health system", "school of medicine",
            ]
            if any(kw in sponsor_lower for kw in skip_keywords):
                continue
            if sponsor not in all_sponsors:
                all_sponsors[sponsor] = []
            all_sponsors[sponsor].append(study)

    # Sort by number of active studies (most active first)
    sorted_sponsors = sorted(all_sponsors.items(), key=lambda x: len(x[1]), reverse=True)

    print(f"\nFound {len(sorted_sponsors)} potential new sponsors to review.")

    # ── Write report ──────────────────────────────────────────────────────────
    lines = [
        f"# Weekly Scout Report",
        f"",
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}",
        f"**Search terms:** {', '.join(SEARCH_TERMS)}",
        f"**Lookback window:** 30 days",
        f"",
        f"## Summary",
        f"",
        f"- Existing companies tracked: **{len(companies)}**",
        f"- New potential sponsors found: **{len(sorted_sponsors)}**",
        f"",
        f"---",
        f"",
        f"## Candidate Companies",
        f"",
        f"> These are sponsors with recent radiotherapy trials NOT currently in the dashboard.",
        f"> Verify each before adding to `data/companies.json`.",
        f"",
    ]

    if not sorted_sponsors:
        lines.append("No new candidates found this week.")
    else:
        for sponsor, studies in sorted_sponsors[:30]:  # cap at 30
            lines.append(f"### {sponsor}")
            lines.append(f"")
            lines.append(f"- **Active trials:** {len(studies)}")
            lines.append(f"")
            for study in studies[:3]:  # show up to 3 example trials
                nct = extract_nct(study)
                title = extract_title(study)
                status = extract_status(study)
                phase = extract_phase(study)
                conditions = ", ".join(extract_conditions(study)[:3])
                interventions = ", ".join(extract_interventions(study)[:2])
                lines.append(f"**[{nct}](https://clinicaltrials.gov/study/{nct})** — {title}")
                lines.append(f"  - Status: {status} | Phase: {phase}")
                lines.append(f"  - Condition: {conditions}")
                lines.append(f"  - Intervention: {interventions}")
                lines.append(f"")
            lines.append(f"---")
            lines.append(f"")

    lines += [
        f"## How to Add a Company",
        f"",
        f"1. Research the company at their website and in public databases",
        f"2. Add an entry to `data/companies.json` following the existing schema",
        f"3. Increment the `id` field to the next available integer",
        f"4. Update `LAST_UPDATED` in `app.js`",
        f"",
    ]

    REPORT_FILE.write_text("\n".join(lines))
    print(f"\nReport written to {REPORT_FILE}")

    # Update meta.json with last scout run timestamp
    try:
        meta = json.loads(META_FILE.read_text()) if META_FILE.exists() else {}
        meta["last_scout_run"] = datetime.now().strftime("%Y-%m-%d %H:%M UTC")
        META_FILE.write_text(json.dumps(meta, indent=2))
        print(f"Updated {META_FILE}")
    except Exception as e:
        print(f"Warning: could not update meta.json: {e}")


if __name__ == "__main__":
    main()
