// ===================================================================
// SMART → Borda Decision Support — Script
// Custom modals, in-page judge editor, M3 Expressive styled rendering
// ===================================================================

const model = { criteria: [], alternatives: [], judges: [] };

// ── DOM Helpers ──
function $(id) { return document.getElementById(id); }
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeId(s) { return encodeURIComponent(s).replace(/%/g, ''); }

// ── Custom Modal System ──
// Replaces all native alert(), confirm(), prompt() calls
const Modal = (() => {
  let overlay = null;

  function getOverlay() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function createDialog(content, buttons) {
    const ov = getOverlay();
    ov.innerHTML = '';
    ov.classList.add('active');

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = content;

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    buttons.forEach(btn => {
      const b = document.createElement('button');
      b.textContent = btn.label;
      b.className = btn.className || '';
      b.onclick = () => {
        ov.classList.remove('active');
        setTimeout(() => { ov.innerHTML = ''; }, 300);
        btn.callback();
      };
      actions.appendChild(b);
    });
    dialog.appendChild(actions);
    ov.appendChild(dialog);

    // Focus first input if exists
    requestAnimationFrame(() => {
      const inp = dialog.querySelector('input');
      if (inp) { inp.focus(); inp.select(); }
    });

    // Enter key support
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const primary = actions.querySelector('button:not(.modal-btn-cancel)');
        if (primary) primary.click();
      }
      if (e.key === 'Escape') {
        const cancel = actions.querySelector('.modal-btn-cancel');
        if (cancel) cancel.click();
      }
    });
  }

  return {
    alert(message) {
      return new Promise(resolve => {
        createDialog(
          `<div class="modal-icon"><span class="material-symbols-rounded">info</span></div>
           <div class="modal-message">${escapeHtml(message)}</div>`,
          [{ label: 'OK', className: 'modal-btn-primary', callback: resolve }]
        );
      });
    },

    confirm(message) {
      return new Promise(resolve => {
        createDialog(
          `<div class="modal-icon modal-icon-warning"><span class="material-symbols-rounded">warning</span></div>
           <div class="modal-message">${escapeHtml(message)}</div>`,
          [
            { label: 'Batal', className: 'modal-btn-cancel', callback: () => resolve(false) },
            { label: 'Ya, Lanjut', className: 'modal-btn-danger', callback: () => resolve(true) }
          ]
        );
      });
    },

    prompt(message, defaultValue = '') {
      return new Promise(resolve => {
        createDialog(
          `<div class="modal-icon modal-icon-edit"><span class="material-symbols-rounded">edit</span></div>
           <div class="modal-label">${escapeHtml(message)}</div>
           <input class="modal-input" type="text" value="${escapeHtml(defaultValue)}" />`,
          [
            { label: 'Batal', className: 'modal-btn-cancel', callback: () => resolve(null) },
            {
              label: 'Simpan', className: 'modal-btn-primary', callback: () => {
                const val = overlay.querySelector('.modal-input').value;
                resolve(val);
              }
            }
          ]
        );
      });
    },

    /** Prompt with select dropdown */
    promptSelect(message, options, defaultValue = '') {
      return new Promise(resolve => {
        const opts = options.map(o =>
          `<option value="${escapeHtml(o)}" ${o === defaultValue ? 'selected' : ''}>${escapeHtml(o)}</option>`
        ).join('');
        createDialog(
          `<div class="modal-icon modal-icon-edit"><span class="material-symbols-rounded">tune</span></div>
           <div class="modal-label">${escapeHtml(message)}</div>
           <select class="modal-select">${opts}</select>`,
          [
            { label: 'Batal', className: 'modal-btn-cancel', callback: () => resolve(null) },
            {
              label: 'Simpan', className: 'modal-btn-primary', callback: () => {
                const val = overlay.querySelector('.modal-select').value;
                resolve(val);
              }
            }
          ]
        );
      });
    },

    close() {
      if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => { overlay.innerHTML = ''; }, 300);
      }
    }
  };
})();

// ── Judge Editor Modal ──
const JudgeEditor = (() => {
  let editorOverlay = null;

  function getEditorOverlay() {
    if (!editorOverlay) {
      editorOverlay = document.createElement('div');
      editorOverlay.className = 'modal-overlay judge-editor-overlay';
      document.body.appendChild(editorOverlay);
    }
    return editorOverlay;
  }

  return {
    open(judgeIdx) {
      const j = model.judges[judgeIdx];
      const criteriaList = model.criteria.map(c => c.name);
      const ov = getEditorOverlay();
      ov.innerHTML = '';
      ov.classList.add('active');

      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog judge-editor-dialog';

      // Header
      let html = `
        <div class="judge-editor-header">
          <div class="judge-editor-title">
            <span class="material-symbols-rounded">person</span>
            <h3>Editor Juri: ${escapeHtml(j.name)}</h3>
          </div>
          <button class="judge-editor-close" id="judgeEditorClose">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
      `;

      // Weights table
      html += `
        <div class="judge-editor-section">
          <h4><span class="material-symbols-rounded">balance</span> Bobot Mentah Kriteria</h4>
          <p class="muted">Skala bebas, mis. 1-100</p>
          <div class="judge-editor-table-wrap">
            <table>
              <thead><tr><th>Kriteria</th><th>Tipe</th><th>Bobot</th></tr></thead>
              <tbody>
      `;
      model.criteria.forEach(c => {
        const chipClass = c.type === 'cost' ? 'chip chip-cost' : 'chip chip-benefit';
        html += `<tr>
          <td>${escapeHtml(c.name)}</td>
          <td><span class="${chipClass}">${c.type}</span></td>
          <td><input type="number" class="judge-weight-input" data-criterion="${escapeHtml(c.name)}" value="${j.weights[c.name] || 50}" min="0" /></td>
        </tr>`;
      });
      html += `</tbody></table></div></div>`;

      // Scores table
      html += `
        <div class="judge-editor-section">
          <h4><span class="material-symbols-rounded">scoreboard</span> Skor Alternatif</h4>
          <p class="muted">Skala 0 – 10</p>
          <div class="judge-editor-table-wrap">
            <table>
              <thead><tr><th>Alternatif</th>${criteriaList.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
              <tbody>
      `;
      model.alternatives.forEach((a, ai) => {
        html += `<tr><td>${escapeHtml(a)}</td>`;
        criteriaList.forEach(c => {
          const val = (j.scores[ai] && j.scores[ai][c] !== undefined) ? j.scores[ai][c] : 0;
          html += `<td><input type="number" class="judge-score-input" data-alt="${ai}" data-criterion="${escapeHtml(c)}" value="${val}" min="0" max="10" /></td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div></div>`;

      // Actions
      html += `
        <div class="judge-editor-actions">
          <button class="modal-btn-cancel" id="judgeEditorCancel">
            <span class="material-symbols-rounded">close</span> Batal
          </button>
          <button class="modal-btn-primary" id="judgeEditorSave">
            <span class="material-symbols-rounded">save</span> Simpan
          </button>
        </div>
      `;

      dialog.innerHTML = html;
      ov.appendChild(dialog);

      // Event handlers
      $('judgeEditorClose').onclick = () => this.close();
      $('judgeEditorCancel').onclick = () => this.close();
      $('judgeEditorSave').onclick = () => {
        // Save weights
        dialog.querySelectorAll('.judge-weight-input').forEach(inp => {
          const cName = inp.dataset.criterion;
          j.weights[cName] = Number(inp.value) || 0;
        });
        // Save scores
        dialog.querySelectorAll('.judge-score-input').forEach(inp => {
          const ai = Number(inp.dataset.alt);
          const cName = inp.dataset.criterion;
          if (!j.scores[ai]) j.scores[ai] = {};
          j.scores[ai][cName] = Number(inp.value) || 0;
        });
        this.close();
        renderJudges();
        updateStatus('Juri ' + j.name + ' disimpan');
      };

      // Close on overlay click
      ov.onclick = (e) => {
        if (e.target === ov) this.close();
      };
    },

    close() {
      if (editorOverlay) {
        editorOverlay.classList.remove('active');
        setTimeout(() => { editorOverlay.innerHTML = ''; }, 300);
      }
    }
  };
})();

// ── Renderers ──
function renderCriteria() {
  const tbody = $('criteriaTable').querySelector('tbody');
  tbody.innerHTML = '';
  model.criteria.forEach((c, i) => {
    const tr = document.createElement('tr');
    const chipClass = c.type === 'cost' ? 'chip chip-cost' : 'chip chip-benefit';
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td><span class="${chipClass}">${c.type}</span></td>
      <td class="row-actions">
        <button class="small btn-edit" onclick="editCriterion(${i})"><span class="material-symbols-rounded">edit</span>Edit</button>
        <button class="small btn-delete" onclick="deleteCriterion(${i})"><span class="material-symbols-rounded">delete</span>Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderAlternatives() {
  const tbody = $('alternativesTable').querySelector('tbody');
  tbody.innerHTML = '';
  model.alternatives.forEach((a, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(a)}</td>
      <td>
        <button class="small btn-delete" onclick="deleteAlternative(${i})"><span class="material-symbols-rounded">delete</span>Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderJudges() {
  const tbody = $('judgesTable').querySelector('tbody');
  tbody.innerHTML = '';
  model.judges.forEach((j, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(j.name)}</td>
      <td class="row-actions">
        <button class="small btn-open" onclick="openJudge(${i})"><span class="material-symbols-rounded">open_in_new</span>Open</button>
        <button class="small btn-delete" onclick="deleteJudge(${i})"><span class="material-symbols-rounded">delete</span>Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function updateStatus(msg) {
  $('status').innerHTML = `<div class="status-chip"><span class="material-symbols-rounded" style="font-size:16px">check_circle</span>${escapeHtml(msg)}</div>`;
}

function getRankBadgeClass(rank) {
  if (rank === 1) return 'rank-badge rank-1';
  if (rank === 2) return 'rank-badge rank-2';
  if (rank === 3) return 'rank-badge rank-3';
  return 'rank-badge rank-other';
}

// ── CRUD & Main Logic ──
document.addEventListener('DOMContentLoaded', () => {
  // Criteria
  $('addCriterionBtn').onclick = async () => {
    const name = $('newCriterion').value.trim();
    const type = $('newCriterionType').value;
    if (!name) { await Modal.alert('Isi nama kriteria'); return; }
    model.criteria.push({ name, type });
    model.judges.forEach(j => { j.weights[name] = 50; j.scores.forEach(s => s[name] = 0); });
    $('newCriterion').value = '';
    renderCriteria();
  };

  async function deleteCriterion(i) {
    const ok = await Modal.confirm('Hapus kriteria "' + model.criteria[i].name + '"?');
    if (!ok) return;
    const name = model.criteria[i].name;
    model.criteria.splice(i, 1);
    model.judges.forEach(j => { delete j.weights[name]; j.scores.forEach(s => delete s[name]); });
    renderCriteria();
  }

  async function editCriterion(i) {
    const c = model.criteria[i];
    const newName = await Modal.prompt('Nama kriteria', c.name);
    if (newName === null) return;
    const newType = await Modal.promptSelect('Tipe kriteria', ['benefit', 'cost'], c.type);
    if (newType === null) return;
    const oldName = c.name;
    c.name = newName;
    c.type = newType;
    model.judges.forEach(j => {
      j.weights[newName] = j.weights[oldName] || 50;
      delete j.weights[oldName];
      j.scores.forEach(s => { s[newName] = s[oldName] || 0; delete s[oldName]; });
    });
    renderCriteria();
  }

  // Alternatives
  $('addAltBtn').onclick = async () => {
    const n = $('newAlternative').value.trim();
    if (!n) { await Modal.alert('Isi nama alternatif'); return; }
    model.alternatives.push(n);
    model.judges.forEach(j => j.scores.push(initScoresForAlt()));
    $('newAlternative').value = '';
    renderAlternatives();
  };

  async function deleteAlternative(i) {
    const ok = await Modal.confirm('Hapus alternatif "' + model.alternatives[i] + '"?');
    if (!ok) return;
    model.alternatives.splice(i, 1);
    model.judges.forEach(j => j.scores.splice(i, 1));
    renderAlternatives();
  }

  // Judges
  $('addJudgeBtn').onclick = async () => {
    const n = $('newJudge').value.trim();
    if (!n) { await Modal.alert('Isi nama juri'); return; }
    const j = { name: n, weights: {}, scores: [] };
    model.criteria.forEach(c => j.weights[c.name] = 50);
    model.alternatives.forEach(() => j.scores.push(initScoresForAlt()));
    model.judges.push(j);
    $('newJudge').value = '';
    renderJudges();
  };

  async function deleteJudge(i) {
    const ok = await Modal.confirm('Hapus juri "' + model.judges[i].name + '"?');
    if (!ok) return;
    model.judges.splice(i, 1);
    renderJudges();
  }

  function initScoresForAlt() {
    const obj = {};
    model.criteria.forEach(c => obj[c.name] = 0);
    return obj;
  }

  function openJudge(i) {
    JudgeEditor.open(i);
  }

  // Compute
  async function computeAll() {
    if (model.criteria.length === 0 || model.alternatives.length === 0 || model.judges.length === 0) {
      await Modal.alert('Pastikan minimal 1 kriteria, 1 alternatif, 1 juri');
      return;
    }

    const perJudgeResults = [];
    model.judges.forEach(j => {
      const raw = j.weights;
      const norm = {};
      const keys = Object.keys(raw);
      let sum = 0;
      keys.forEach(k => sum += Number(raw[k] || 0));
      if (sum === 0) sum = 1;
      keys.forEach(k => norm[k] = Number(raw[k] || 0) / sum);

      const utilities = model.alternatives.map(a => {
        const obj = { Member: a };
        keys.forEach(k => obj[k] = 0);
        return obj;
      });

      keys.forEach(k => {
        const arr = model.alternatives.map((a, ai) =>
          (j.scores[ai] && typeof j.scores[ai][k] !== 'undefined') ? Number(j.scores[ai][k]) : 0
        );
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        utilities.forEach((u, ai) => {
          const rawv = arr[ai];
          let util = 50;
          if (max !== min) {
            const crit = model.criteria.find(c => c.name === k);
            if (crit && crit.type === 'cost') {
              util = 100 * (max - rawv) / (max - min);
            } else {
              util = 100 * (rawv - min) / (max - min);
            }
          }
          utilities[ai][k] = util;
        });
      });

      utilities.forEach(u => {
        let total = 0;
        keys.forEach(k => { total += u[k] * norm[k]; });
        u.SMART = total;
        u._weights = norm;
      });
      utilities.sort((a, b) => b.SMART - a.SMART);
      utilities.forEach((u, idx) => u.Rank = idx + 1);
      perJudgeResults.push({ judge: j.name, table: utilities });
    });

    // Borda aggregation
    const N = model.alternatives.length;
    const totals = {};
    model.alternatives.forEach(a => totals[a] = 0);
    perJudgeResults.forEach(p => {
      p.table.forEach(row => { totals[row.Member] += (N + 1 - row.Rank); });
    });
    const final = Object.keys(totals)
      .map(m => ({ Member: m, TotalBorda: totals[m] }))
      .sort((a, b) => b.TotalBorda - a.TotalBorda);

    // Render results
    const out = [];
    out.push('<h4>Per-Judge SMART (utilities & SMART score)</h4>');
    perJudgeResults.forEach(p => {
      out.push(`<h5>${escapeHtml(p.judge)}</h5>`);
      out.push(`<div class="table-wrapper">`);
      out.push(`<table><thead><tr><th>Member</th>${model.criteria.map(c => `<th>${escapeHtml(c.name)}</th>`).join('')}<th>SMART</th><th>Rank</th></tr></thead><tbody>`);
      p.table.forEach(r => {
        const rankClass = getRankBadgeClass(r.Rank);
        out.push(`<tr><td>${escapeHtml(r.Member)}</td>${model.criteria.map(c => `<td>${r[c.name].toFixed(2)}</td>`).join('')}<td><span class="smart-score">${r.SMART.toFixed(4)}</span></td><td><span class="${rankClass}">${r.Rank}</span></td></tr>`);
      });
      out.push(`</tbody></table></div>`);
    });

    out.push('<h4>Final Borda Aggregation</h4>');
    out.push('<div class="table-wrapper">');
    out.push('<table><thead><tr><th>Member</th><th>Total Borda</th><th>Rank</th></tr></thead><tbody>');
    final.forEach((f, i) => {
      const rankClass = getRankBadgeClass(i + 1);
      out.push(`<tr><td>${escapeHtml(f.Member)}</td><td><span class="borda-total">${f.TotalBorda}</span></td><td><span class="${rankClass}">${i + 1}</span></td></tr>`);
    });
    out.push('</tbody></table></div>');
    $('resultsArea').innerHTML = out.join('');
    updateStatus('Compute selesai');
  }

  // Export / Reset
  $('exportBtn').onclick = () => {
    const data = JSON.stringify(model, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart_borda_model.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  $('resetBtn').onclick = async () => {
    const ok = await Modal.confirm('Reset semua data?');
    if (!ok) return;
    model.criteria = [];
    model.alternatives = [];
    model.judges = [];
    renderAll();
    $('resultsArea').innerHTML = '';
    updateStatus('Reset done');
  };

  $('computeBtn').onclick = computeAll;

  // CSV Import Logic
  const importCsvBtn = $('importCsvBtn');
  const csvInput = $('csvInput');

  if (importCsvBtn && csvInput) {
    importCsvBtn.onclick = () => csvInput.click();
    csvInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        try {
          await handleCsvImport(text);
          csvInput.value = ''; // Reset input
        } catch (err) {
          console.error(err);
          await Modal.alert('Gagal mengimpor CSV: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
  }

  // Weight Import Logic
  const importWeightBtn = $('importWeightBtn');
  const weightInput = $('weightInput');

  if (importWeightBtn && weightInput) {
    importWeightBtn.onclick = () => {
      if (model.criteria.length === 0) {
        Modal.alert('Impor Data Kuesioner terlebih dahulu untuk menentukan kriteria.');
        return;
      }
      weightInput.click();
    };
    weightInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        try {
          await handleWeightImport(text);
          weightInput.value = ''; // Reset input
        } catch (err) {
          console.error(err);
          await Modal.alert('Gagal mengimpor bobot: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
  }

  async function handleWeightImport(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV minimal harus memiliki header dan satu baris data.');

    const headers = lines[0].split(',').map(h => h.trim()).filter(h => h.length > 0);
    // Column 0 assumed to be Judge name
    if (headers.length < 2) throw new Error('Format CSV tidak valid. Harus ada kolom Judge dan minimal 1 kolom Bobot.');

    const weightHeaders = headers.slice(1);
    let judgesUpdated = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < 2 || !cols[0]) continue;

      const judgeName = cols[0];
      // Try to find judge in model - loose match (substring or case-insensitive)
      const judge = model.judges.find(j => 
        j.name.toLowerCase().includes(judgeName.toLowerCase()) || 
        judgeName.toLowerCase().includes(j.name.toLowerCase())
      );

      if (judge) {
        weightHeaders.forEach((wCrit, idx) => {
          const val = Number(cols[idx + 1]);
          if (isNaN(val)) return;

          // Find matching criterion in model - loose match
          const crit = model.criteria.find(c => 
            c.name.toLowerCase() === wCrit.toLowerCase() ||
            // Handle common Indonesian/English variants if needed, or just let users ensure names are similar
            (wCrit.toLowerCase() === 'respon perintah' && c.name.toLowerCase() === 'command response')
          );

          if (crit) {
            judge.weights[crit.name] = val;
          }
        });
        judgesUpdated++;
      }
    }

    renderJudges();
    $('resultsArea').innerHTML = '';
    updateStatus('Import Bobot berhasil: ' + judgesUpdated + ' juri diperbarui');
  }

  async function handleCsvImport(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV minimal harus memiliki header dan satu baris data.');

    const headers = lines[0].split(',').map(h => h.trim());
    // Assume: 0: Judge, 1: Member, 2+: Criteria
    if (headers.length < 3) throw new Error('Format CSV tidak valid. Harus ada Judge, Member, dan minimal 1 Kriteria.');

    const csvCriteria = headers.slice(2);
    
    // Reset model
    model.criteria = csvCriteria.map(name => ({ name, type: 'benefit' }));
    model.alternatives = [];
    model.judges = [];

    const judgesMap = {}; // { judgeName: { name, weights, scoresMap: { memberName: { critName: score } } } }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) continue;

      const judgeName = cols[0];
      const memberName = cols[1];

      if (!judgeName || !memberName) continue;

      if (!model.alternatives.includes(memberName)) {
        model.alternatives.push(memberName);
      }

      if (!judgesMap[judgeName]) {
        judgesMap[judgeName] = {
          name: judgeName,
          weights: {},
          scoresMap: {}
        };
        model.criteria.forEach(c => judgesMap[judgeName].weights[c.name] = 50);
      }

      if (!judgesMap[judgeName].scoresMap[memberName]) {
        judgesMap[judgeName].scoresMap[memberName] = {};
      }

      csvCriteria.forEach((crit, idx) => {
        const val = Number(cols[idx + 2]) || 0;
        judgesMap[judgeName].scoresMap[memberName][crit] = val;
      });
    }

    // Convert judgesMap back to model.judges
    Object.values(judgesMap).forEach(jData => {
      const judge = {
        name: jData.name,
        weights: jData.weights,
        scores: [] // Array of { critName: score } following model.alternatives order
      };

      model.alternatives.forEach(altName => {
        const altScores = jData.scoresMap[altName] || {};
        const scoreObj = {};
        model.criteria.forEach(c => {
          scoreObj[c.name] = altScores[c.name] || 0;
        });
        judge.scores.push(scoreObj);
      });

      model.judges.push(judge);
    });

    renderAll();
    $('resultsArea').innerHTML = '';
    updateStatus('Import CSV berhasil: ' + model.judges.length + ' juri, ' + model.alternatives.length + ' alternatif');
  }

  function renderAll() { renderCriteria(); renderAlternatives(); renderJudges(); }

  // Expose for inline onclick
  window.editCriterion = editCriterion;
  window.deleteCriterion = deleteCriterion;
  window.deleteAlternative = deleteAlternative;
  window.deleteJudge = deleteJudge;
  window.openJudge = openJudge;

  // Seed initial data
  (function seed() {
    const initialCriteria = [
      'Synchronization', 'Marching Accuracy', 'Flag Handling', 'Command Response',
      'Physical Appearance', 'Time Accuracy', 'Protocol',
      'Teamwork and Communication', 'Discipline', 'Cohesiveness', 'Responsibility'
    ];
    initialCriteria.forEach(c => model.criteria.push({ name: c, type: 'benefit' }));
    model.alternatives.push(
      'raniah yulia yasmin 9a', 'okta dina andriyanti 9b',
      'maida kenzi kayana 9a', 'verlita eka putri 8d'
    );
    model.judges.push({ name: 'Sample Judge', weights: {}, scores: [] });
    model.criteria.forEach(c => model.judges[0].weights[c.name] = 50);
    model.alternatives.forEach(() => model.judges[0].scores.push(initScoresForAlt()));
    renderAll();
  })();
});