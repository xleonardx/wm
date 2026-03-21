# Weight Monitor — Simple Weight Tracking Web App

A clean, mobile-friendly weight monitoring application built with pure HTML, CSS, and Vanilla JavaScript. No frameworks, no backend — runs entirely in the browser.

---

## Features

- **Profiles** — View user details (name, age, height, BMI) and a weight trend line chart
- **Add User** — Create new user profiles with name, birthday, and height
- **Log Weight** — Record daily weight entries (updating existing dates)
- **History** — View and delete weight entries per user with change tracking
- **Monthly Table** — Side-by-side overview of all users across dates

---

## File Structure

```
weight-app/
├── index.html   ← Main HTML (all pages)
├── style.css    ← All styles
├── script.js    ← All application logic
├── data.json    ← Sample seed data (loaded once on first run)
└── README.md    ← This file
```

---

## How to Run Locally

### Option 1 — VS Code Live Server (Recommended)
1. Open the `weight-app` folder in VS Code
2. Install the **Live Server** extension (ritwickdey.LiveServer)
3. Right-click `index.html` → **Open with Live Server**
4. App opens at `http://127.0.0.1:5500`

### Option 2 — Python HTTP Server
```bash
cd weight-app
python3 -m http.server 8080
# Open http://localhost:8080
```

### Option 3 — Node.js
```bash
cd weight-app
npx serve .
# Follow the URL shown in terminal
```

> ⚠️ **Do not open index.html directly** (`file://`) — the browser will block the `fetch('data.json')` call due to CORS restrictions. Use one of the server methods above.

---

## How to Deploy on GitHub Pages

1. Create a new GitHub repository
2. Upload all 4 files (`index.html`, `style.css`, `script.js`, `data.json`)
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch and `/ (root)`
5. Click **Save** — your app will be live at `https://yourusername.github.io/repo-name`

---

## Data Storage

- On first visit, the app loads `data.json` to seed sample users
- All subsequent data (users, weight entries) is stored in **localStorage**
- Clearing browser data will reset the app to the seed data on next load
- Use **Reset All Data** in the sidebar to wipe everything manually

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Markup     | HTML5                             |
| Styling    | CSS3 (CSS Variables, Grid, Flex)  |
| Logic      | Vanilla JavaScript (ES6+)         |
| Charts     | Chart.js 4.x (via CDN)            |
| Fonts      | DM Sans + DM Serif Display (Google Fonts) |
| Storage    | localStorage + data.json seed     |
