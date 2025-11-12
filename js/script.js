// Simple in-memory model
const model = {criteria:[],alternatives:[],judges:[]};

// Helpers
function $(id){return document.getElementById(id)}
function renderCriteria(){
  const tbody = $('criteriaTable').querySelector('tbody'); tbody.innerHTML='';
  model.criteria.forEach((c,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(c.name)}</td><td>${c.type}</td><td class='row-actions'><button class='small' data-idx='${i}' onclick='editCriterion(${i})'>Edit</button><button class='small' onclick='deleteCriterion(${i})'>Hapus</button></td>`;
    tbody.appendChild(tr);
  })
}
function renderAlternatives(){
  const tbody = $('alternativesTable').querySelector('tbody'); tbody.innerHTML='';
  model.alternatives.forEach((a,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(a)}</td><td><button class='small' onclick='deleteAlternative(${i})'>Hapus</button></td>`;
    tbody.appendChild(tr);
  })
}
function renderJudges(){
  const tbody = $('judgesTable').querySelector('tbody'); tbody.innerHTML='';
  model.judges.forEach((j,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(j.name)}</td><td class='row-actions'><button class='small' onclick='openJudge(${i})'>Open</button><button class='small' onclick='deleteJudge(${i})'>Hapus</button></td>`;
    tbody.appendChild(tr);
  })
}
// small global utilities used by top-level renderers
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeId(s){ return encodeURIComponent(s).replace(/%/g,''); }
// CRUD: attach handlers after DOM is ready to avoid null-element errors
document.addEventListener('DOMContentLoaded', () => {
  // add criterion
  $('addCriterionBtn').onclick = ()=>{
    const name = $('newCriterion').value.trim(); const type = $('newCriterionType').value;
    if(!name) return alert('Isi nama kriteria');
    model.criteria.push({name,type});
    // add default weight and scores placeholders for judges
    model.judges.forEach(j=>{ j.weights[name] = 50; j.scores.forEach(s=> s[name] = 0); });
    $('newCriterion').value=''; renderCriteria();
  }

  function deleteCriterion(i){ if(!confirm('Hapus kriteria?')) return; const name=model.criteria[i].name; model.criteria.splice(i,1); // remove from judges
    model.judges.forEach(j=>{ delete j.weights[name]; j.scores.forEach(s=> delete s[name]); }); renderCriteria(); }
  function editCriterion(i){ const c=model.criteria[i]; const newName=prompt('Nama kriteria',c.name); if(!newName) return; const newType=prompt('Type (benefit/cost)',c.type)||c.type; // rename in model
    const oldName=c.name; c.name=newName; c.type=newType; model.judges.forEach(j=>{ j.weights[newName] = j.weights[oldName] || 50; delete j.weights[oldName]; j.scores.forEach(s=>{ s[newName]=s[oldName]||0; delete s[oldName]; }); }); renderCriteria(); }

  $('addAltBtn').onclick = ()=>{ const n=$('newAlternative').value.trim(); if(!n) return alert('Isi nama alternatif'); model.alternatives.push(n); model.judges.forEach(j=> j.scores.push(initScoresForAlt())); $('newAlternative').value=''; renderAlternatives(); }
  function deleteAlternative(i){ if(!confirm('Hapus alternatif?')) return; model.alternatives.splice(i,1); model.judges.forEach(j=> j.scores.splice(i,1)); renderAlternatives(); }

  $('addJudgeBtn').onclick = ()=>{ const n=$('newJudge').value.trim(); if(!n) return alert('Isi nama juri'); const j = {name:n, weights:{}, scores:[]}; // default weights and scores
    model.criteria.forEach(c=> j.weights[c.name]=50); model.alternatives.forEach(a=> j.scores.push(initScoresForAlt())); model.judges.push(j); $('newJudge').value=''; renderJudges(); }
  function deleteJudge(i){ if(!confirm('Hapus juri?')) return; model.judges.splice(i,1); renderJudges(); }
  function initScoresForAlt(){ const obj={}; model.criteria.forEach(c=> obj[c.name]=0); return obj }

  function openJudge(i){ // popup small editor
    const j = model.judges[i]; const dlg = window.open('', '_blank', 'width=800,height=700');
    const html = judgeEditorHtml(i);
    dlg.document.write(html); dlg.document.close(); }

  function judgeEditorHtml(idx){ const j=model.judges[idx]; const criteriaList = model.criteria.map(c=>c.name);
    return `<!doctype html><html><head><meta charset='utf8'><title>Editor ${escapeHtml(j.name)}</title><style>body{font-family:Arial;padding:12px} table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px}input{width:80px}</style></head><body>
      <h3>Editor Juri: ${escapeHtml(j.name)}</h3>
      <p>Bobot mentah tiap kriteria (skala bebas, mis. 1-100)</p>
      <table><thead><tr><th>Kriteria</th><th>Type</th><th>Bobot mentah</th></tr></thead><tbody>${model.criteria.map(c=>`<tr><td>${escapeHtml(c.name)}</td><td>${c.type}</td><td><input id='w_${escapeId(c.name)}' value='${j.weights[c.name]||50}'></td></tr>`).join('')}</tbody></table>
      <h4>Skor alternatif (0-10)</h4>
      <table><thead><tr><th>Alternatif</th>${criteriaList.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>
      ${model.alternatives.map((a,ai)=>`<tr><td>${escapeHtml(a)}</td>${criteriaList.map(c=>`<td><input id='s_${ai}_${escapeId(c)}' value='${j.scores[ai] ? j.scores[ai][c] : 0}'></td>`).join('')}</tr>`).join('')}
      </tbody></table>
      <div style='margin-top:8px'><button id='saveBtn'>Simpan & Tutup</button></div>
      <script>
        function byId(id){return document.getElementById(id)}
        document.getElementById('saveBtn').onclick = ()=>{
          const data={weights:{},scores:[]};
          ${model.criteria.map(c=>`data.weights['${c.name}'] = byId('w_${escapeId(c.name)}').value;`).join('\n')}
          ${model.alternatives.map((a,ai)=>`data.scores[${ai}] = {}; ${model.criteria.map(c=>`data.scores[${ai}]['${c.name}'] = Number(byId('s_${ai}_${escapeId(c.name)}').value) || 0;`).join('')}`).join('\n')}
          // send to opener
          window.opener.postMessage({type:'judge_save', idx:${idx}, payload:data}, '*');
          window.close();
        }
      <\/script>
    </body></html>` }

  // receive saved judge data
  window.addEventListener('message', e=>{
    try{
      const m=e.data; if(m && m.type==='judge_save'){
        const j = model.judges[m.idx]; const p=m.payload;
        // convert weights to numbers
        for(const k of Object.keys(p.weights)) j.weights[k]=Number(p.weights[k])||0;
        // scores
        j.scores = p.scores.map(r=>{ const out={}; for(const k of Object.keys(r)) out[k]=Number(r[k])||0; return out });
        renderJudges();
        updateStatus('Juri '+j.name+' disimpan');
      }
    }catch(err){console.error(err)}
  })

  function updateStatus(msg){ $('status').innerHTML = `<div class='muted'>${msg}</div>` }

  function computeAll(){ if(model.criteria.length===0||model.alternatives.length===0||model.judges.length===0){ alert('Pastikan minimal 1 kriteria, 1 alternatif, 1 juri'); return }
    // for each judge: normalize weights, compute utilities per criterion (min-max among alternatives), compute weighted contributions, SMART score and rank
    const perJudgeResults = [];
    model.judges.forEach(j=>{
      // normalize
      const raw = j.weights; const norm = {}; const keys = Object.keys(raw);
      let sum=0; keys.forEach(k=>sum += Number(raw[k]||0)); if(sum===0) sum=1;
      keys.forEach(k=> norm[k] = (Number(raw[k]||0))/sum);
      // utilities min-max for each criterion among alternatives
      const utilities = model.alternatives.map((a,ai)=>{ const obj={Member:a}; keys.forEach(k=>obj[k]=0); return obj });
      keys.forEach(k=>{
        // gather values
        const vals = model.judges.map(_=>null) // placeholder
        const arr = model.alternatives.map((a,ai)=> (j.scores[ai] && typeof j.scores[ai][k] !== 'undefined') ? Number(j.scores[ai][k]) : 0 );
        const min = Math.min(...arr); const max = Math.max(...arr);
        utilities.forEach((u,ai)=>{
          const rawv = arr[ai];
          let util = 50;
          if(max !== min){
            // check criterion type
            const crit = model.criteria.find(c=>c.name===k);
            if(crit && crit.type === 'cost'){
              util = 100 * (max - rawv) / (max - min);
            } else {
              util = 100 * (rawv - min) / (max - min);
            }
          }
          utilities[ai][k] = util; // 0..100
        })
      })
      // weighted contributions
      utilities.forEach(u=>{
        let total=0; keys.forEach(k=>{ total += u[k] * norm[k]; }); u.SMART = total; u._weights = norm;
      })
      utilities.sort((a,b)=>b.SMART - a.SMART);
      utilities.forEach((u,idx)=> u.Rank = idx+1);
      perJudgeResults.push({judge:j.name, table:utilities});
    });

    // Borda aggregation: convert each per-judge rank to points (N+1 - rank) and sum
    const N = model.alternatives.length; const totals = {};
    model.alternatives.forEach(a=> totals[a]=0);
    perJudgeResults.forEach(p=>{
      p.table.forEach(row=>{ totals[row.Member] += (N + 1 - row.Rank); });
    });
    const final = Object.keys(totals).map(m=>({Member:m, TotalBorda:totals[m]})).sort((a,b)=>b.TotalBorda - a.TotalBorda);

    // render results
    const out = [];
    out.push('<h4>Per-Judge SMART (utilities & SMART score)</h4>');
    perJudgeResults.forEach(p=>{
      out.push(`<h5>Juri: ${escapeHtml(p.judge)}</h5><table><thead><tr><th>Member</th>${model.criteria.map(c=>`<th>${escapeHtml(c.name)}</th>`).join('')}<th>SMART</th><th>Rank</th></tr></thead><tbody>`);
      p.table.forEach(r=>{
        out.push('<tr><td>'+escapeHtml(r.Member)+'</td>'+ model.criteria.map(c=>`<td>${(r[c]).toFixed(2)}</td>`).join('') + `<td>${r.SMART.toFixed(4)}</td><td>${r.Rank}</td></tr>`);
      })
      out.push('</tbody></table>');
    })
    out.push('<h4>Final Borda aggregation</h4>');
    out.push('<table><thead><tr><th>Member</th><th>Total Borda</th></tr></thead><tbody>');
    final.forEach(f=> out.push(`<tr><td>${escapeHtml(f.Member)}</td><td>${f.TotalBorda}</td></tr>`));
    out.push('</tbody></table>');
    $('resultsArea').innerHTML = out.join('');
    updateStatus('Compute selesai');
  }

  // Export / Reset
  $('exportBtn').onclick = ()=>{
    const data = JSON.stringify(model,null,2); const blob = new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='smart_borda_model.json'; a.click(); URL.revokeObjectURL(url);
  }
  $('resetBtn').onclick = ()=>{ if(confirm('Reset semua data?')){ model.criteria=[]; model.alternatives=[]; model.judges=[]; renderAll(); $('resultsArea').innerHTML=''; updateStatus('Reset done'); }}
  $('computeBtn').onclick = computeAll;

  function renderAll(){ renderCriteria(); renderAlternatives(); renderJudges(); }
  

  // expose functions referenced by inline onclick attributes in rendered tables
  window.editCriterion = editCriterion;
  window.deleteCriterion = deleteCriterion;
  window.deleteAlternative = deleteAlternative;
  window.deleteJudge = deleteJudge;
  window.openJudge = openJudge;

  // initial example: populate with some defaults for convenience
  (function seed(){ const initialCriteria = ['Synchronization','Marching Accuracy','Flag Handling','Command Response','Physical Appearance','Time Accuracy','Protocol','Teamwork and Communication','Discipline','Cohesiveness','Responsibility']; initialCriteria.forEach(c=> model.criteria.push({name:c,type:'benefit'})); model.alternatives.push('raniah yulia yasmin 9a','okta dina andriyanti 9b','maida kenzi kayana 9a','verlita eka putri 8d'); model.judges.push({name:'Sample Judge', weights: {}, scores: []}); model.criteria.forEach(c=> model.judges[0].weights[c.name]=50); model.alternatives.forEach(a=> model.judges[0].scores.push(initScoresForAlt())); renderAll(); })();
});