# 🎬 Cartoon Rhythm Video Script Generator

An AI-powered web app that generates **Cocomelon-style cartoon video scripts** complete with lyrics, scene-by-scene AI video prompts, and thumbnail ideas.

Built with:
- **HTML/CSS/JS** — Single-page static app (deploy anywhere)
- **Supabase** — Edge Functions (API proxy) + PostgreSQL (script history)
- **Claude API** — Anthropic's AI for script generation
- **Vercel** — Static site hosting

---

## 🚀 Quick Setup (5 steps)

### Step 1: Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up / sign in
2. Create an API key (starts with `sk-ant-`)
3. Copy the key — you'll need it in Step 3

### Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New project"** — give it a name (e.g., `cartoon-scripts`)
3. Choose a region close to you, set a database password
4. Wait ~2 minutes for the project to spin up

### Step 3: Configure Supabase

#### A. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy-paste the entire contents of `supabase/migrations/001_create_scripts.sql`
4. Click **"Run"** — this creates the `scripts` table for storing generated scripts

#### B. Deploy the Edge Function

You need the [Supabase CLI](https://supabase.com/docs/guides/local-development) installed:

```bash
# Install Supabase CLI (one time)
npm install -g supabase

# Login to your Supabase account
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set ALL required secrets (the Edge Function needs these to call Anthropic and save to DB)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase secrets set PROJECT_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set PUBLIC_ANON_KEY=your-anon-key-here

# Deploy the function
supabase functions deploy generate-script
```

> **Where to find your Project Ref:** In Supabase dashboard → Project Settings → General → Reference ID (looks like `abcxyz`)
> **Supabase URL / Anon Key:** Project Settings → API → Project URL / Anon key

#### C. Get Your API Credentials

1. In Supabase dashboard, go to **Project Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **Anon Public Key** (long base64 string starting with `eyJ`)
3. The **Edge Function URL** will be: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-script`

> 🔒 **Security note:** The Anon Key is safe for client-side use when Row Level Security (RLS) is enabled. The Anthropic API key stays server-side in the Edge Function — never exposed to users.

### Step 4: Deploy to Vercel

#### Option A: Via Vercel CLI

```bash
# Install Vercel CLI (one time)
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Option B: Via GitHub + Vercel (Recommended)

1. **Create a GitHub repository** (or push this project — see Step 5)
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your `cartoon-video-script` repository
5. **Framework Preset:** Leave as "Other"
6. **Root Directory:** `./`
7. Click **"Deploy"** — Vercel auto-detects the static site

> ✅ No build command needed — this is a pure static site

### Step 5: Push to GitHub

```bash
# Navigate to the project folder
cd cartoon-video-script

# Initialize git
git init
git add .
git commit -m "Initial commit: Cartoon Video Script Generator"

# Create a repo on GitHub (UI) or use CLI:
gh repo create cartoon-video-script --public --source=.
git push origin main
```

---

## 🎯 Usage

1. Open your deployed Vercel URL
2. Click the **⚙️ gear icon** (top-right)
3. Enter your **Supabase URL**, **Anon Key**, and **Edge Function URL**
4. Type a topic (e.g., "bath time", "counting 1 to 10") and click **Generate**
5. Browse past scripts from the **"Recent scripts"** history panel
6. Copy individual scene prompts or the full style anchor

---

## 📁 Project Structure

```
cartoon-video-script/
├── index.html                          # Main app (refactored for Supabase)
├── package.json                        # Project config
├── vercel.json                         # Vercel deployment settings
├── .env.example                        # Environment variables template
├── .gitignore                          # Git ignore rules
├── README.md                           # This file
└── supabase/
    ├── functions/
    │   └── generate-script/
    │       └── index.ts                # Edge Function: proxy + save to DB
    └── migrations/
        └── 001_create_scripts.sql      # Database schema for script history
```

---

## 🔧 Architecture

```
┌────────────┐     POST /generate-script     ┌──────────────┐
│   Browser  │ ──────────────────────────►   │  Supabase    │
│ (Vercel)   │                                │  Edge Func   │
│            │ ◄──────────────────────────    │              │
│ index.html │     JSON { data: {...} }       │  ┌─────────┐ │
└────────────┘                                │  │ Claude  │ │
                                              │  │  API    │ │
                                              │  └─────────┘ │
                                              │  ┌─────────┐ │
                                              │  │PostgreSQL│ │
                                              │  │(history) │ │
                                              │  └─────────┘ │
                                              └──────────────┘
```

- **Anthropic API key** stays server-side in Supabase Edge Function secrets
- **Script history** persists in Supabase PostgreSQL
- **Static site** is fast and can be deployed anywhere (Vercel, Netlify, GitHub Pages)

---

## 🔐 Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Supabase Edge Function secret | Claude API access |
| `PROJECT_URL` | Supabase Edge Function secret + Browser localStorage | Supabase project URL |
| `PUBLIC_ANON_KEY` | Supabase Edge Function secret + Browser localStorage | Supabase anon access |

---

## 🧪 Local Development

```bash
# Serve the static file locally
npx serve .

# Or with Python
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser and configure the Supabase settings.

---

## 🐛 Troubleshooting

**"Server misconfigured: missing API key"**
→ You forgot to set the `ANTHROPIC_API_KEY` secret in Supabase. Run:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase functions deploy generate-script
```

**Edge Function not saving to database**
→ Check that `PROJECT_URL` and `PUBLIC_ANON_KEY` are set as secrets:
```bash
supabase secrets set PROJECT_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set PUBLIC_ANON_KEY=your-anon-key
supabase functions deploy generate-script
```

**"Failed to load history"**
→ Check that you ran the SQL migration in Supabase SQL Editor
→ Verify your Supabase URL and Anon Key in the settings

**"Network Error" from the browser**
→ Make sure your Edge Function URL is correct
→ Check browser console for CORS errors (the function handles CORS)
