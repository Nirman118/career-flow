const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const STAGES = ['Drafted','Applied','Screening','Interview','Offer'];

// ================= Tab navigation =================
$$('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $$('.view').forEach(v=>v.classList.remove('active'));
    $('#'+btn.dataset.view).classList.add('active');
    if(btn.dataset.view==='tracker') renderTracker();
  });
});

// ================= Profile data model =================
function getProfile(){
  const p = JSON.parse(localStorage.getItem('cf_profile') || '{}');
  return Object.assign({
    name:'', tagline:'', location:'', languages:'', phone:'', email:'', linkedin:'', github:'',
    availabilityMode:'auto', availabilityManual:'',
    competencies:'',
    education:[], experience:[], projects:[], certifications:[]
  }, p);
}
function saveProfile(p){ localStorage.setItem('cf_profile', JSON.stringify(p)); }

// ================= API key / model =================
$('#apiKey').value = localStorage.getItem('cf_apiKey') || '';
$('#model').value = localStorage.getItem('cf_model') || 'claude-sonnet-5';

$('#saveKey').addEventListener('click', ()=>{
  localStorage.setItem('cf_apiKey', $('#apiKey').value.trim());
  localStorage.setItem('cf_model', $('#model').value);
  $('#keyStatus').textContent = 'Saved.';
  $('#keyStatus').className = 'status-msg ok';
});

// ================= Claude API call =================
async function callClaude(prompt, maxTokens){
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
      max_tokens: maxTokens || 2000,
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

// ================= Settings: render repeatable sections =================
const LIST_MAP = { eduList:'education', expList:'experience', projList:'projects', certList:'certifications' };

function renderEntries(containerId, items, fields){
  const el = $('#'+containerId);
  el.innerHTML = '';
  items.forEach((item, idx)=>{
    const card = document.createElement('div');
    card.className = 'entry-card';
    let html = '<button class="entry-remove" data-list="'+containerId+'" data-idx="'+idx+'" title="Remove">\u2715</button>';
    fields.forEach(f=>{
      if(f.type==='textarea'){
        html += '<div class="field"><label>'+f.label+'</label><textarea data-list="'+containerId+'" data-idx="'+idx+'" data-key="'+f.key+'">'+escapeHtml(item[f.key]||'')+'</textarea></div>';
      }else{
        html += '<div class="field"><label>'+f.label+'</label><input type="text" data-list="'+containerId+'" data-idx="'+idx+'" data-key="'+f.key+'" value="'+escapeAttr(item[f.key]||'')+'"></div>';
      }
    });
    html += '<div class="entry-toggle"><input type="checkbox" data-list="'+containerId+'" data-idx="'+idx+'" data-key="include" '+(item.include!==false?'checked':'')+'> Include in generation</div>';
    card.innerHTML = html;
    el.appendChild(card);
  });

  el.querySelectorAll('input,textarea').forEach(inp=>{
    inp.addEventListener('input', onEntryChange);
    inp.addEventListener('change', onEntryChange);
  });
  el.querySelectorAll('.entry-remove').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const p = getProfile();
      const list = LIST_MAP[btn.dataset.list];
      p[list].splice(parseInt(btn.dataset.idx), 1);
      saveProfile(p);
      renderAllEntries();
    });
  });
}

function onEntryChange(e){
  const p = getProfile();
  const list = LIST_MAP[e.target.dataset.list];
  const idx = parseInt(e.target.dataset.idx);
  const key = e.target.dataset.key;
  p[list][idx][key] = e.target.type==='checkbox' ? e.target.checked : e.target.value;
  saveProfile(p);
}

function renderAllEntries(){
  const p = getProfile();
  renderEntries('eduList', p.education, [
    {key:'degree', label:'Degree'},
    {key:'institution', label:'Institution'},
    {key:'dates', label:'Dates'},
    {key:'details', label:'Details / Relevant coursework', type:'textarea'}
  ]);
  renderEntries('expList', p.experience, [
    {key:'role', label:'Role Title'},
    {key:'company', label:'Company, Location'},
    {key:'dates', label:'Dates'},
    {key:'bullets', label:'Bullets (one per line)', type:'textarea'}
  ]);
  renderEntries('projList', p.projects, [
    {key:'title', label:'Project Title'},
    {key:'dateStatus', label:'Date / Status (e.g. "2026, Live")'},
    {key:'stack', label:'Tech Stack'},
    {key:'description', label:'Description', type:'textarea'}
  ]);
  renderEntries('certList', p.certifications, [
    {key:'name', label:'Certification Name'},
    {key:'provider', label:'Provider, Date'},
    {key:'link', label:'Verification Link'}
  ]);
}

$('#addEdu').addEventListener('click', ()=>{ const p=getProfile(); p.education.push({degree:'',institution:'',dates:'',details:'',include:true}); saveProfile(p); renderAllEntries(); });
$('#addExp').addEventListener('click', ()=>{ const p=getProfile(); p.experience.push({role:'',company:'',dates:'',bullets:'',include:true}); saveProfile(p); renderAllEntries(); });
$('#addProj').addEventListener('click', ()=>{ const p=getProfile(); p.projects.push({title:'',dateStatus:'',stack:'',description:'',include:true}); saveProfile(p); renderAllEntries(); });
$('#addCert').addEventListener('click', ()=>{ const p=getProfile(); p.certifications.push({name:'',provider:'',link:'',include:true}); saveProfile(p); renderAllEntries(); });

// ================= Load header fields into form =================
function loadHeaderFields(){
  const p = getProfile();
  $('#f_name').value = p.name;
  $('#f_tagline').value = p.tagline;
  $('#f_location').value = p.location;
  $('#f_languages').value = p.languages;
  $('#f_phone').value = p.phone;
  $('#f_email').value = p.email;
  $('#f_linkedin').value = p.linkedin;
  $('#f_github').value = p.github;
  $('#f_availability_mode').value = p.availabilityMode;
  $('#f_availability_manual').value = p.availabilityManual;
  $('#f_availability_manual_wrap').style.display = p.availabilityMode==='manual' ? 'block' : 'none';
  $('#f_competencies').value = p.competencies;
  renderAllEntries();
}

$('#f_availability_mode').addEventListener('change', e=>{
  $('#f_availability_manual_wrap').style.display = e.target.value==='manual' ? 'block' : 'none';
});

$('#saveAllBtn').addEventListener('click', ()=>{
  const p = getProfile();
  p.name = $('#f_name').value.trim();
  p.tagline = $('#f_tagline').value.trim();
  p.location = $('#f_location').value.trim();
  p.languages = $('#f_languages').value.trim();
  p.phone = $('#f_phone').value.trim();
  p.email = $('#f_email').value.trim();
  p.linkedin = $('#f_linkedin').value.trim();
  p.github = $('#f_github').value.trim();
  p.availabilityMode = $('#f_availability_mode').value;
  p.availabilityManual = $('#f_availability_manual').value.trim();
  p.competencies = $('#f_competencies').value;
  saveProfile(p);
  $('#saveAllStatus').textContent = 'Profile saved.';
  $('#saveAllStatus').className = 'status-msg ok';
});

// ================= CV upload & auto-fill =================
$('#parseCvBtn').addEventListener('click', async ()=>{
  const fileInput = $('#cvUpload');
  const statusEl = $('#parseStatus');
  if(!fileInput.files.length){ statusEl.textContent='Choose a .docx file first.'; statusEl.className='status-msg err'; return; }

  const btn = $('#parseCvBtn');
  btn.disabled = true; btn.textContent = 'Reading file...';
  statusEl.textContent=''; statusEl.className='status-msg';

  try{
    const arrayBuffer = await fileInput.files[0].arrayBuffer();
    const result = await mammoth.extractRawText({arrayBuffer:arrayBuffer});
    const rawText = result.value;

    btn.textContent = 'Extracting fields with Claude...';
    const schema = '{\n' +
      '  "name": "", "tagline": "", "location": "", "languages": "", "phone": "", "email": "", "linkedin": "", "github": "",\n' +
      '  "competencies": "Category: skill, skill\\nCategory: skill, skill",\n' +
      '  "education": [{"degree":"","institution":"","dates":"","details":""}],\n' +
      '  "experience": [{"role":"","company":"","dates":"","bullets":"bullet one\\nbullet two"}],\n' +
      '  "projects": [{"title":"","dateStatus":"","stack":"","description":""}],\n' +
      '  "certifications": [{"name":"","provider":"","link":""}]\n' +
      '}';
    const extractPrompt = 'Extract structured CV data from the text below and return ONLY valid JSON (no markdown fences, no commentary) matching exactly this schema:\n\n' +
      schema +
      '\n\nExtract only what is explicitly present in the text. Leave fields as empty strings if not found. Do not invent or infer anything not stated.\n\nCV TEXT:\n' + rawText;

    const raw = await callClaude(extractPrompt, 3000);
    const jsonStr = raw.trim().replace(/^```json\s*/i,'').replace(/```\s*$/,'');
    const extracted = JSON.parse(jsonStr);

    const p = getProfile();
    ['name','tagline','location','languages','phone','email','linkedin','github','competencies'].forEach(k=>{
      if(extracted[k]) p[k] = extracted[k];
    });
    ['education','experience','projects','certifications'].forEach(k=>{
      if(Array.isArray(extracted[k]) && extracted[k].length){
        p[k] = extracted[k].map(item=>Object.assign({include:true}, item));
      }
    });
    saveProfile(p);
    loadHeaderFields();

    statusEl.textContent = 'Auto-filled. Review every field below before generating — nothing was invented, but double-check accuracy.';
    statusEl.className = 'status-msg ok';
  }catch(e){
    statusEl.textContent = 'Parse failed: '+e.message;
    statusEl.className = 'status-msg err';
  }finally{
    btn.disabled = false; btn.textContent = 'Parse & Auto-fill';
  }
});

// ================= Hardcoded professional CV/CL format prompt =================
function currentMonthYear(){
  return new Date().toLocaleDateString('en-US', {month:'long', year:'numeric'});
}

function serializeProfile(p){
  const availability = (p.availabilityMode==='manual' && p.availabilityManual)
    ? p.availabilityManual
    : ('Available from ' + currentMonthYear());

  const edu = p.education.filter(function(e){return e.include!==false;}).map(function(e){
    return '- ' + e.degree + ' | ' + e.institution + ' | ' + e.dates + '\n  ' + (e.details||'');
  }).join('\n');

  const exp = p.experience.filter(function(e){return e.include!==false;}).map(function(e){
    var bullets = (e.bullets||'').split('\n').map(function(b){return '  * '+b;}).join('\n');
    return '- ' + e.role + ' | ' + e.company + ' | ' + e.dates + '\n  Bullets:\n' + bullets;
  }).join('\n');

  const proj = p.projects.filter(function(e){return e.include!==false;}).map(function(e){
    return '- ' + e.title + ' (' + e.dateStatus + ') | Stack: ' + e.stack + '\n  ' + e.description;
  }).join('\n');

  const cert = p.certifications.filter(function(e){return e.include!==false;}).map(function(e){
    return '- ' + e.name + ' | ' + e.provider + (e.link ? ' | '+e.link : '');
  }).join('\n');

  return 'HEADER\n' +
    'Name: ' + p.name + '\n' +
    'Tagline: ' + p.tagline + '\n' +
    'Location: ' + p.location + '\n' +
    'Phone: ' + p.phone + '\n' +
    'Email: ' + p.email + '\n' +
    'LinkedIn: ' + p.linkedin + '\n' +
    'GitHub: ' + p.github + '\n' +
    'Languages: ' + p.languages + '\n' +
    'Availability: ' + availability + '\n\n' +
    'TECHNICAL COMPETENCIES (verbatim categories/skills — never add or remove any)\n' +
    p.competencies + '\n\n' +
    'EDUCATION (most recent first, as listed)\n' +
    (edu || '(none provided)') + '\n\n' +
    'WORK EXPERIENCE (most recent first, as listed — only entries marked include=true are shown here)\n' +
    (exp || '(none provided)') + '\n\n' +
    'PROJECTS (as listed — only entries marked include=true are shown here)\n' +
    (proj || '(none provided)') + '\n\n' +
    'CERTIFICATIONS\n' +
    (cert || '(none provided)');
}

function buildPrompt(profile, company, role, jd, feedback){
  const data = serializeProfile(profile);
  const feedbackBlock = feedback ? ('REVISION FEEDBACK FROM CANDIDATE (apply this to improve the previous draft, still following every rule below):\n' + feedback + '\n') : '';

  return 'You are a professional CV and cover letter writer. Produce a tailored CV and cover letter for the job description below, using ONLY the candidate data provided. Never invent, embellish, or infer any experience, company, date, degree, certification, or skill that is not explicitly present in the candidate data.\n\n' +
  'CANDIDATE DATA:\n' + data + '\n\n' +
  'TARGET COMPANY: ' + company + '\n' +
  'TARGET ROLE: ' + role + '\n\n' +
  'JOB DESCRIPTION:\n' + jd + '\n\n' +
  feedbackBlock + '\n' +
  '=== MANDATORY CV FORMAT (follow this structure and order exactly) ===\n\n' +
  'HEADER\n' +
  'Name, tagline, location, phone, email, linkedin, github, languages, availability — use the candidate data verbatim, do not alter wording, dates, or language levels.\n\n' +
  'PROFILE / TARGET FOCUS\n' +
  'One paragraph (4-6 sentences), tailored to this specific role and company, grounded strictly in the candidate data. End with one sentence stating interest in this specific role at this specific company.\n\n' +
  'ROLE ALIGNMENT — WHAT THIS POSITION NEEDS\n' +
  'Include this section ONLY if the job description contains a clear structured or enumerable list of requirements (numbered list, bullet list of must-haves, etc). If included, produce a two-column mapping: "This Role Requires" | "I Bring" — map each major requirement to the closest real matching fact from the candidate data. If no real match exists for a requirement, omit that row entirely rather than inventing a match. If the job description has no clear structured requirements list, omit this whole section.\n\n' +
  'TECHNICAL COMPETENCIES\n' +
  'Reproduce the candidate\'s competency categories and skills exactly as provided — do not add, remove, or rename any category or skill.\n\n' +
  'EDUCATION\n' +
  'List each entry from the candidate data, most recent first, exactly as provided (degree names verbatim, dates verbatim).\n\n' +
  'PROJECTS (MOST RELEVANT)\n' +
  'Select and order the 3-4 projects from the candidate data most relevant to this job description. For each: title, date/status, tech stack, then a 2-3 sentence description. Descriptions must never end with a meta sentence like "this relates to X requirement" — let relevance come through the content itself.\n\n' +
  'WORK EXPERIENCE\n' +
  'List each included experience entry, most recent first. Bullets only — never add a closing prose paragraph after the bullet list for any role.\n\n' +
  'CERTIFICATIONS\n' +
  'List each certification exactly as provided.\n\n' +
  '=== MANDATORY COVER LETTER FORMAT ===\n\n' +
  currentMonthYear() + '\n\n' +
  'Dear Hiring Team at ' + company + ',\n\n' +
  'Paragraph 1 — hook: state the role being applied for and the single strongest, most relevant real qualification.\n' +
  'Paragraph 2 — bridge 2-3 specific real achievements/projects from the candidate data to the job description\'s actual requirements.\n' +
  'Paragraph 3 — motivation: why this role/company specifically, grounded only in what\'s stated in the job description or is public knowledge — never invent claims about the company.\n' +
  'Closing paragraph — brief, confident, thank the reader, invite next steps.\n\n' +
  'Sincerely,\n' + profile.name + '\n\n' +
  '=== HARD RULES (apply to both documents) ===\n' +
  '- Never fabricate companies, dates, degrees, certifications, or skills not present in the candidate data\n' +
  '- Language levels and all header fields render exactly as given, never altered\n' +
  '- Only include experience/project/education entries provided — do not add generic filler entries\n' +
  '- Company-specific claims are never invented — only use what\'s in the job description or common public knowledge\n\n' +
  'Respond in EXACTLY this format, nothing else, no markdown fences:\n' +
  '###CV###\n' +
  '<the full formatted CV per the structure above>\n' +
  '###CL###\n' +
  '<the full formatted cover letter per the structure above>';
}

function parseOutput(text){
  const cv = (text.split('###CV###')[1]||'').split('###CL###')[0].trim();
  const cl = (text.split('###CL###')[1]||'').trim();
  return {cv:cv, cl:cl};
}

// ================= Application storage =================
function getApps(){ return JSON.parse(localStorage.getItem('cf_apps')||'[]'); }
function saveApps(apps){ localStorage.setItem('cf_apps', JSON.stringify(apps)); }

// ================= Generate flow =================
$('#generateBtn').addEventListener('click', async ()=>{
  const profile = getProfile();
  const company = $('#company').value.trim();
  const role = $('#role').value.trim();
  const jd = $('#jd').value.trim();
  const statusEl = $('#genStatus');

  if(!profile.name){ statusEl.textContent='Fill in your profile in Settings first (at minimum: name).'; statusEl.className='status-msg err'; return; }
  if(!company || !role || !jd){ statusEl.textContent='Fill in company, role, and job description.'; statusEl.className='status-msg err'; return; }

  const btn = $('#generateBtn');
  btn.disabled = true; btn.textContent = 'Generating...';
  statusEl.textContent=''; statusEl.className='status-msg';

  try{
    const raw = await callClaude(buildPrompt(profile, company, role, jd, null), 3000);
    const out = parseOutput(raw);

    $('#outCv').textContent = out.cv;
    $('#outCl').textContent = out.cl;
    $('#genOutput').style.display = 'grid';

    const apps = getApps();
    apps.unshift({
      id: Date.now().toString(36),
      company: company, role: role, jd: jd,
      status: 'Applied',
      dateAdded: new Date().toISOString().slice(0,10),
      versions: [{cv:out.cv, cl:out.cl, feedback:null, ts:new Date().toISOString()}]
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

// ================= Tracker rendering =================
function stageIndex(status){
  if(status==='Rejected') return -1;
  return STAGES.indexOf(status);
}

function renderTracker(){
  const apps = getApps();
  const list = $('#trackerList');
  $('#trackerEmpty').style.display = apps.length ? 'none' : 'block';
  list.innerHTML = '';

  apps.forEach(function(app){
    const idx = stageIndex(app.status);
    const rejected = app.status === 'Rejected';
    const latest = app.versions[app.versions.length-1];

    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML =
      '<div class="app-head">' +
        '<div><h3>'+escapeHtml(app.company)+'</h3>' +
        '<div class="role">'+escapeHtml(app.role)+' \u00b7 added '+app.dateAdded+'</div></div>' +
        '<div class="app-meta"><select class="status" data-id="'+app.id+'">' +
          STAGES.map(function(s){return '<option value="'+s+'" '+(app.status===s?'selected':'')+'>'+s+'</option>';}).join('') +
          '<option value="Rejected" '+(rejected?'selected':'')+'>Rejected</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="stage-track">' +
        STAGES.map(function(s,i){
          var cls = rejected?'rejected':(i<idx?'done':(i===idx?'current':''));
          return '<div class="stage '+cls+'"><div class="node"></div>'+s+'</div>';
        }).join('') +
      '</div>' +
      '<div class="app-actions"><button class="btn-ghost btn-small toggle-doc" data-id="'+app.id+'">View CV / Cover Letter</button></div>' +
      '<div class="feedback-row">' +
        '<input type="text" placeholder="Feedback to refine this draft (e.g. \'emphasize SAP project more\')..." class="feedback-input" data-id="'+app.id+'">' +
        '<button class="btn btn-small regen-btn" data-id="'+app.id+'">Regenerate</button>' +
      '</div>' +
      '<div class="versions">v'+app.versions.length+' current' +
        (app.versions.length>1 ? ' \u00b7 <button class="history-btn" data-id="'+app.id+'">view history ('+app.versions.length+' versions)</button>' : '') +
      '</div>' +
      '<div class="doc-preview" id="doc-'+app.id+'">' +
        '<div class="doc-tabs">' +
          '<button class="doc-tab active" data-doc="cv" data-id="'+app.id+'">CV</button>' +
          '<button class="doc-tab" data-doc="cl" data-id="'+app.id+'">Cover Letter</button>' +
        '</div>' +
        '<div class="output-box" id="docbox-'+app.id+'">'+escapeHtml(latest.cv)+'</div>' +
      '</div>';
    list.appendChild(card);
  });

  $$('.status').forEach(function(sel){sel.addEventListener('change', function(e){
    const apps = getApps();
    const app = apps.find(function(a){return a.id===e.target.dataset.id;});
    app.status = e.target.value;
    saveApps(apps);
    renderTracker();
  });});

  $$('.toggle-doc').forEach(function(b){b.addEventListener('click', function(e){
    $('#doc-'+e.target.dataset.id).classList.toggle('open');
  });});

  $$('.doc-tab').forEach(function(b){b.addEventListener('click', function(e){
    const id = e.target.dataset.id;
    const doc = e.target.dataset.doc;
    const apps = getApps();
    const app = apps.find(function(a){return a.id===id;});
    const latest = app.versions[app.versions.length-1];
    $('#docbox-'+id).textContent = doc==='cv' ? latest.cv : latest.cl;
    e.target.parentElement.querySelectorAll('.doc-tab').forEach(function(t){t.classList.remove('active');});
    e.target.classList.add('active');
  });});

  $$('.regen-btn').forEach(function(b){b.addEventListener('click', async function(e){
    const id = e.target.dataset.id;
    const feedbackInput = document.querySelector('.feedback-input[data-id="'+id+'"]');
    const feedback = feedbackInput.value.trim();
    const profile = getProfile();
    const apps = getApps();
    const app = apps.find(function(a){return a.id===id;});

    e.target.disabled = true; e.target.textContent = '...';
    try{
      const raw = await callClaude(buildPrompt(profile, app.company, app.role, app.jd, feedback||null), 3000);
      const out = parseOutput(raw);
      app.versions.push({cv:out.cv, cl:out.cl, feedback: feedback||null, ts:new Date().toISOString()});
      saveApps(apps);
      feedbackInput.value='';
      renderTracker();
    }catch(err){
      alert(err.message);
    }finally{
      e.target.disabled = false; e.target.textContent = 'Regenerate';
    }
  });});

  $$('.history-btn').forEach(function(b){b.addEventListener('click', function(e){
    const apps = getApps();
    const app = apps.find(function(a){return a.id===e.target.dataset.id;});
    const lines = app.versions.map(function(v,i){
      return 'v'+(i+1)+' \u2014 '+v.ts.slice(0,16).replace('T',' ')+(v.feedback? ' \u2014 feedback: '+v.feedback : ' \u2014 initial draft');
    }).join('\n');
    alert('Version history for '+app.company+':\n\n'+lines);
  });});
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str||'';
  return d.innerHTML;
}
function escapeAttr(str){
  return escapeHtml(str).replace(/"/g,'&quot;');
}

// ================= Init =================
loadHeaderFields();
renderTracker();
