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
    'Commercial':        'tag-commercial',
    'Clinical Phase III':'tag-phase3',
    'Clinical Phase I/II':'tag-phase12',
    'Pre-clinical':      'tag-preclin',
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

function hqRegion(hq) {
  if (!hq) return 'Other';
  const lower = hq.toLowerCase();
  if (lower.includes('canada') || lower.includes('ontario')) return 'Canada';
  if (lower.includes('australia')) return 'Australia';
  if (lower.includes('israel')) return 'Israel';
  if (lower.includes('uk') || lower.includes('united kingdom')) return 'UK';
  if (lower.includes('germany') || lower.includes('france') || lower.includes('switzerland')) return 'Europe';
  // US states
  const usStates = [', ca', ', ma', ', ny', ', tx', ', mn', ', nc', ', mo', ', wa', ', fl', ', pa', ', nj', ', oh'];
  if (usStates.some(s => lower.endsWith(s))) return 'USA';
  return 'Other';
}

function listCells(arr) {
  if (!arr || !arr.length) return '<span style="color:var(--text-dim)">—</span>';
  return `<div class="cell-list">${arr.map(i => `<span class="cell-list-item">${i}</span>`).join('')}</div>`;
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

const CHART_COLORS = ['#4f8ef7','#fb7185','#38d9a9','#c084fc','#f77c4f','#facc15','#94a3b8','#34d399','#f472b6'];

let chartInstances = {};

function countBy(data, key) {
  const counts = {};
  data.forEach(d => {
    const val = d[key] || 'Unknown';
    counts[val] = (counts[val] || 0) + 1;
  });
  return counts;
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
        borderColor: '#0a0d14',
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
            color: '#7888a8',
            font: { size: 11 },
            boxWidth: 12,
            padding: 10,
          }
        },
        tooltip: {
          backgroundColor: '#181d2e',
          borderColor: '#232840',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: '#7888a8',
        }
      },
      scales: type === 'bar' ? {
        x: {
          ticks: { color: '#7888a8', font: { size: 10 } },
          grid: { color: '#232840' }
        },
        y: {
          ticks: { color: '#7888a8', font: { size: 10 } },
          grid: { color: '#232840' },
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
  const regionCounts = {};
  data.forEach(c => {
    const r = hqRegion(c.hq);
    regionCounts[r] = (regionCounts[r] || 0) + 1;
  });
  const regionColors = Object.keys(regionCounts).map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  makeChart('chart-region', 'bar', Object.keys(regionCounts), Object.values(regionCounts), regionColors);
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

// ── Table ─────────────────────────────────────────────────────────────────────

function renderTable(data) {
  const tbody = document.getElementById('table-body');
  document.getElementById('row-count').textContent = `Showing ${data.length} compan${data.length === 1 ? 'y' : 'ies'}`;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:2rem;color:var(--text-dim)">No companies match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr data-id="${c.id}">
      <td class="cell-name">
        <a href="${c.website}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${c.name}</a>
      </td>
      <td>${fmt(c.hq)}</td>
      <td>${fmt(c.founded)}</td>
      <td>${modalityTag(c.modality)}</td>
      <td style="max-width:180px;font-size:0.78rem;color:var(--text-dim)">${fmt(c.technology)}</td>
      <td style="max-width:180px;font-size:0.78rem;color:var(--text-dim)">${fmt(c.indication)}</td>
      <td>${stageTag(c.stage)}</td>
      <td>${fundingTag(c.funding_stage)}</td>
      <td>${fmtFunding(c.total_funding_usd_m)}</td>
      <td>${listCells(c.key_investors)}</td>
      <td>${listCells(c.pipeline)}</td>
      <td class="cell-notes">${fmt(c.notes)}</td>
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

  filtered = allCompanies.filter(c => {
    if (modality && c.modality !== modality) return false;
    if (stage    && c.stage    !== stage)    return false;
    if (funding  && c.funding_stage !== funding) return false;
    if (search) {
      const haystack = [
        c.name, c.hq, c.description, c.technology, c.indication,
        c.modality, c.stage, c.funding_stage,
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
document.getElementById('btn-reset').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-modality').value = '';
  document.getElementById('filter-stage').value = '';
  document.getElementById('filter-funding').value = '';
  applyFilters();
});

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(c) {
  if (!c) return;
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-company-name"><a href="${c.website}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">${c.name} ↗</a></div>
    <div class="modal-company-meta">${c.hq || ''} ${c.founded ? '&bull; Founded ' + c.founded : ''}</div>
    <div class="modal-tags">
      ${modalityTag(c.modality)}
      ${stageTag(c.stage)}
      ${fundingTag(c.funding_stage)}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Description</div>
      <div class="modal-section-body">${c.description || '—'}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Technology</div>
      <div class="modal-section-body">${c.technology || '—'}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Indication(s)</div>
      <div class="modal-section-body">${c.indication || '—'}</div>
    </div>

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

// ── Init ──────────────────────────────────────────────────────────────────────

async function loadMeta() {
  try {
    const res = await fetch(META_URL);
    const meta = await res.json();
    document.getElementById('status-last-updated').textContent = meta.last_updated || '—';
    document.getElementById('status-last-scout').textContent = meta.last_scout_run || 'Never';
    document.getElementById('status-search-window').textContent = meta.search_window || '—';
    document.getElementById('status-refresh').textContent = meta.refresh_command || '—';
    document.getElementById('disclaimer-date').textContent = meta.last_updated || '—';
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

  updateKPIs(filtered);
  updateCharts(filtered);
  renderTable(sortData(filtered));
}

init();
