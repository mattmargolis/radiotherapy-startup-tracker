/* ── Radiotherapy Startup Tracker — app.js ── */

const DATA_URL = 'data/companies.json';
const META_URL = 'data/meta.json';

let allCompanies = [];
let filtered = [];
let sortCol = 'name';
let sortDir = 'asc';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v) {
  if (v === null || v === undefined || v === '') return '<span style="color:var(--text-dim)">—</span>';
  return v;
}

function fmtFunding(v) {
  if (v === null || v === undefined) return '<span style="color:var(--text-dim)">—</span>';
  return `<span class="funding-value">$${Number(v).toLocaleString()}M</span>`;
}

function modalityTag(m) {
  const map = {
    'Radioligand Therapy (RLT)':        'tag-rlt',
    'Targeted Alpha Therapy (TAT)':     'tag-tat',
    'External Beam Radiotherapy (EBRT)':'tag-ebrt',
    'Proton Therapy':                   'tag-proton',
    'Brachytherapy':                    'tag-brachy',
    'Radiosensitizer':                  'tag-radio',
  };
  const cls = map[m] || 'tag-other';
  return `<span class="tag ${cls}">${m || '—'}</span>`;
}

function stageTag(s) {
  const map = {
    'Commercial':          'tag-commercial',
    'Clinical Phase III':  'tag-phase3',
    'Clinical Phase II/III':'tag-phase3',
    'Clinical Phase I/II': 'tag-phase12',
    'Clinical Phase I':    'tag-phase12',
    'Pre-clinical':        'tag-preclin',
  };
  const cls = map[s] || 'tag-other';
  return `<span class="tag ${cls}">${s || '—'}</span>`;
}

function fundingTag(f) {
  const map = {
    'Public':    'tag-public',
    'Acquired':  'tag-acquired',
    'Series C':  'tag-seriesc',
    'Series B':  'tag-seriesb',
    'Series A':  'tag-seriesa',
    'Private':   'tag-private',
  };
  const cls = map[f] || 'tag-other';
  return `<span class="tag ${cls}">${f || '—'}</span>`;
}

function regionTag(r) {
  const map = {
    'US-Canada':      'tag-region-us',
    'EU-Middle East': 'tag-region-eu',
    'Aus-Asia':       'tag-region-asia',
  };
  const cls = map[r] || 'tag-other';
  return `<span class="tag ${cls}">${r || '—'}</span>`;
}

function listCells(arr) {
  if (!arr || !arr.length) return '<span style="color:var(--text-dim)">—</span>';
  return `<div class="cell-list">${arr.map(i => `<span class="cell-list-item">${i}</span>`).join('')}</div>`;
}

function tagList(arr) {
  if (!arr || !arr.length) return '<span style="color:var(--text-dim)">—</span>';
  return arr.map(v => `<span class="tag tag-small">${v}</span>`).join(' ');
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

function updateKPIs(data) {
  document.getElementById('kpi-total').textContent = data.length;

  const totalFunding = data.reduce((s, c) => s + (c.total_funding_usd_m || 0), 0);
  document.getElementById('kpi-funding').textContent =
    totalFunding > 0 ? `$${(totalFunding / 1000).toFixed(1)}B` : '—';

  const clinical = data.filter(c =>
    c.stage && (c.stage.toLowerCase().includes('clinical') || c.stage === 'Clinical Phase III')
  ).length;
  document.getElementById('kpi-clinical').textContent = clinical;

  const acquired = data.filter(c => c.funding_stage === 'Acquired').length;
  document.getElementById('kpi-acquired').textContent = acquired;
}

// ── Charts ───────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#0e9e94','#d48a1a','#d44a4a','#6a5acd','#3182ce','#b07d15','#6b7a8d','#10b981','#e0579a','#f59e0b','#8b5cf6','#ef4444','#14b8a6','#f97316','#6366f1'];

let chartInstances = {};

function countBy(data, key) {
  const counts = {};
  data.forEach(d => {
    const val = d[key] || 'Unknown';
    counts[val] = (counts[val] || 0) + 1;
  });
  return counts;
}

function countByArray(data, key, topN) {
  const counts = {};
  data.forEach(d => {
    const arr = d[key];
    if (arr && Array.isArray(arr)) {
      arr.forEach(val => {
        if (val && val.trim()) {
          counts[val] = (counts[val] || 0) + 1;
        }
      });
    }
  });
  // Sort by count descending and take topN
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (topN && sorted.length > topN) {
    const top = sorted.slice(0, topN);
    const otherCount = sorted.slice(topN).reduce((s, e) => s + e[1], 0);
    if (otherCount > 0) top.push(['Other', otherCount]);
    return Object.fromEntries(top);
  }
  return Object.fromEntries(sorted);
}

function makeChart(id, type, labels, values, colors) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (chartInstances[id]) chartInstances[id].destroy();

  chartInstances[id] = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors || CHART_COLORS,
        borderColor: '#ffffff',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: type === 'doughnut',
          position: 'bottom',
          labels: {
            color: '#6b7a8d',
            font: { size: 11, family: 'Inter' },
            boxWidth: 12,
            padding: 10,
          }
        },
        tooltip: {
          backgroundColor: '#1a2332',
          borderColor: '#2a3a4d',
          borderWidth: 1,
          titleColor: '#ffffff',
          bodyColor: '#c0c8d4',
          titleFont: { family: 'Inter' },
          bodyFont: { family: 'Inter' },
        }
      },
      scales: type === 'bar' ? {
        x: {
          ticks: { color: '#6b7a8d', font: { size: 10, family: 'Inter' }, maxRotation: 45, minRotation: 0 },
          grid: { color: '#e5e8ed' }
        },
        y: {
          ticks: { color: '#6b7a8d', font: { size: 10, family: 'Inter' } },
          grid: { color: '#e5e8ed' },
          beginAtZero: true,
          precision: 0,
        }
      } : {}
    }
  });
}

function updateCharts(data) {
  // Modality — bar
  const modCounts = countBy(data, 'modality');
  const modShort = {
    'Radioligand Therapy (RLT)':         'RLT',
    'Targeted Alpha Therapy (TAT)':      'TAT',
    'External Beam Radiotherapy (EBRT)': 'EBRT',
    'Proton Therapy':                    'Proton',
    'Brachytherapy':                     'Brachy',
    'Radiosensitizer':                   'Radiosensitizer',
  };
  const modLabels = Object.keys(modCounts).map(k => modShort[k] || k);
  makeChart('chart-modality', 'bar', modLabels, Object.values(modCounts));

  // Stage — doughnut
  const stageCounts = countBy(data, 'stage');
  makeChart('chart-stage', 'doughnut', Object.keys(stageCounts), Object.values(stageCounts));

  // Funding — doughnut
  const fundCounts = countBy(data, 'funding_stage');
  makeChart('chart-funding', 'doughnut', Object.keys(fundCounts), Object.values(fundCounts));

  // Region — bar
  const regionCounts = countBy(data, 'region');
  const regionColors = Object.keys(regionCounts).map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  makeChart('chart-region', 'bar', Object.keys(regionCounts), Object.values(regionCounts), regionColors);

  // Isotope — bar (top 12)
  const isoCounts = countByArray(data, 'isotopes', 12);
  makeChart('chart-isotope', 'bar', Object.keys(isoCounts), Object.values(isoCounts));

  // Target — bar (top 12)
  const tgtCounts = countByArray(data, 'targets', 12);
  makeChart('chart-target', 'bar', Object.keys(tgtCounts), Object.values(tgtCounts));
}

// ── Filters / Dropdowns ───────────────────────────────────────────────────────

function populateDropdown(id, data, key) {
  const sel = document.getElementById(id);
  const vals = [...new Set(data.map(d => d[key]).filter(Boolean))].sort();
  vals.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

function populateArrayDropdown(id, data, key) {
  const sel = document.getElementById(id);
  const valSet = new Set();
  data.forEach(d => {
    if (d[key] && Array.isArray(d[key])) {
      d[key].forEach(v => { if (v && v.trim()) valSet.add(v); });
    }
  });
  [...valSet].sort().forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

// ── Table ─────────────────────────────────────────────────────────────────────

function renderTable(data) {
  const tbody = document.getElementById('table-body');
  document.getElementById('row-count').textContent = `Showing ${data.length} compan${data.length === 1 ? 'y' : 'ies'}`;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--text-dim)">No companies match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr data-id="${c.id}">
      <td class="cell-name">
        <a href="${c.website}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${c.name}</a>
      </td>
      <td>${regionTag(c.region)}</td>
      <td>${modalityTag(c.modality)}</td>
      <td>${stageTag(c.stage)}</td>
      <td>${tagList(c.isotopes)}</td>
      <td>${tagList(c.targets)}</td>
      <td style="font-size:0.78rem;color:var(--text-dim)">${fmt(c.moa)}</td>
      <td>${fundingTag(c.funding_stage)}</td>
      <td>${fmtFunding(c.total_funding_usd_m)}</td>
      <td>${listCells(c.pipeline)}</td>
      <td class="cell-notes">
        <div class="cell-notes-text">${c.notes || '—'}</div>
        ${c.notes ? `<div class="cell-notes-popover">${c.notes}</div>` : ''}
      </td>
    </tr>
  `).join('');

  // Row click → modal
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt(row.dataset.id);
      openModal(allCompanies.find(c => c.id === id));
    });
  });
}

// ── Sorting ───────────────────────────────────────────────────────────────────

function sortData(data) {
  return [...data].sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (av === null || av === undefined) av = '';
    if (bv === null || bv === undefined) bv = '';
    if (Array.isArray(av)) av = av.join(', ');
    if (Array.isArray(bv)) bv = bv.join(', ');
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

document.querySelectorAll('thead th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortCol === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = col;
      sortDir = 'asc';
    }
    document.querySelectorAll('thead th').forEach(h => {
      h.classList.remove('sort-asc', 'sort-desc');
    });
    th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    applyFilters();
  });
});

// ── Filter Logic ──────────────────────────────────────────────────────────────

function applyFilters() {
  const search   = document.getElementById('search-input').value.toLowerCase().trim();
  const modality = document.getElementById('filter-modality').value;
  const stage    = document.getElementById('filter-stage').value;
  const funding  = document.getElementById('filter-funding').value;
  const region   = document.getElementById('filter-region').value;
  const isotope  = document.getElementById('filter-isotope').value;
  const target   = document.getElementById('filter-target').value;

  filtered = allCompanies.filter(c => {
    if (modality && c.modality !== modality) return false;
    if (stage    && c.stage    !== stage)    return false;
    if (funding  && c.funding_stage !== funding) return false;
    if (region   && c.region   !== region)  return false;
    if (isotope  && (!c.isotopes || !c.isotopes.some(i => i === isotope))) return false;
    if (target   && (!c.targets || !c.targets.some(t => t === target))) return false;
    if (search) {
      const haystack = [
        c.name, c.hq, c.description, c.technology, c.indication,
        c.modality, c.stage, c.funding_stage, c.region, c.moa,
        ...(c.isotopes || []), ...(c.targets || []),
        ...(c.key_investors || []), ...(c.pipeline || []), c.notes
      ].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  renderTable(sortData(filtered));
  updateKPIs(filtered);
  updateCharts(filtered);
}

document.getElementById('search-input').addEventListener('input', applyFilters);
document.getElementById('filter-modality').addEventListener('change', applyFilters);
document.getElementById('filter-stage').addEventListener('change', applyFilters);
document.getElementById('filter-funding').addEventListener('change', applyFilters);
document.getElementById('filter-region').addEventListener('change', applyFilters);
document.getElementById('filter-isotope').addEventListener('change', applyFilters);
document.getElementById('filter-target').addEventListener('change', applyFilters);
document.getElementById('btn-reset').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-modality').value = '';
  document.getElementById('filter-stage').value = '';
  document.getElementById('filter-funding').value = '';
  document.getElementById('filter-region').value = '';
  document.getElementById('filter-isotope').value = '';
  document.getElementById('filter-target').value = '';
  applyFilters();
});

// ── Export CSV ──────────────────────────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', () => {
  const cols = ['name','hq','region','founded','modality','technology','indication','stage',
                'funding_stage','total_funding_usd_m','isotopes','targets','moa',
                'key_investors','pipeline','notes'];
  const headers = ['Company','HQ','Region','Founded','Modality','Technology','Indication',
                   'Dev Stage','Funding Stage','Total Raised ($M)','Isotopes','Targets','MOA',
                   'Key Investors','Pipeline','Notes'];
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('; ') : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [headers.join(',')];
  (filtered.length ? filtered : allCompanies).forEach(c => {
    rows.push(cols.map(col => esc(c[col])).join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'radiotherapy_companies.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(c) {
  if (!c) return;
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-company-name"><a href="${c.website}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">${c.name} ↗</a></div>
    <div class="modal-company-meta">${c.hq || ''} ${c.founded ? '&bull; Founded ' + c.founded : ''}</div>
    <div class="modal-tags">
      ${regionTag(c.region)}
      ${modalityTag(c.modality)}
      ${stageTag(c.stage)}
      ${fundingTag(c.funding_stage)}
    </div>

    ${c.description ? `
    <div class="modal-section">
      <div class="modal-section-title">Description</div>
      <div class="modal-section-body">${c.description}</div>
    </div>` : ''}

    ${c.technology ? `
    <div class="modal-section">
      <div class="modal-section-title">Technology</div>
      <div class="modal-section-body">${c.technology}</div>
    </div>` : ''}

    ${c.indication ? `
    <div class="modal-section">
      <div class="modal-section-title">Indication(s)</div>
      <div class="modal-section-body">${c.indication}</div>
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-section-title">Isotope(s)</div>
      <div class="modal-section-body">${c.isotopes && c.isotopes.length ? c.isotopes.join(', ') : '—'}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Target(s)</div>
      <div class="modal-section-body">${c.targets && c.targets.length ? c.targets.join(', ') : '—'}</div>
    </div>

    ${c.moa ? `
    <div class="modal-section">
      <div class="modal-section-title">Mechanism of Action</div>
      <div class="modal-section-body">${c.moa}</div>
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-section-title">Pipeline</div>
      <div class="modal-section-body">${c.pipeline && c.pipeline.length ? c.pipeline.map(p => `• ${p}`).join('<br>') : '—'}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Funding</div>
      <div class="modal-section-body">
        ${c.total_funding_usd_m ? `<strong>Total raised:</strong> $${c.total_funding_usd_m}M<br>` : ''}
        ${c.last_funding_date ? `<strong>Last round:</strong> ${c.last_funding_date}<br>` : ''}
        ${c.key_investors && c.key_investors.length ? `<strong>Investors:</strong> ${c.key_investors.join(', ')}` : ''}
      </div>
    </div>

    ${c.partnerships && c.partnerships.length ? `
    <div class="modal-section">
      <div class="modal-section-title">Partnerships / M&amp;A</div>
      <div class="modal-section-body">${c.partnerships.map(p => `• ${p}`).join('<br>')}</div>
    </div>` : ''}

    ${c.notes ? `
    <div class="modal-section">
      <div class="modal-section-title">Notes</div>
      <div class="modal-section-body">${c.notes}</div>
    </div>` : ''}

    <a class="modal-link" href="${c.website}" target="_blank" rel="noopener">Visit website ↗</a>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.add('hidden');
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('modal-overlay').classList.add('hidden');
});

// ── M&A Deal Flow ────────────────────────────────────────────────────────

const DEALS = [
  { date: '2025-11', acquirer: 'CapVest Partners', target: 'Curium Pharma', value: '~$7.0B', type: 'recap', context: 'Largest transaction in nuclear medicine globally. Recapitalization to accelerate growth.' },
  { date: '2024-01', acquirer: 'Bristol Myers Squibb', target: 'RayzeBio', value: '$4.1B', type: 'acquisition', context: 'Ac-225 targeted alpha therapy platform for solid tumors.' },
  { date: '2024-03', acquirer: 'AstraZeneca', target: 'Fusion Pharmaceuticals', value: '$2.4B', type: 'acquisition', context: 'Ac-225 radioimmunotherapy; PSMA + EGFR/cMET pipeline.' },
  { date: '2023-10', acquirer: 'Eli Lilly', target: 'POINT Biopharma', value: '$1.4B', type: 'acquisition', context: 'Lu-177 PSMA therapy for mCRPC. PNT2002 since deprioritized.' },
  { date: '2024-09', acquirer: 'Novartis', target: 'Mariana Oncology', value: '$1.0B+', type: 'acquisition', context: 'Ac-225 TAT for SCLC. $1B upfront + $750M milestones.' },
  { date: '2025-06', acquirer: 'BMS/RayzeBio', target: 'Philochem (license)', value: '$1.0B+', type: 'partnership', context: '$350M upfront + $1B+ milestones for OncoACP3 prostate cancer program.' },
  { date: '2024-06', acquirer: 'Eli Lilly', target: 'Radionetics Oncology', value: '$1.0B+', type: 'partnership', context: '$140M upfront + $1B acquisition option. GPCR-targeted RLT.' },
  { date: '2024-01', acquirer: 'Eli Lilly', target: 'Aktis Oncology', value: '$1.1B+', type: 'partnership', context: '$60M upfront + $1.1B milestones. Mini-protein RLT platform.' },
  { date: '2026-01', acquirer: 'Aktis Oncology', target: 'IPO (NASDAQ: AKTS)', value: '$318M', type: 'ipo', context: 'First biotech IPO of 2026. Lilly purchased $100M of shares.' },
  { date: '2024-09', acquirer: 'Sanofi', target: 'RadioMedix (AlphaMedix)', value: 'Undisclosed', type: 'partnership', context: 'Exclusive global license for 212Pb-DOTAMTATE for NETs. Entering Phase III.' },
];

function renderDealFlow() {
  const summary = document.getElementById('deal-flow-summary');
  const timeline = document.getElementById('deal-timeline');

  const totalAcqValue = [4.1, 2.4, 1.4, 1.0];
  const totalDealCount = DEALS.length;
  const acquirerSet = new Set(DEALS.filter(d => d.type === 'acquisition').map(d => d.acquirer));

  summary.innerHTML = `
    <div class="deal-summary-card">
      <div class="deal-summary-value" style="color:var(--accent4)">$${totalAcqValue.reduce((a, b) => a + b, 0).toFixed(1)}B+</div>
      <div class="deal-summary-label">Acquisition Value (2023-2026)</div>
    </div>
    <div class="deal-summary-card">
      <div class="deal-summary-value" style="color:var(--accent)">${totalDealCount}</div>
      <div class="deal-summary-label">Major Transactions</div>
    </div>
    <div class="deal-summary-card">
      <div class="deal-summary-value" style="color:var(--accent2)">${acquirerSet.size}</div>
      <div class="deal-summary-label">Strategic Acquirers</div>
    </div>
  `;

  const typeLabel = { acquisition: 'Acquisition', partnership: 'Partnership', recap: 'Recap', ipo: 'IPO' };
  const typeClass = { acquisition: 'deal-type-acquisition', partnership: 'deal-type-partnership', recap: 'deal-type-recap', ipo: 'deal-type-ipo' };

  const sorted = [...DEALS].sort((a, b) => b.date.localeCompare(a.date));

  timeline.innerHTML = `
    <div class="deal-timeline-inner">
      <div class="deal-timeline-header">
        <div>Date</div>
        <div>Transaction</div>
        <div>Type</div>
        <div>Value</div>
        <div>Context</div>
      </div>
      ${sorted.map(d => `
        <div class="deal-row">
          <div class="deal-date">${d.date}</div>
          <div class="deal-parties">
            <span class="deal-acquirer">${d.acquirer}</span>
            <span class="deal-arrow">&rarr;</span>
            <span class="deal-target">${d.target}</span>
          </div>
          <div><span class="deal-type-tag ${typeClass[d.type]}">${typeLabel[d.type]}</span></div>
          <div class="deal-value">${d.value}</div>
          <div class="deal-context">${d.context}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Competitive Landscape Matrix (Dynamic) ───────────────────────────────

function renderLandscapeMatrix() {
  const table = document.getElementById('landscape-table');

  // Build landscape data dynamically from company records
  const landscapeData = [];
  allCompanies.forEach(c => {
    if (!c.isotopes || !c.targets) return;
    c.targets.forEach(target => {
      c.isotopes.forEach(isotope => {
        // Skip generic isotopes
        if (['Alpha', 'Beta', 'Undisclosed'].includes(isotope)) return;
        landscapeData.push({
          company: c.name.replace(/ Holdings| Pharmaceuticals| Therapeutics| Biosciences| Medical| Pharma/g, '').trim(),
          target,
          isotope,
          stage: c.stage || 'Unknown',
        });
      });
    });
  });

  // Collect unique targets and isotopes
  const targetCounts = {};
  landscapeData.forEach(d => { targetCounts[d.target] = (targetCounts[d.target] || 0) + 1; });
  // Show top 15 targets by frequency
  const targets = Object.entries(targetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(e => e[0]);

  const isotopeOrder = ['Lu-177', 'Ac-225', 'Pb-212', 'Cu-67', 'Cu-64', 'I-131', 'I-125', 'At-211', 'F-18', 'Zr-89', 'Ra-224', 'Y-90', 'Re-188', 'Tb-161', 'Sm-153'];
  const isotopeSet = new Set(landscapeData.map(d => d.isotope));
  const isotopes = isotopeOrder.filter(i => isotopeSet.has(i));
  // Add any isotopes not in the predefined order
  isotopeSet.forEach(i => { if (!isotopes.includes(i)) isotopes.push(i); });

  function chipClass(stage) {
    const s = stage.toLowerCase();
    if (s.includes('commercial') || s.includes('nda')) return 'landscape-chip-commercial';
    if (s.includes('pre-clinical') || s.includes('preclinical')) return 'landscape-chip-preclinical';
    if (s.includes('acquired')) return 'landscape-chip-acquired';
    return 'landscape-chip-clinical';
  }

  let html = '<thead><tr><th>Target \\ Isotope</th>';
  isotopes.forEach(iso => { html += `<th>${iso}</th>`; });
  html += '</tr></thead><tbody>';

  targets.forEach(target => {
    html += `<tr><td>${target}</td>`;
    isotopes.forEach(iso => {
      const entries = landscapeData.filter(d => d.target === target && d.isotope === iso);
      if (entries.length === 0) {
        html += '<td><span class="landscape-empty">&mdash;</span></td>';
      } else {
        // Deduplicate by company name
        const seen = new Set();
        const unique = entries.filter(e => {
          if (seen.has(e.company)) return false;
          seen.add(e.company);
          return true;
        });
        html += '<td><div class="landscape-cell">';
        unique.forEach(e => {
          html += `<span class="landscape-chip ${chipClass(e.stage)}" title="${e.stage}">${e.company}</span>`;
        });
        html += '</div></td>';
      }
    });
    html += '</tr>';
  });

  html += '</tbody>';
  table.innerHTML = html;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function loadMeta() {
  try {
    const res = await fetch(META_URL);
    const meta = await res.json();
    document.getElementById('disclaimer-date').textContent = meta.last_updated || '—';
    const footerDate = document.getElementById('footer-date');
    if (footerDate) footerDate.textContent = meta.last_updated || '—';
  } catch {
    // meta.json missing or malformed — leave defaults
  }
}

async function init() {
  await loadMeta();

  const res = await fetch(DATA_URL);
  allCompanies = await res.json();
  filtered = [...allCompanies];

  populateDropdown('filter-modality', allCompanies, 'modality');
  populateDropdown('filter-stage',    allCompanies, 'stage');
  populateDropdown('filter-funding',  allCompanies, 'funding_stage');
  populateDropdown('filter-region',   allCompanies, 'region');
  populateArrayDropdown('filter-isotope', allCompanies, 'isotopes');
  populateArrayDropdown('filter-target',  allCompanies, 'targets');

  updateKPIs(filtered);
  updateCharts(filtered);
  renderDealFlow();
  renderLandscapeMatrix();
  renderTable(sortData(filtered));
}

init();
