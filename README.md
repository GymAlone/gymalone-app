# GymAlone App — Deployment Guide

## Step 1 — Supabase: Create the database table

1. Go to https://supabase.com → your project
2. Click **SQL Editor** in the left sidebar
3. Paste this and click **Run**:

```sql
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  sex text,
  age text,
  goal text,
  level text,
  days text,
  limitation text,
  plan jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

4. Also go to **Authentication → Settings** and make sure "Enable email confirmations" is OFF
   (so members can register and log in immediately without confirming email)

---

## Step 2 — GitHub: Upload the code

1. Go to https://github.com → New repository → name it `gymalone-app` → Create
2. On your computer, open Terminal (Mac) or Command Prompt (Windows)
3. Run these commands:

```bash
cd gymalone   # navigate into the project folder
git init
git add .
git commit -m "Initial GymAlone app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gymalone-app.git
git push -u origin main
```

---

## Step 3 — Vercel: Deploy

1. Go to https://vercel.com → Sign in with GitHub
2. Click **Add New Project** → Import your `gymalone-app` repo
3. Before clicking Deploy, go to **Environment Variables** and add:

| Name | Value |
|------|-------|
| `REACT_APP_SUPABASE_URL` | your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | your Supabase anon key |
| `REACT_APP_ANTHROPIC_KEY` | your Anthropic API key |

4. Click **Deploy** — done! Vercel gives you a URL like `gymalone-app.vercel.app`

---

## Step 4 — Custom domain (optional)

1. In Vercel → your project → **Settings → Domains**
2. Add `app.gymalone.cz`
3. In your domain registrar, add a CNAME record pointing `app` → `cname.vercel-dns.com`

---

## Step 5 — QR Code

1. Go to https://qr-code-generator.com (free)
2. Enter your app URL (e.g. `https://app.gymalone.cz`)
3. Download, print, and stick it at the gym entrance!

---

## ⚠️ Security reminder
Since your API keys were shared in chat, please:
- Go to console.anthropic.com → API Keys → delete the old one → create new
- Update the new key in Vercel Environment Variables
- Supabase anon key is lower risk but worth rotating too (Settings → API → Regenerate)
