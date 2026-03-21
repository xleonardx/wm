# Weight Monitor — Simple Weight Tracking Web App

Syncs data across all devices using **Google Sheets as a free database**.
Built with pure HTML, CSS, and Vanilla JavaScript. Deployable on GitHub Pages.

---

## Setup Guide (5 minutes)

### Step 1 — Deploy the Google Apps Script

1. Go to sheets.google.com and create a **new blank spreadsheet**
2. Name it **Weight Monitor**
3. Click **Extensions → Apps Script**
4. Delete all existing code in the editor
5. Open `apps-script.gs` and **paste the entire contents**
6. Click **Save**, then **Deploy → New Deployment**
7. Gear icon ⚙ next to "Type" → select **Web App**
8. Set **"Who has access"** → **Anyone**
9. Click **Deploy**, authorize when prompted
10. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

### Step 2 — Add the URL to script.js

Open `script.js` and replace line 12:

```js
// BEFORE:
const SHEET_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

// AFTER:
const SHEET_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
```

### Step 3 — Upload to GitHub Pages

Upload `index.html`, `style.css`, `script.js` to your GitHub repo.
You do NOT need to upload `apps-script.gs` or `data.json`.

---

## How Sync Works

- Every save pushes the full data to Google Sheets
- Every page load fetches the latest data from the sheet
- Sidebar shows live sync status: ✓ Synced / ⟳ Syncing / ⚠ Offline
- Use **↺ Sync Now** to manually pull the latest data at any time
