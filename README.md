# 🧵 Prime Apparel Platform

> **One vibrant workspace for the entire wholesale story** — Django powers the business brain 🧠, React tells the brand story 🎨.

| ⚙️ Backend | 🎨 Frontend |
| --- | --- |
| Django 5 · DRF · Custom apps | React 19 · Vite 7 · Tailwind 4 |
| SQLite/Postgres · OTP auth · Media pipeline | Hero slider · Catalog cards · Lead capture |

---

## 📚 Quick Menu
- [Overview](#-overview)
- [Repo Map](#-repository-map)
- [Tech Dashboard](#-tech-dashboard)
- [Backend Launchpad](#-backend-launchpad)
- [Frontend Launchpad](#-frontend-launchpad)
- [End-to-End Flight Plan](#-end-to-end-flight-plan)

---

## ✨ Overview

```
🌐 React/Vite UI  ===== REST/JSON =====  🧮 Django + DRF core
    Hero, auth, catalog                         Users, leads, products, orders
```

- **Mission**: Showcase premium apparel while the backend tracks every supplier, cost, and order.
- **Why one repo?** Faster onboarding, single source of truth for env vars, shared media, and coordinated releases.

---

## 🗂️ Repository Map

```
Shoppin-website/
├─ backend/    ← Django project & apps
├─ frontend/   ← React + Vite SPA
├─ media/      ← Runtime uploads (created later)
├─ db.sqlite3  ← Default local database
└─ README.md   ← You are here
```

---

## 🛠️ Tech Dashboard

| Layer | Backend 🚀 | Frontend 🌈 |
| --- | --- | --- |
| Core | Django 5, Django REST Framework | React 19, React Router 7 |
| Build | manage.py, virtualenv, pip | Vite 7, npm scripts |
| State | Custom user model, OTP flows | Redux Toolkit, React Redux |
| Styling | Django admin + DRF browsable API | Tailwind CSS 4, custom tokens |
| Data & APIs | SQLite/Postgres, media storage, email SMTP | Axios/fetch via `VITE_API_BASE_URL` |
| Quality | `python manage.py test` | ESLint 9 flat config |

---

## 🛡️ Backend Launchpad

### 🧭 Snapshot
Multi-app Django project covering users, leads, products, suppliers, purchase orders, production, costings, and orders. DRF serializers expose clean APIs to the frontend.

| App | Highlights |
| --- | --- |
| `users` | Custom auth, OTP reset, role gating |
| `products` | Catalog, certifications, owner, media |
| `leads` | CRM-style pipeline + reminders |
| `suppliers` · `purchase_orders` | Vendor onboarding + PO lifecycle |
| `orders` · `production` | Fulfillment checkpoints + shop floor visibility |
| `costings` | Margin calculators & rate cards |

### ✅ Prerequisites
- Python 3.11+
- pip + virtualenv
- Git & PowerShell/Terminal
- SQLite (default) or Postgres credentials if needed

### 🪄 Setup Steps
1. **Clone + enter**
   ```powershell
   git clone https://github.com/Reddy-Sekhar/Shoppin-website.git
   cd Shoppin-website/backend
   ```
2. **Create virtual environment**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
3. **Install dependencies**
   ```powershell
   pip install -r requirements.txt
   ```
4. **Configure `.env`** (next to `manage.py`)
   ```env
   SECRET_KEY=replace-me
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   EMAIL_HOST=smtp.example.com
   EMAIL_HOST_USER=bot@example.com
   EMAIL_HOST_PASSWORD=app-password
   ```
5. **Prep media directories**
   ```powershell
   python create_media_dirs.py
   ```
6. **Apply migrations**
   ```powershell
   python manage.py migrate
   ```
7. **(Optional) Seed catalog**
   ```powershell
   python seed_products.py
   ```
8. **Create superuser**
   ```powershell
   python manage.py createsuperuser
   ```
9. **Run dev server**
   ```powershell
   python manage.py runserver 0.0.0.0:8000
   ```
10. **Run tests anytime**
    ```powershell
    python manage.py test
    ```

### 🔑 Env & Email Cheatsheet

| Variable | Description |
| --- | --- |
| `EMAIL_BACKEND` | Override default SMTP transport |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS` | Mail relay details |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | Credentials used to send OTPs |
| `DEFAULT_FROM_EMAIL` | Friendly sender label |
| `PASSWORD_RESET_OTP_EXPIRY_MINUTES` | OTP validity window (10 min default) |
| `PASSWORD_RESET_MAX_ATTEMPTS` | Lockout threshold (default 5) |

### 📡 Key Endpoints
- `api/auth/` — JWT + OTP flows
- `api/products/` — Catalog CRUD + media uploads
- `api/leads/` — Pipeline + notes
- `api/orders/`, `api/purchase-orders/` — Fulfillment & procurement

### 🚀 Deploy & Troubleshoot
- `python manage.py collectstatic` before deploying.
- Turn `DEBUG=False`, rotate `SECRET_KEY`, tighten `ALLOWED_HOSTS`, enable HTTPS.
- Serve `/media/` via S3/Azure or web server mapping.
- Use `backend.asgi:application` for ASGI hosts (Daphne/Uvicorn).
- **CORS pain?** Add your frontend origin to `CORS_ALLOWED_ORIGINS`.
- **Missing images?** Rerun `create_media_dirs.py` or configure storage bucket.

---

## 🎨 Frontend Launchpad

### 🧭 Snapshot
React 19 SPA (Vite 7 + Tailwind 4) delivering branded storytelling, catalog browsing, auth, and lead capture flows hooked directly to the Django APIs.

### 🌟 Feature Highlights
- Cinematic hero slider with trust badges & CTAs.
- Responsive catalog grid + detail pages driven by `/api/products`.
- Inquiry + authentication modals wired via Redux Toolkit.
- Tailwind v4 tokens for gradients, overlays, and typography rhythm.

### ✅ Prerequisites
- Node.js 20 LTS (≥18.18 supported)
- npm 10+
- Backend server reachable at `http://127.0.0.1:8000/`

### 🪄 Setup Steps
1. **Enter folder**
   ```powershell
   cd Shoppin-website/frontend
   ```
2. **Copy env template (optional)**
   ```powershell
   copy .env .env.local
   ```
3. **Fill env values**
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   VITE_RECAPTCHA_SITE_KEY=replace-me
   ```
   Vite only exposes vars prefixed with `VITE_`.
4. **Install packages**
   ```powershell
   npm install
   ```
5. **Run dev server**
   ```powershell
   npm run dev
   ```
   Default preview: `http://localhost:5173`
6. **Quality + build**
   ```powershell
   npm run lint
   npm run build
   npm run preview
   ```

### 🧩 Project Structure
```
frontend/
├─ public/           # Static assets & product shots
├─ src/
│  ├─ api/          # Axios instance + upload helpers
│  ├─ assets/       # SVGs, gradients, textures
│  ├─ components/   # Navbar, Hero, Cards, Modals
│  ├─ constants/    # Hero slides, trust badges
│  ├─ layouts/      # Shell layouts
│  ├─ pages/        # Home, Products, ProductDetails, About, Costing, Auth
│  ├─ redux/        # store.js + slices (auth, ui)
│  ├─ routes/       # Router config & guards
│  ├─ App.jsx       # View composition
│  └─ main.jsx      # Entry + router provider
└─ vite.config.js / tailwind.config.js / eslint.config.js
```

### 🚀 Deploy & Troubleshoot
- `npm run build` → upload `dist/` to Netlify, Vercel, S3, etc.
- Configure `VITE_API_BASE_URL` (and friends) in your hosting dashboard.
- On a single domain, serve `dist/` and reverse proxy `/api` to Django.
- **Blank screen?** Check Vite overlay + browser console.
- **API errors?** Ensure backend is live & `VITE_API_BASE_URL` has no double slashes.
- **CORS?** Use the dev proxy (already configured) or whitelist the prod origin in Django.

### 🚀 GitHub Pages Deployment
This project includes a GitHub Actions workflow for automatic deployment to GitHub Pages:

1. **Enable GitHub Pages**: Go to your repository Settings → Pages → Source: select "GitHub Actions"
2. **Configure API URL (optional)**: Add a repository variable `VITE_API_BASE_URL` with your backend API URL
3. **Deploy**: Push to the `main` branch or manually trigger the workflow from the Actions tab
4. **Access**: Your site will be available at `https://<username>.github.io/Shoppin-website/`

For custom domains:
- Add a `CNAME` file to `frontend/public/` with your domain
- Set repository variable `VITE_BASE_PATH` to `/`

---

## 🛰️ End-to-End Flight Plan

1. ✅ Finish backend setup → `python manage.py runserver 0.0.0.0:8000`
2. 🎨 Launch frontend dev server → `npm run dev`
3. 🔐 Register/login, browse catalog, submit inquiries; monitor Django logs for API calls.
4. 🚢 Production: deploy Django (Gunicorn/Uvicorn + Postgres + object storage) and serve the Vite `dist/` bundle via your CDN/host. Point frontend env vars to the deployed API URL.

Need deeper dives? `backend/README.md` and `frontend/README.md` still contain app-specific notes. Happy building! 🧵✨
