/**
 * Weight Monitor — script.js
 * Syncs all data to Google Sheets via Apps Script Web App.
 * localStorage is used as a fast local cache only.
 * Every save pushes the full data object to the sheet.
 * Every page load pulls the latest data from the sheet.
 * ----------------------------------------------------------
 * SETUP: Paste your Apps Script deployment URL below.
 */

// ── CONFIG — replace with your Apps Script Web App URL ───
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyYM4zgBCS2FpSOqp3Y9bwEtL4dz1Ir_bZTYS0y9CmA_S3crLPp-hVntJpIjtHYF6xd/exec';
// Example: 'https://script.google.com/macros/s/AKfy.../exec'
// ----------------------------------------------------------

let appData    = { users: [] };
let weightChart = null;

// ══════════════════════════════════════════════════════════
//  SYNC — Google Sheets
// ══════════════════════════════════════════════════════════

/** Load data from Google Sheets (source of truth) */
async function syncFromSheet() {
  if (!SHEET_URL || SHEET_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    const stored = localStorage.getItem('weightAppData');
    appData = stored ? JSON.parse(stored) : { users: [] };
    return;
  }

  setSyncStatus('syncing');
  try {
    const res  = await fetch(SHEET_URL + '?action=get', { cache: 'no-store' });
    const json = await res.json();
    appData    = json;
    localStorage.setItem('weightAppData', JSON.stringify(appData));
    setSyncStatus('ok');
  } catch (e) {
    console.warn('Sheet sync failed, using local cache:', e);
    const stored = localStorage.getItem('weightAppData');
    appData = stored ? JSON.parse(stored) : { users: [] };
    setSyncStatus('offline');
  }
}

/** Save data to Google Sheets (and update local cache) */
async function saveData() {
  localStorage.setItem('weightAppData', JSON.stringify(appData));

  if (!SHEET_URL || SHEET_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return;

  setSyncStatus('syncing');
  try {
    await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'set', data: appData })
    });
    setSyncStatus('ok');
  } catch (e) {
    console.warn('Could not push to sheet:', e);
    setSyncStatus('offline');
  }
}

function setSyncStatus(state) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  const states = {
    syncing: { icon: '⟳', text: 'Syncing…',            color: '#b0a898' },
    ok:      { icon: '✓', text: 'Synced',               color: '#2d6a4f' },
    offline: { icon: '⚠', text: 'Offline — local only', color: '#e07c5e' },
    none:    { icon: '—', text: 'No sheet configured',  color: '#b0a898' },
  };
  const s = states[state] || states.none;
  el.innerHTML = `<span style="color:${s.color};font-size:0.8rem">${s.icon} ${s.text}</span>`;
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
async function init() {
  document.getElementById('loading-overlay').style.display = 'flex';

  if (!SHEET_URL || SHEET_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    setSyncStatus('none');
    const stored = localStorage.getItem('weightAppData');
    if (stored) {
      appData = JSON.parse(stored);
    } else {
      try {
        const res = await fetch('data.json');
        appData   = await res.json();
        localStorage.setItem('weightAppData', JSON.stringify(appData));
      } catch { appData = { users: [] }; }
    }
  } else {
    await syncFromSheet();
  }

  document.getElementById('loading-overlay').style.display = 'none';
  renderAll();
  navigate('profiles');
}

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pageId);
  });
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');

  if (pageId === 'profiles') renderProfilePage();
  if (pageId === 'history')  renderHistoryPage();
  if (pageId === 'monthly')  renderMonthlyPage();
}

// ══════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'show ' + type;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = ''; }, 3000);
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════
function getUser(id)  { return appData.users.find(u => u.id === id); }

function calcAge(birthday) {
  const today = new Date(), dob = new Date(birthday);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function calcBMI(weight, height) { return (weight / ((height/100)**2)).toFixed(1); }

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', cls: 'badge-red' };
  if (bmi < 25)   return { label: 'Normal',       cls: 'badge-green' };
  if (bmi < 30)   return { label: 'Overweight',   cls: 'badge-red' };
  return                  { label: 'Obese',        cls: 'badge-red' };
}

function formatDate(d)     { return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'2-digit'}); }
function formatDateFull(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}); }
function sortedWeights(u)  { return [...u.weights].sort((a,b)=>a.date.localeCompare(b.date)); }

function emptyState(msg) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
    </svg><p>${msg}</p></div>`;
}

function setTodayDate() {
  const el = document.getElementById('weight-date');
  if (el) el.value = new Date().toISOString().split('T')[0];
}

// ══════════════════════════════════════════════════════════
//  RENDER ALL SELECTS
// ══════════════════════════════════════════════════════════
function renderAll() {
  populateUserSelects();
  renderProfilePage();
}

function populateUserSelects() {
  document.querySelectorAll('.user-select').forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = '<option value="">— Select user —</option>';
    appData.users.forEach(u => {
      const o = document.createElement('option');
      o.value = u.id; o.textContent = u.name;
      sel.appendChild(o);
    });
    if (prev && appData.users.find(u => u.id == prev)) sel.value = prev;
  });
}

// ══════════════════════════════════════════════════════════
//  PROFILE PAGE
// ══════════════════════════════════════════════════════════
function renderProfilePage() {
  const uid  = parseInt(document.getElementById('profile-user-select')?.value);
  const info = document.getElementById('profile-info');
  const chartArea = document.getElementById('profile-chart-area');

  if (!uid || isNaN(uid)) {
    info.innerHTML = emptyState('Select a user to view their profile');
    chartArea.innerHTML = '';
    return;
  }
  const u = getUser(uid);
  if (!u) return;

  const ws      = sortedWeights(u);
  const latest  = ws.length ? ws[ws.length-1].weight : null;
  const diff    = latest !== null && ws.length > 1 ? (latest - ws[0].weight).toFixed(1) : null;
  const bmi     = latest ? calcBMI(latest, u.height) : null;
  const bmiCat  = bmi ? bmiCategory(parseFloat(bmi)) : null;
  const initials= u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  info.innerHTML = `
    <div class="avatar-circle">${initials}</div>
    <div class="profile-name">${u.name}</div>
    <div class="profile-sub">Age ${calcAge(u.birthday)} · ${u.height} cm</div>
    <ul class="profile-detail-list">
      <li><span class="key">Birthday</span><span class="val">${formatDateFull(u.birthday)}</span></li>
      <li><span class="key">Height</span><span class="val">${u.height} cm</span></li>
      <li><span class="key">Current Weight</span><span class="val">${latest !== null ? latest+' kg' : '—'}</span></li>
      <li><span class="key">BMI</span><span class="val">${bmi ? `${bmi} <span class="badge ${bmiCat.cls}" style="font-size:0.72rem">${bmiCat.label}</span>` : '—'}</span></li>
      <li><span class="key">Records</span><span class="val">${ws.length} entries</span></li>
      ${diff !== null ? `<li><span class="key">Change (total)</span>
        <span class="val ${parseFloat(diff)<=0?'delta down':'delta up'}">${parseFloat(diff)>0?'+':''}${diff} kg</span></li>` : ''}
    </ul>`;

  if (ws.length < 2) {
    chartArea.innerHTML = `<div class="card"><p style="color:var(--text-muted);font-size:0.9rem">Add at least 2 weight entries to see the trend chart.</p></div>`;
  } else {
    chartArea.innerHTML = `<div class="card"><div class="card-title">Weight Trend</div>
      <div class="chart-container"><canvas id="weightCanvas"></canvas></div></div>`;
    renderChart(ws);
  }
}

function renderChart(ws) {
  if (weightChart) { weightChart.destroy(); weightChart = null; }
  const ctx = document.getElementById('weightCanvas');
  if (!ctx) return;
  const data = ws.map(w => w.weight);
  weightChart = new Chart(ctx, {
    type: 'line',
    data: { labels: ws.map(w=>formatDate(w.date)),
      datasets: [{ label:'Weight (kg)', data,
        borderColor:'#2d6a4f', backgroundColor:'rgba(45,106,79,0.08)',
        borderWidth:2.5, pointBackgroundColor:'#2d6a4f',
        pointRadius:5, pointHoverRadius:7, tension:0.35, fill:true }]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>`  ${c.parsed.y} kg`}} },
      scales:{
        x:{ grid:{color:'#f0ece4'}, ticks:{color:'#7a7060',font:{family:'DM Sans',size:11}} },
        y:{ min:Math.min(...data)-1, max:Math.max(...data)+1,
          grid:{color:'#f0ece4'},
          ticks:{color:'#7a7060',font:{family:'DM Sans',size:11},callback:v=>v+' kg'} }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════
//  ADD USER
// ══════════════════════════════════════════════════════════
async function handleAddUser(e) {
  e.preventDefault();
  const name   = document.getElementById('new-name').value.trim();
  const bday   = document.getElementById('new-birthday').value;
  const height = parseFloat(document.getElementById('new-height').value);
  if (!name || !bday || !height) { toast('Please fill in all fields.', 'error'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving…';

  const maxId = appData.users.reduce((m,u) => Math.max(m,u.id), 0);
  appData.users.push({ id: maxId+1, name, birthday: bday, height, weights: [] });
  await saveData();
  populateUserSelects();
  document.getElementById('add-user-form').reset();
  btn.disabled = false; btn.innerHTML = '&#8594; Create Profile';
  toast(`${name} added!`);
  navigate('profiles');
  document.getElementById('profile-user-select').value = maxId+1;
  renderProfilePage();
}

// ══════════════════════════════════════════════════════════
//  ADD WEIGHT
// ══════════════════════════════════════════════════════════
async function handleAddWeight(e) {
  e.preventDefault();
  const uid    = parseInt(document.getElementById('weight-user-select').value);
  const date   = document.getElementById('weight-date').value;
  const weight = parseFloat(document.getElementById('weight-value').value);
  if (!uid || !date || isNaN(weight)) { toast('Please fill in all fields.', 'error'); return; }

  const user = getUser(uid);
  if (!user) { toast('User not found.', 'error'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving…';

  const existing = user.weights.find(w => w.date === date);
  if (existing) { existing.weight = weight; toast(`Updated ${user.name}'s weight for ${formatDate(date)}.`); }
  else          { user.weights.push({ date, weight }); toast(`Weight logged for ${user.name}!`); }

  await saveData();
  document.getElementById('add-weight-form').reset();
  setTodayDate();
  btn.disabled = false; btn.textContent = 'Save Entry';

  if (parseInt(document.getElementById('profile-user-select').value) === uid) renderProfilePage();
}

// ══════════════════════════════════════════════════════════
//  HISTORY PAGE
// ══════════════════════════════════════════════════════════
function renderHistoryPage() {
  const uid  = parseInt(document.getElementById('history-user-select').value);
  const body = document.getElementById('history-tbody');
  const info = document.getElementById('history-user-info');

  if (!uid || isNaN(uid)) {
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted)">Select a user to see their history.</td></tr>`;
    info.textContent = ''; return;
  }
  const user = getUser(uid);
  if (!user) return;

  const ws = sortedWeights(user).reverse();
  info.textContent = `${ws.length} record${ws.length!==1?'s':''} for ${user.name}`;

  if (!ws.length) {
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted)">No weight entries yet.</td></tr>`;
    return;
  }
  body.innerHTML = ws.map((w,i) => {
    const prev  = ws[i+1];
    const delta = prev ? (w.weight - prev.weight).toFixed(1) : null;
    const deltaHtml = delta !== null
      ? `<span class="${parseFloat(delta)<=0?'delta down':'delta up'}">${parseFloat(delta)>0?'+':''}${delta} kg</span>`
      : '<span style="color:var(--text-light)">—</span>';
    return `<tr>
      <td>${formatDateFull(w.date)}</td>
      <td><strong>${w.weight}</strong> kg</td>
      <td>${deltaHtml}</td>
      <td><button class="btn-icon" onclick="deleteWeight(${user.id},'${w.date}')" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg></button></td>
    </tr>`;
  }).join('');
}

async function deleteWeight(userId, date) {
  const user = getUser(userId);
  if (!user) return;
  user.weights = user.weights.filter(w => w.date !== date);
  await saveData();
  renderHistoryPage();
  renderProfilePage();
  toast('Entry deleted.');
}

// ══════════════════════════════════════════════════════════
//  MONTHLY TABLE
// ══════════════════════════════════════════════════════════
function renderMonthlyPage() {
  const table    = document.getElementById('monthly-table');
  const noData   = document.getElementById('monthly-no-data');
  const monthSel = document.getElementById('month-select');

  if (!appData.users.length) {
    table.style.display = 'none'; noData.style.display = 'block'; return;
  }

  const selectedMonth = monthSel.value;
  const allDates = new Set();
  appData.users.forEach(u => u.weights.forEach(w => {
    if (!selectedMonth || w.date.startsWith(selectedMonth)) allDates.add(w.date);
  }));

  const sortedDates = [...allDates].sort();
  if (!sortedDates.length) {
    table.style.display = 'none'; noData.style.display = 'block';
    noData.innerHTML = emptyState('No weight data for this period.'); return;
  }

  table.style.display = ''; noData.style.display = 'none';
  table.querySelector('thead tr').innerHTML =
    `<th>User</th>` + sortedDates.map(d=>`<th style="text-align:center">${formatDate(d)}</th>`).join('');

  table.querySelector('tbody').innerHTML = appData.users.map(u => {
    const wm = {}; u.weights.forEach(w => { wm[w.date] = w.weight; });
    return `<tr><td class="user-cell">${u.name}</td>` +
      sortedDates.map(d => wm[d] !== undefined
        ? `<td class="month-cell">${wm[d]} kg</td>`
        : `<td class="month-cell empty">—</td>`).join('') + `</tr>`;
  }).join('');

  populateMonthSelector(monthSel, selectedMonth);
}

function populateMonthSelector(sel, currentVal) {
  const months = new Set();
  appData.users.forEach(u => u.weights.forEach(w => months.add(w.date.slice(0,7))));
  const sorted = [...months].sort().reverse();
  const prev   = currentVal || sel.value;
  sel.innerHTML = '<option value="">All Months</option>' +
    sorted.map(m => {
      const label = new Date(m+'-01').toLocaleDateString('en-US',{year:'numeric',month:'long'});
      return `<option value="${m}">${label}</option>`;
    }).join('');
  if (prev) sel.value = prev;
}

// ══════════════════════════════════════════════════════════
//  RESET & MANUAL SYNC
// ══════════════════════════════════════════════════════════
async function resetData() {
  if (!confirm('Clear ALL data? This cannot be undone.')) return;
  appData = { users: [] };
  await saveData();
  renderAll();
  toast('All data cleared.', 'error');
}

async function manualSync() {
  if (!SHEET_URL || SHEET_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    toast('No Google Sheet configured yet.', 'error'); return;
  }
  toast('Syncing from Google Sheets…');
  await syncFromSheet();
  renderAll();
  toast('Synced successfully!');
}

// ══════════════════════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
  document.getElementById('add-weight-form').addEventListener('submit', handleAddWeight);
  document.getElementById('profile-user-select').addEventListener('change', renderProfilePage);
  document.getElementById('history-user-select').addEventListener('change', renderHistoryPage);
  document.getElementById('month-select').addEventListener('change', renderMonthlyPage);
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
  });
  document.getElementById('overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  });
  setTodayDate();
  init();
});
