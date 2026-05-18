# Cloud Elevate — Complete Setup & Deployment Guide

This guide walks you through everything from zero — creating accounts, setting up the database,
running locally, and deploying to the internet with Azure (which you already know from office work).

---

## What you will need (all free or very cheap)

| Service | What it does | Cost |
|---------|-------------|------|
| **Supabase** | Your PostgreSQL database + Auth | Free forever (up to 500MB) |
| **Razorpay** | Accept payments from students | Free (they take 2% per transaction) |
| **Bunny.net** | Host and stream your course videos | ~₹1 per GB served |
| **Azure Static Web Apps** | Host your frontend website | Free forever |
| **Railway.app** | Host your backend API server | Free $5 credit/month |
| **Domain name** | yourdomain.com | Optional — Azure gives a free URL |

> You do **not** need a domain name to go live. Azure gives you a URL like
> `https://lively-ocean-123.azurestaticapps.net` for free.

---

## PART 1 — Create Your Accounts

### 1.1 Supabase (Database)

1. Go to **https://supabase.com** → click **Start your project**
2. Sign in with GitHub (or create an account)
3. Click **New Project**
   - Organization: your name or "Cloud Elevate"
   - Name: `cloud-elevate`
   - Database Password: create a strong password **and save it somewhere**
   - Region: **South Asia (ap-south-1)** ← closest to India
4. Click **Create new project** — wait 2 minutes for it to set up
5. Once ready, go to **Project Settings → API** on the left sidebar
6. Note down these three values — you will need them later:
   ```
   Project URL      → https://abcdefgh.supabase.co
   anon public key  → eyJhbGc...  (long string)
   service_role key → eyJhbGc...  (different long string — keep secret!)
   ```

### 1.2 Run the Database Schema

This creates all your tables (users, courses, lessons, payments, etc.)

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `backend/src/db/schema.sql` in this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (green button) — you should see "Success. No rows returned"
6. Click **Table Editor** in the sidebar — you should see all your tables listed

### 1.3 Razorpay (Payments)

1. Go to **https://razorpay.com** → click **Sign Up**
2. Fill in your details (use your real name and phone — they verify it)
3. After signup, go to **Dashboard → Settings → API Keys**
4. Click **Generate Test Key** — this gives you test keys (no real money)
5. Note down:
   ```
   Key ID     → rzp_test_XXXXXXXXXXXXXXXX
   Key Secret → XXXXXXXXXXXXXXXXXXXXXXXX
   ```
> **Test mode**: Use test UPI `success@razorpay` or test card `4111 1111 1111 1111`
> to simulate payments without charging real money.

### 1.4 Bunny.net (Video Hosting)

1. Go to **https://bunny.net** → **Sign Up** (free, no credit card needed to start)
2. Go to **CDN → Storage** → click **Add Storage Zone**
   - Name: `cloud-elevate-videos`
   - Main Storage Region: **Singapore** (closest to India)
   - Click **Add Storage Zone**
3. Go to **CDN → Pull Zones** → click **Add Pull Zone**
   - Name: `cloud-elevate`
   - Origin URL: select your storage zone
   - This gives you a URL like: `https://cloud-elevate.b-cdn.net`
4. Go to **Account → API** → copy your **Account API Key**
5. To upload videos:
   - Go to your Storage Zone → click **File Manager**
   - Create folders like `/gcp-ace/module-1/lesson-1.mp4`
   - Upload your video files
   - The video URL will be: `https://cloud-elevate.b-cdn.net/gcp-ace/module-1/lesson-1.mp4`

---

## PART 2 — Run Locally on Your Laptop

### 2.1 Install Node.js

1. Go to **https://nodejs.org** → download the **LTS** version (e.g. 20.x)
2. Install it — keep all defaults
3. Open Terminal (Mac) or Command Prompt (Windows) and verify:
   ```bash
   node --version    # should show v20.x.x
   npm --version     # should show 10.x.x
   ```

### 2.2 Install Project Dependencies

Open Terminal, navigate to your project folder, and run:

```bash
# Go to the project root folder
cd /path/to/cloud-elevate

# Install ALL dependencies (root + frontend + backend + shared)
npm install
```

This installs everything at once because of the monorepo setup.

### 2.3 Create Environment Files

These files hold your secret keys. They are never uploaded to GitHub.

**Step A — Backend environment file**

Create a new file called `.env` inside the `backend/` folder:

```bash
# backend/.env

PORT=4000
NODE_ENV=development

# Paste your Supabase values here
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-step-1.1

# Make up any long random string (at least 32 characters)
# Example: open https://www.uuidgenerator.net/ and paste two UUIDs together
JWT_SECRET=paste-your-long-random-secret-string-here-min-32-chars

# Paste your Razorpay TEST keys from step 1.3
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Paste your Bunny.net values from step 1.4
BUNNY_API_KEY=your-bunny-account-api-key
BUNNY_CDN_HOSTNAME=https://cloud-elevate.b-cdn.net

# Your email — this account will be the admin
ADMIN_EMAIL=your-email@gmail.com

# Where your frontend runs locally
FRONTEND_URL=http://localhost:3000
```

**Step B — Frontend environment file**

Create a new file called `.env.local` inside the `frontend/` folder:

```bash
# frontend/.env.local

VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-from-step-1.1
VITE_API_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
```

### 2.4 Start the App Locally

Open **two Terminal windows** — one for backend, one for frontend:

**Terminal 1 — Backend API:**
```bash
cd cloud-elevate/backend
npm run dev
```
You should see:
```
╔═══════════════════════════════════════╗
║   Cloud Elevate API                   ║
║   Running on http://localhost:4000    ║
╚═══════════════════════════════════════╝
```

**Terminal 2 — Frontend:**
```bash
cd cloud-elevate/frontend
npm run dev
```
You should see:
```
  ➜  Local:   http://localhost:3000/
```

Open your browser and go to **http://localhost:3000** — your app is running!

### 2.5 Create Your Admin Account

1. Go to **http://localhost:3000/register**
2. Register with the **same email** you put in `ADMIN_EMAIL` in the backend `.env`
3. Log in — you will automatically be an admin
4. You'll see the **Admin** link in the navbar

### 2.6 Add Your First Course (Local)

1. Go to **http://localhost:3000/admin/courses**
2. Click **New Course** → fill in the details
3. After creating, click **Draft** to publish it
4. Go to **http://localhost:3000/courses** — your course appears!

---

## PART 3 — Deploy to the Internet (Azure)

Since you know Azure DevOps, we'll use:
- **Azure Static Web Apps** → hosts your React frontend (FREE)
- **Railway.app** → hosts your Node.js backend (very simple, $5/month)

Both give you working URLs without buying a domain.

---

### 3.1 Push Your Code to GitHub

If your project isn't on GitHub yet:

1. Go to **https://github.com** → create a new **private** repository called `cloud-elevate`
2. In your terminal:
   ```bash
   cd cloud-elevate
   git remote add origin https://github.com/YOUR-USERNAME/cloud-elevate.git
   git push -u origin main
   ```
3. Make sure `.env` and `.env.local` are in `.gitignore` (they already are — never commit secrets!)

---

### 3.2 Deploy Backend on Railway.app

Railway is the simplest way to host a Node.js backend — similar to what Render.com does but more reliable.

1. Go to **https://railway.app** → sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `cloud-elevate` repository
4. Railway will detect it's a monorepo. Click **Add Service** and choose **GitHub Repo** again
5. In the service settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
6. Go to **Variables** tab → add every variable from your `backend/.env`:
   ```
   PORT                     = 4000
   NODE_ENV                 = production
   SUPABASE_URL             = https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
   JWT_SECRET               = your-jwt-secret
   RAZORPAY_KEY_ID          = rzp_live_... (switch to LIVE key for production)
   RAZORPAY_KEY_SECRET      = your-live-razorpay-secret
   BUNNY_API_KEY            = your-bunny-key
   BUNNY_CDN_HOSTNAME       = https://cloud-elevate.b-cdn.net
   ADMIN_EMAIL              = your-email@gmail.com
   FRONTEND_URL             = (leave blank for now — fill after step 3.3)
   ```
7. Click **Deploy** — Railway builds and deploys your backend
8. Go to **Settings → Networking** → click **Generate Domain**
   - You'll get a URL like: `https://cloud-elevate-api.up.railway.app`
   - **Save this URL** — you'll need it in the next step

---

### 3.3 Deploy Frontend on Azure Static Web Apps

This is where your Azure DevOps knowledge comes in handy!

**Step A — Create the Azure resource**

1. Go to **https://portal.azure.com**
2. Search for **Static Web Apps** → click **Create**
3. Fill in:
   - Subscription: your subscription
   - Resource Group: create new → `cloud-elevate-rg`
   - Name: `cloud-elevate-frontend`
   - Plan type: **Free**
   - Region: **East Asia** (closest to India with free plan)
   - Source: **GitHub**
   - Sign in to GitHub → select your `cloud-elevate` repository
   - Branch: `main`
   - Build Presets: **React**
   - App location: `/frontend`
   - Output location: `dist`
4. Click **Review + Create** → **Create**
5. Azure will:
   - Create the Static Web App
   - **Automatically add an Azure DevOps/GitHub Actions pipeline** to your repo
   - Give you a free URL like: `https://lively-ocean-123.azurestaticapps.net`

**Step B — Add environment variables to Azure**

1. Go to your Static Web App resource → **Configuration** in the left menu
2. Under **Application settings**, add:
   ```
   VITE_SUPABASE_URL        = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY   = your-anon-key
   VITE_API_URL             = https://cloud-elevate-api.up.railway.app
   VITE_RAZORPAY_KEY_ID     = rzp_live_your_live_key
   ```
3. Click **Save**

**Step C — Update backend CORS**

1. Go back to Railway → your backend service → **Variables**
2. Update `FRONTEND_URL` to your Azure URL:
   ```
   FRONTEND_URL = https://lively-ocean-123.azurestaticapps.net
   ```
3. Railway will auto-redeploy

**Step D — Trigger a deploy**

Push any small change to GitHub and the Azure pipeline will automatically build and deploy:
```bash
git add .
git commit -m "configure production environment"
git push
```

Watch the pipeline run in your GitHub repo under **Actions** tab (or in Azure DevOps if you set it up that way).

**Your app is now live at your Azure URL!**

---

### 3.4 Using Azure DevOps Pipelines Instead of GitHub Actions

If you prefer to use Azure DevOps (familiar from office work):

1. In Azure Portal → Static Web App → **Deployment token** — copy the token
2. In your Azure DevOps project, create a new pipeline with this YAML:

```yaml
# azure-pipelines.yml (put this in your repo root)
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: |
      cd frontend
      npm install
      npm run build
    displayName: 'Build Frontend'
    env:
      VITE_SUPABASE_URL: $(VITE_SUPABASE_URL)
      VITE_SUPABASE_ANON_KEY: $(VITE_SUPABASE_ANON_KEY)
      VITE_API_URL: $(VITE_API_URL)
      VITE_RAZORPAY_KEY_ID: $(VITE_RAZORPAY_KEY_ID)

  - task: AzureStaticWebApp@0
    inputs:
      app_location: 'frontend'
      output_location: 'dist'
      azure_static_web_apps_api_token: $(DEPLOYMENT_TOKEN)
```

3. Go to **Pipeline → Variables** → add all `VITE_*` variables and `DEPLOYMENT_TOKEN`
4. Run the pipeline — it builds and deploys automatically on every push to `main`

---

## PART 4 — After You Go Live

### Switch Razorpay from Test to Live

1. Go to **Razorpay Dashboard** → toggle from **Test Mode** to **Live Mode** (top right)
2. Go to **Settings → API Keys** → generate **Live keys**
3. Update both Railway (backend) and Azure (frontend) variables with live keys
4. Complete KYC verification on Razorpay (required for live payments — takes 1-2 days)

### Add a Custom Domain (Optional — when you're ready)

1. Buy a domain from **GoDaddy**, **Hostinger**, or **Namecheap** (~₹500-800/year)
2. In Azure Static Web App → **Custom domains** → add your domain
3. Azure gives you a DNS record to copy → paste it in your domain registrar's DNS settings
4. HTTPS certificate is automatically issued by Azure (free)

### Monitor Your App

- **Supabase Dashboard** → see your database, users, and queries
- **Railway Dashboard** → see backend logs, CPU/memory usage
- **Azure Portal → Static Web App** → see deployment history

---

## Quick Reference — All URLs

| What | Local | Production |
|------|-------|------------|
| Frontend | http://localhost:3000 | https://lively-ocean-123.azurestaticapps.net |
| Backend API | http://localhost:4000 | https://cloud-elevate-api.up.railway.app |
| Backend Health | http://localhost:4000/health | https://cloud-elevate-api.up.railway.app/health |
| Admin Panel | http://localhost:3000/admin | https://lively-ocean-123.azurestaticapps.net/admin |

---

## Common Problems & Fixes

**"CORS error" in browser console**
→ Your backend `FRONTEND_URL` doesn't match your actual frontend URL.
→ Fix: Update `FRONTEND_URL` in Railway variables to exactly match your Azure URL.

**"Invalid token" when logging in**
→ `JWT_SECRET` is different between environments.
→ Fix: Use the same `JWT_SECRET` value everywhere. Don't change it after users are registered.

**Videos not playing**
→ Your `BUNNY_CDN_HOSTNAME` is wrong or the video file path doesn't match.
→ Fix: Check the exact URL of a video in Bunny.net File Manager and compare with what's stored in your database.

**Payments failing**
→ You're using test keys in production or live keys in test.
→ Fix: Test mode = `rzp_test_` prefix. Live mode = `rzp_live_` prefix. Match them.

**Frontend shows blank page after deploy**
→ The `VITE_API_URL` is pointing to localhost instead of your Railway URL.
→ Fix: Update `VITE_API_URL` in Azure Static Web App → Configuration.

**Admin link not showing after login**
→ You registered before setting `ADMIN_EMAIL` in the backend.
→ Fix: In Supabase → Table Editor → `users` table → find your row → set `is_admin = true` manually.

---

## Cost Summary (Monthly)

| Service | Free Tier | When you grow |
|---------|-----------|---------------|
| Supabase | Free (500MB DB, 2GB transfer) | $25/month |
| Railway | Free $5 credit | $5-20/month |
| Azure Static Web Apps | Free | Free (always) |
| Bunny.net | Pay per use (~₹1/GB) | Stays cheap |
| Razorpay | Free (2% transaction fee) | Same |
| **Total to start** | **~₹0/month** | **~₹500-2000/month** |
