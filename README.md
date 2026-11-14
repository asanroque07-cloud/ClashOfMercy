# Clash Of Mercy

A browser-based tactical shooter game built with **React 19 + Vite 7 + Tailwind CSS 4**.

This repository is ready to push to GitHub and deploy on **Vercel** with zero extra configuration.

---

## 🚀 Deploy to Vercel

### Option A — Vercel Dashboard (easiest)

1. Push this folder to a new GitHub repository (see commands below).
2. Go to [vercel.com/new](https://vercel.com/new) and **Import** that repository.
3. Vercel auto-detects the framework. Confirm these settings (they are already set in `vercel.json`):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Click **Deploy**. Your game will be live in ~1 minute.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

---

## 📦 Push to GitHub

From inside this project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

> `node_modules/` and `dist/` are already ignored by `.gitignore`, so the repository stays small and clean. Vercel installs and builds everything itself.

---

## 🛠️ Local Development

Requires **Node.js 20.19+** (or 22.12+). A `.nvmrc` is included — run `nvm use` if you use nvm.

```bash
npm install     # install dependencies
npm run dev     # start dev server at http://localhost:5173
npm run build   # production build into dist/
npm run serve   # preview the production build
```

---

## 📁 Project Structure

```
.
├── index.html            # HTML entry point
├── package.json          # dependencies & scripts
├── vite.config.js        # Vite configuration
├── vercel.json           # Vercel deployment config
├── .nvmrc                # Node version hint
├── public/               # static assets (sprites, sfx, audio, icon)
└── src/
    ├── main.jsx          # React entry point
    ├── App.jsx           # root component / game state
    ├── index.css         # global styles + Tailwind
    ├── components/       # game UI & canvas components
    ├── pages/            # Home / Operator setup screens
    └── lib/              # storage, game types, lobby data, hooks
```

---

## ✅ Notes

- This is a **static single-page app** — no backend or environment variables required.
- All assets (sprites, sounds, music) are bundled from `public/` and served from the site root.
- Player progress is saved in the browser via `localStorage`.
