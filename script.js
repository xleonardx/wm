/**
 * Weight Monitor — script.js
 * Vanilla JS, localStorage-backed, Chart.js for graphs.
 * ----------------------------------------------------------
 * On first load: fetches data.json to seed localStorage.
 * Thereafter: all reads/writes go to localStorage.
 * ----------------------------------------------------------
 */

// ── State ────────────────────────────────────────────────
let appData   = { users: [] };   // live data object
let weightChart = null;          // Chart.js instance (profile page)

// ── Init ─────────────────────────────────────────────────
async function init() {
  const stored = localStorage.getItem('weightAppData');

  if (stored) {
    // Use saved data
    appData = JSON.parse(stored);
  } else {
    // First run: load seed data from data.json
    try {
      const res  = await fetch('data.json');
      appData    = await res.json();
      saveData();
    } catch (e) {
      // data.json not available (e.g. opened directly as file:// without server)
      appData = { users: [] };
      saveData();
    }
  }

  renderAll();
  navigate('profiles');
}

// ── Persist ───────────────────────────────────────────────
function saveData() {
  localStorage.setItem('weightAppData', JSON.stringify(appData));
}

// ── Navigation ────────────────────────────────────────────
function navigate(pageId) {
  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pageId);
  });

  // Mobile: close sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');

  // Re-render the specific page
  if (pageId === 'profiles')  renderProfilePage();
  if (pageId === 'history')   renderHistoryPage();
  if (pageId === 'monthly')   renderMonthlyPage();
}

// ── Toast ──────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'show ' + type;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = ''; }, 3000);
}

// ── Helpers ───────────────────────────────────────────────
function getUser(id) {
  return appData.users.find(u => u.id === id);
}

function calcAge(birthday) {
  const today = new Date();
  const dob   = new Date(birthday);
  let age     = today.getFullYear() - dob.getFullYear();
  const m     = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function calcBMI(weight, height) {
  const h = height / 100;
  return (weight / (h * h)).toFixed(1);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', cls: 'badge-red' };
  if (bmi < 25)   return { label: 'Normal',       cls: 'badge-green' };
  if (bmi < 30)   return { label: 'Overweight',   cls: 'badge-red' };
  return              { label: 'Obese',        cls: 'badge-red' };
}

function formatDate(dateStr) {
  // "2026-03-01" → "Mar 01"
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function sortedWeights(user) {
  return [...user.weights].sort((a, b) => a.date.localeCompare(b.date));
}

// ── Populate all <select> elements with users ─────────────
function renderAll() {
  populateUserSelects();
  renderProfilePage();
}

function populateUserSelects() {
  const selects = document.querySelectorAll('.user-select');
  selects.forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = '<option value="">— Select user —</option>';
    appData.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value       = u.id;
      opt.textContent = u.name;
      sel.appendChild(opt);
    });
    // Restore previous selection if still valid
    if (prev && appData.users.find(u => u.id == prev)) sel.value = prev;
  });
}

// ──────────────────────────────────────────────────────────
//  PROFILE PAGE
// ──────────────────────────────────────────────────────────
function renderProfilePage() {
  const sel  = document.getElementById('profile-user-select');
  const uid  = parseInt(sel?.value);
  const info = document.getElementById('profile-info');
  const chartArea = document.getElementById('profile-chart-area');

  if (!uid || isNaN(uid)) {
    info.innerHTML      = emptyState('Select a user to view their profile');
    chartArea.innerHTML = '';
    return;
  }

  const u = getUser(uid);
  if (!u) return;

  const ws      = sortedWeights(u);
  const latest  = ws.length ? ws[ws.length - 1].weight : null;
  const earliest= ws.length ? ws[0].weight : null;
  const diff    = latest !== null && ws.length > 1 ? (latest - earliest).toFixed(1) : null;
  const bmi     = latest ? calcBMI(latest, u.height) : null;
  const bmiCat  = bmi ? bmiCategory(parseFloat(bmi)) : null;
  const initials= u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Card left
  info.innerHTML = `
    <div class="avatar-circle">${initials}</div>
    <div class="profile-name">${u.name}</div>
    <div class="profile-sub">Age ${calcAge(u.birthday)} · ${u.height} cm</div>
    <ul class="profile-detail-list">
      <li><span class="key">Birthday</span><span class="val">${formatDateFull(u.birthday)}</span></li>
      <li><span class="key">Height</span><span class="val">${u.height} cm</span></li>
      <li><span class="key">Current Weight</span><span class="val">${latest !== null ? latest + ' kg' : '—'}</span></li>
      <li><span class="key">BMI</span><span class="val">${bmi ? `${bmi} <span class="badge ${bmiCat.cls}" style="font-size:0.72rem">${bmiCat.label}</span>` : '—'}</span></li>
      <li><span class="key">Records</span><span class="val">${ws.length} entries</span></li>
      ${diff !== null ? `<li>
        <span class="key">Change (total)</span>
        <span class="val ${parseFloat(diff) <= 0 ? 'delta down' : 'delta up'}">
          ${parseFloat(diff) > 0 ? '+' : ''}${diff} kg
        </span>
      </li>` : ''}
    </ul>
  `;

  // Chart
  if (ws.length < 2) {
    chartArea.innerHTML = `<div class="card"><p style="color:var(--text-muted);font-size:0.9rem">Add at least 2 weight entries to see the trend chart.</p></div>`;
  } else {
    chartArea.innerHTML = `
      <div class="card">
        <div class="card-title">Weight Trend</div>
        <div class="chart-container">
          <canvas id="weightCanvas"></canvas>
        </div>
      </div>`;
    renderChart(ws);
  }
}

function renderChart(ws) {
  if (weightChart) { weightChart.destroy(); weightChart = null; }
  const ctx = document.getElementById('weightCanvas');
  if (!ctx) return;

  const labels = ws.map(w => formatDate(w.date));
  const data   = ws.map(w => w.weight);
  const min    = Math.min(...data) - 1;
  const max    = Math.max(...data) + 1;

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data,
        borderColor: '#2d6a4f',
        backgroundColor: 'rgba(45,106,79,0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: '#2d6a4f',
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `  ${ctx.parsed.y} kg`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f0ece4' },
          ticks: { color: '#7a7060', font: { family: 'DM Sans', size: 11 } }
        },
        y: {
          min, max,
          grid: { color: '#f0ece4' },
          ticks: {
            color: '#7a7060',
            font: { family: 'DM Sans', size: 11 },
            callback: v => v + ' kg'
          }
        }
      }
    }
  });
}

// ──────────────────────────────────────────────────────────
//  ADD USER
// ──────────────────────────────────────────────────────────
function handleAddUser(e) {
  e.preventDefault();
  const name   = document.getElementById('new-name').value.trim();
  const bday   = document.getElementById('new-birthday').value;
  const height = parseFloat(document.getElementById('new-height').value);

  if (!name || !bday || !height) { toast('Please fill in all fields.', 'error'); return; }

  const maxId = appData.users.reduce((m, u) => Math.max(m, u.id), 0);
  const user  = { id: maxId + 1, name, birthday: bday, height, weights: [] };
  appData.users.push(user);
  saveData();
  populateUserSelects();

  document.getElementById('add-user-form').reset();
  toast(`${name} added successfully!`);
  navigate('profiles');
  document.getElementById('profile-user-select').value = user.id;
  renderProfilePage();
}

// ──────────────────────────────────────────────────────────
//  ADD WEIGHT
// ──────────────────────────────────────────────────────────
function handleAddWeight(e) {
  e.preventDefault();
  const uid    = parseInt(document.getElementById('weight-user-select').value);
  const date   = document.getElementById('weight-date').value;
  const weight = parseFloat(document.getElementById('weight-value').value);

  if (!uid || !date || isNaN(weight)) { toast('Please fill in all fields.', 'error'); return; }

  const user = getUser(uid);
  if (!user) { toast('User not found.', 'error'); return; }

  // Check for duplicate date
  const existing = user.weights.find(w => w.date === date);
  if (existing) {
    existing.weight = weight;   // update
    toast(`Updated ${user.name}'s weight for ${formatDate(date)}.`);
  } else {
    user.weights.push({ date, weight });
    toast(`Weight logged for ${user.name}!`);
  }

  saveData();
  document.getElementById('add-weight-form').reset();
  setTodayDate();

  // Refresh profile if the same user is selected
  if (parseInt(document.getElementById('profile-user-select').value) === uid) {
    renderProfilePage();
  }
}

// ──────────────────────────────────────────────────────────
//  HISTORY PAGE
// ──────────────────────────────────────────────────────────
function renderHistoryPage() {
  const uid  = parseInt(document.getElementById('history-user-select').value);
  const body = document.getElementById('history-tbody');
  const info = document.getElementById('history-user-info');

  if (!uid || isNaN(uid)) {
    body.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:32px;color:var(--text-muted)">Select a user to see their history.</td></tr>`;
    info.textContent = '';
    return;
  }

  const user = getUser(uid);
  if (!user) return;

  const ws = sortedWeights(user).reverse(); // newest first
  info.textContent = `${ws.length} record${ws.length !== 1 ? 's' : ''} for ${user.name}`;

  if (!ws.length) {
    body.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:32px;color:var(--text-muted)">No weight entries yet.</td></tr>`;
    return;
  }

  body.innerHTML = ws.map((w, i) => {
    // Compare to next (older) entry
    const prev  = ws[i + 1];
    const delta = prev ? (w.weight - prev.weight).toFixed(1) : null;
    const deltaHtml = delta !== null
      ? `<span class="${parseFloat(delta) <= 0 ? 'delta down' : 'delta up'}">
           ${parseFloat(delta) > 0 ? '+' : ''}${delta} kg
         </span>`
      : '<span style="color:var(--text-light)">—</span>';
    return `
      <tr>
        <td>${formatDateFull(w.date)}</td>
        <td><strong>${w.weight}</strong> kg</td>
        <td>${deltaHtml}</td>
        <td>
          <button class="btn-icon" onclick="deleteWeight(${user.id}, '${w.date}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function deleteWeight(userId, date) {
  const user = getUser(userId);
  if (!user) return;
  user.weights = user.weights.filter(w => w.date !== date);
  saveData();
  renderHistoryPage();
  renderProfilePage();
  toast('Entry deleted.');
}

// ──────────────────────────────────────────────────────────
//  MONTHLY TABLE PAGE
// ──────────────────────────────────────────────────────────
function renderMonthlyPage() {
  const table    = document.getElementById('monthly-table');
  const noData   = document.getElementById('monthly-no-data');
  const monthSel = document.getElementById('month-select');

  if (!appData.users.length) {
    table.style.display = 'none';
    noData.style.display = 'block';
    return;
  }

  // Gather all unique dates across all users for the selected month
  const selectedMonth = monthSel.value; // "YYYY-MM" or ""
  const allDates = new Set();
  appData.users.forEach(u => {
    u.weights.forEach(w => {
      if (!selectedMonth || w.date.startsWith(selectedMonth)) {
        allDates.add(w.date);
      }
    });
  });

  const sortedDates = [...allDates].sort();

  if (!sortedDates.length) {
    table.style.display = 'none';
    noData.style.display = 'block';
    noData.innerHTML = emptyState('No weight data for this period.');
    return;
  }

  table.style.display = '';
  noData.style.display = 'none';

  // Build header
  const thead = table.querySelector('thead tr');
  thead.innerHTML = `<th>User</th>` + sortedDates.map(d => `<th style="text-align:center">${formatDate(d)}</th>`).join('');

  // Build rows
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = appData.users.map(u => {
    const weightMap = {};
    u.weights.forEach(w => { weightMap[w.date] = w.weight; });
    const cells = sortedDates.map(d => {
      const val = weightMap[d];
      return val !== undefined
        ? `<td class="month-cell">${val} kg</td>`
        : `<td class="month-cell empty">—</td>`;
    }).join('');
    return `<tr><td class="user-cell">${u.name}</td>${cells}</tr>`;
  }).join('');

  // Populate month selector with available months
  populateMonthSelector(monthSel, selectedMonth);
}

function populateMonthSelector(sel, currentVal) {
  const months = new Set();
  appData.users.forEach(u => {
    u.weights.forEach(w => months.add(w.date.slice(0, 7)));
  });
  const sorted = [...months].sort().reverse();
  const prev   = currentVal || sel.value;
  sel.innerHTML = '<option value="">All Months</option>' +
    sorted.map(m => {
      const label = new Date(m + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      return `<option value="${m}">${label}</option>`;
    }).join('');
  if (prev) sel.value = prev;
}

// ──────────────────────────────────────────────────────────
//  UTILITY
// ──────────────────────────────────────────────────────────
function emptyState(msg) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
    </svg>
    <p>${msg}</p>
  </div>`;
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('weight-date');
  if (dateInput) dateInput.value = today;
}

// ── Reset data ────────────────────────────────────────────
function resetData() {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
  localStorage.removeItem('weightAppData');
  appData = { users: [] };
  renderAll();
  toast('All data cleared.', 'error');
}

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav clicks
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Forms
  document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
  document.getElementById('add-weight-form').addEventListener('submit', handleAddWeight);

  // Profile user select
  document.getElementById('profile-user-select').addEventListener('change', renderProfilePage);

  // History user select
  document.getElementById('history-user-select').addEventListener('change', renderHistoryPage);

  // Monthly month selector
  document.getElementById('month-select').addEventListener('change', renderMonthlyPage);

  // Mobile menu
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
  });
  document.getElementById('overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  });

  // Set today's date on weight form
  setTodayDate();

  // Start
  init();
});
