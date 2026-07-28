const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const STAGES = ['Drafted','Applied','Screening','Interview','Offer'];

// ---------- Tab navigation ----------
$$('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $$('.view').forEach(v=>v.classList.remove('active'));
    $('#'+btn.dataset.view).classList.add('active');
    if(btn.dataset.view==='tracker') renderTracker();
  });
});

// ---------- Settings persistence ----------
$('#apiKey').value = localStorage.getItem('cf_apiKey') || '';
$('#model').value = localStorage.getItem('cf_model') || 'claude-sonnet-5';
$('#baseProfile').value = localStorage.getItem('cf_baseProfile') || '';

$('#saveKey').addEventListener('click', ()=>{
  localStorage.setItem('cf_apiKey', $('#apiKey').value.trim());
  localStorage.setItem('cf_model', $('#model').value);
  $('#keyStatus').textContent = 'Saved.';
  $('#keyStatus').className = 'status-msg ok';
});
$('#saveProfile').addEventListener('click', ()=>{
  localStorage.setItem('cf_baseProfile', $('#baseProfile').value);
  $('#profileStatus').textContent = 'Profile saved.';
  $('#profileStatus').className = 'status-msg ok';
});

// ---------- Claude API call ----------
async function callClaude(prompt){
  const apiKey = localStorage.getItem('cf_apiKey');
  const model = localStorage.getItem('cf_model') || 'claude-sonnet-5';
  if(!apiKey) throw new Error('Add your API key in Settings first.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key': apiKey,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      messages:[{role:'user', content: prompt}]
    })
  });
  if(!res.ok){
    const errText = await res.text();
    throw new Error('API error: '+res.status+' — '+errText.slice(0,200));
  }
  const data = await res.json();
  return data.content.filter(b=>b.type==='text').map(b=>b.text).join('\n');
}

function buildPrompt(baseProfile, jd, feedback){
  return `You are a career document assistant. Using ONLY the candidate's real background below, produce a tailored CV summary paragraph and a cover letter for this job. Never invent experience, companies, or dates that aren't in the base profile.

CANDIDATE BASE PROFILE:
${baseProfile}

JOB DESCRIPTION:
${jd}

${feedback ? 'REVISION FEEDBACK FROM CANDIDATE (apply this to improve the previous draft):\n'+feedback+'\n' : ''}

Respond in EXACTLY this format, nothing else:
###CV###
<tailored CV summary paragraph, 4-6 sentences>
###CL###
<full cover letter, professional tone, 3-4 paragraphs>`;
}

function parseOutput(text){
  const cv = (text.split('###CV###')[1]||'').split('###CL###')[0].trim();
  const cl = (text.split('###CL###')[1]||'').trim();
  return {cv, cl};
}

// ---------- Application storage ----------
function getApps(){ return JSON.parse(localStorage.getItem('cf_apps')||'[]'); }
function saveApps(apps){ localStorage.setItem('cf_apps', JSON.stringify(apps)); }

// ---------- Generate flow ----------
$('#generateBtn').addEventListener('click', async ()=>{
  const baseProfile = localStorage.getItem('cf_baseProfile')||'';
  const company = $('#company').value.trim();
  const role = $('#role').value.trim();
  const jd = $('#jd').value.trim();
  const statusEl = $('#genStatus');

  if(!baseProfile){ statusEl.textContent='Add your base profile in Settings first.'; statusEl.className='status-msg err'; return; }
  if(!company || !role || !jd){ statusEl.textContent='Fill in company, role, and job description.'; statusEl.className='status-msg err'; return; }

  const btn = $('#generateBtn');
  btn.disabled = true; btn.textContent = 'Generating...';
  statusEl.textContent=''; statusEl.className='status-msg';

  try{
    const raw = await callClaude(buildPrompt(baseProfile, jd, null));
    const {cv, cl} = parseOutput(raw);

    $('#outCv').textContent = cv;
    $('#outCl').textContent = cl;
    $('#genOutput').style.display = 'grid';

    const apps = getApps();
    apps.unshift({
      id: Date.now().toString(36),
      company, role, jd,
      status: 'Applied',
      dateAdded: new Date().toISOString().slice(0,10),
      versions: [{cv, cl, feedback:null, ts:new Date().toISOString()}]
    });
    saveApps(apps);

    statusEl.textContent = 'Generated and saved to Tracker.';
    statusEl.className = 'status-msg ok';
    $('#company').value=''; $('#role').value=''; $('#jd').value='';
  }catch(e){
    statusEl.textContent = e.message;
    statusEl.className = 'status-msg err';
  }finally{
    btn.disabled = false; btn.textContent = 'Generate CV + Cover Letter';
  }
});

// ---------- Tracker rendering ----------
function stageIndex(status){
  if(status==='Rejected') return -1;
  return STAGES.indexOf(status);
}

function renderTracker(){
  const apps = getApps();
  const list = $('#trackerList');
  $('#trackerEmpty').style.display = apps.length ? 'none' : 'block';
  list.innerHTML = '';

  apps.forEach(app=>{
    const idx = stageIndex(app.status);
    const rejected = app.status === 'Rejected';
    const latest = app.versions[app.versions.length-1];

    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-head">
        <div>
          <h3>${escapeHtml(app.company)}</h3>
          <div class="role">${escapeHtml(app.role)} · added ${app.dateAdded}</div>
        </div>
        <div class="app-meta">
          <select class="status" data-id="${app.id}">
            ${STAGES.map(s=>`<option value="${s}" ${app.status===s?'selected':''}>${s}</option>`).join('')}
            <option value="Rejected" ${rejected?'selected':''}>Rejected</option>
          </select>
        </div>
      </div>
      <div class="stage-track">
        ${STAGES.map((s,i)=>`<div class="stage ${rejected?'rejected':(i<idx?'done':(i===idx?'current':''))}"><div class="node"></div>${s}</div>`).join('')}
      </div>
      <div class="app-actions">
        <button class="btn-ghost btn-small toggle-doc" data-id="${app.id}">View CV / Cover Letter</button>
      </div>
      <div class="feedback-row">
        <input type="text" placeholder="Feedback to refine this draft (e.g. 'emphasize SAP project more')..." class="feedback-input" data-id="${app.id}">
        <button class="btn btn-small regen-btn" data-id="${app.id}">Regenerate</button>
      </div>
      <div class="versions">v${app.versions.length} current
        ${app.versions.length>1 ? ` · <button class="history-btn" data-id="${app.id}">view history (${app.versions.length} versions)</button>` : ''}
      </div>
      <div class="doc-preview" id="doc-${app.id}">
        <div class="doc-tabs">
          <button class="doc-tab active" data-doc="cv" data-id="${app.id}">CV Summary</button>
          <button class="doc-tab" data-doc="cl" data-id="${app.id}">Cover Letter</button>
        </div>
        <div class="output-box" id="docbox-${app.id}">${escapeHtml(latest.cv)}</div>
      </div>
    `;
    list.appendChild(card);
  });

  // status change
  $$('.status').forEach(sel=>sel.addEventListener('change', e=>{
    const apps = getApps();
    const app = apps.find(a=>a.id===e.target.dataset.id);
    app.status = e.target.value;
    saveApps(apps);
    renderTracker();
  }));

  // toggle doc view
  $$('.toggle-doc').forEach(b=>b.addEventListener('click', e=>{
    $('#doc-'+e.target.dataset.id).classList.toggle('open');
  }));

  // doc tab switch
  $$('.doc-tab').forEach(b=>b.addEventListener('click', e=>{
    const id = e.target.dataset.id;
    const doc = e.target.dataset.doc;
    const apps = getApps();
    const app = apps.find(a=>a.id===id);
    const latest = app.versions[app.versions.length-1];
    $('#docbox-'+id).textContent = doc==='cv' ? latest.cv : latest.cl;
    e.target.parentElement.querySelectorAll('.doc-tab').forEach(t=>t.classList.remove('active'));
    e.target.classList.add('active');
  }));

  // regenerate with feedback
  $$('.regen-btn').forEach(b=>b.addEventListener('click', async e=>{
    const id = e.target.dataset.id;
    const feedbackInput = document.querySelector(`.feedback-input[data-id="${id}"]`);
    const feedback = feedbackInput.value.trim();
    const baseProfile = localStorage.getItem('cf_baseProfile')||'';
    const apps = getApps();
    const app = apps.find(a=>a.id===id);

    e.target.disabled = true; e.target.textContent = '...';
    try{
      const raw = await callClaude(buildPrompt(baseProfile, app.jd, feedback||null));
      const {cv, cl} = parseOutput(raw);
      app.versions.push({cv, cl, feedback: feedback||null, ts:new Date().toISOString()});
      saveApps(apps);
      feedbackInput.value='';
      renderTracker();
    }catch(err){
      alert(err.message);
    }finally{
      e.target.disabled = false; e.target.textContent = 'Regenerate';
    }
  }));

  // history view
  $$('.history-btn').forEach(b=>b.addEventListener('click', e=>{
    const apps = getApps();
    const app = apps.find(a=>a.id===e.target.dataset.id);
    const lines = app.versions.map((v,i)=>`v${i+1} — ${v.ts.slice(0,16).replace('T',' ')}${v.feedback? ' — feedback: '+v.feedback : ' — initial draft'}`).join('\n');
    alert('Version history for '+app.company+':\n\n'+lines);
  }));
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str||'';
  return d.innerHTML;
}

renderTracker();
