<div align="center">

# 🎵 MyMusicAPI

### Build your own music API. Upload your tracks. Use them in your games.

*Stop conforming to the Web Audio API gods. Own your music pipeline.*

**Fork it. Deploy it. Done.**

<br />

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsimplstudios%2Fmy-music-api&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,ADMIN_PASSWORD&envDescription=Supabase%20credentials%20and%20admin%20password&envLink=https%3A%2F%2Fsupabase.com%2Fdashboard%2Fproject%2F_%2Fsettings%2Fapi)

<br />

</div>

---

## What is this?

A self-hosted music API that **you** control. Upload your own music files, tag them, and call a simple REST API from your HTML/JS games to play them. No third-party audio services, no complicated SDKs, no nonsense.

- **Upload** your music through a password-protected admin panel
- **Tag** tracks (`battle`, `menu`, `boss`, `chill`) for easy filtering
- **Fetch** tracks via a dead-simple public API with CORS enabled
- **Play** them in any HTML game with a standard `Audio()` object

Built with **Next.js** + **Supabase** + **Vercel** (all free tier friendly).

---

## Quick Start (5 minutes)

### Step 1: Fork this repo

Click the **Fork** button at the top right, or use the Deploy button above.

### Step 2: Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run this to create your database:

```sql
-- Create the tracks table
CREATE TABLE tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to READ tracks (your games need this)
CREATE POLICY "Public read access" ON tracks
  FOR SELECT USING (true);

-- Allow inserts and deletes (your API handles auth via password)
CREATE POLICY "Allow all inserts" ON tracks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all deletes" ON tracks
  FOR DELETE USING (true);
```

Then run this to create the **settings** table (for profile, password override, and API kill switch):

```sql
-- Create the settings table
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  username TEXT DEFAULT 'Admin',
  api_enabled BOOLEAN DEFAULT true,
  password_override TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id) VALUES (1);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to settings" ON settings
  USING (true) WITH CHECK (true);
```

3. Go to **Storage** → Create a new bucket called **`music`**
4. Toggle **Public bucket** ON
5. Under the bucket's **Policies**, add two policies:
   - **Allow all uploads** → Operation: `INSERT` → Target role: `anon` → Policy: `true`
   - **Allow all deletes** → Operation: `DELETE` → Target role: `anon` → Policy: `true`

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your forked repo
2. Vercel will ask you for **3 environment variables** — fill them in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` key |
| `ADMIN_PASSWORD` | Make up a strong password (this protects your uploads) |

> ⚠️ **NEVER** put these values in the code or commit them. Vercel environment variables are the only safe place.

3. Hit **Deploy**. That's it. You're live.

### Step 4: Upload your music

Go to `https://your-app.vercel.app/admin`, enter your admin password, and start uploading tracks.

---

## API Endpoints

All endpoints have **CORS enabled** — call them from any domain, any game, anywhere.

| Endpoint | Method | What it does |
|---|---|---|
| `/api/tracks` | GET | Get all tracks |
| `/api/tracks?tag=battle` | GET | Filter by tag |
| `/api/tracks?search=epic` | GET | Search by title |
| `/api/tracks?limit=5` | GET | Limit results |
| `/api/tracks/[id]` | GET | Get a single track by ID |
| `/api/random` | GET | Get a random track |
| `/api/random?tag=boss` | GET | Random track filtered by tag |

### Response Format

```json
{
  "tracks": [
    {
      "id": "uuid-here",
      "title": "Epic Battle Theme",
      "file_url": "https://xxx.supabase.co/storage/v1/object/public/music/file.mp3",
      "tags": ["battle", "intense"],
      "file_size": 5242880,
      "mime_type": "audio/mpeg",
      "created_at": "2026-02-12T00:00:00Z"
    }
  ]
}
```

---

## Use It In Your Game

### Play a random battle track
```html
<script>
async function playBattleMusic() {
  const res = await fetch("https://your-app.vercel.app/api/random?tag=battle");
  const { track } = await res.json();

  const audio = new Audio(track.file_url);
  audio.loop = true;
  audio.volume = 0.5;
  audio.play();
}
</script>
```

### Load a full playlist
```javascript
async function loadPlaylist(tag) {
  const res = await fetch(`https://your-app.vercel.app/api/tracks?tag=${tag}`);
  const { tracks } = await res.json();
  return tracks; // Array of { id, title, file_url, tags, ... }
}
```

### Simple music manager class
```javascript
class GameMusic {
  constructor(apiBase) {
    this.api = apiBase;
    this.current = null;
  }

  async play(tag) {
    if (this.current) this.current.pause();
    const res = await fetch(`${this.api}/api/random?tag=${tag}`);
    const { track } = await res.json();
    this.current = new Audio(track.file_url);
    this.current.loop = true;
    this.current.play();
  }

  stop() {
    if (this.current) this.current.pause();
  }
}

// Usage
const music = new GameMusic("https://your-app.vercel.app");
music.play("battle");
```

---

## Admin Endpoints (protected)

These require the `x-admin-password` header matching your `ADMIN_PASSWORD`:

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload a track (multipart form: `file`, `title`, `tags`) |
| `/api/delete/[id]` | DELETE | Delete a track by ID |

---

## Local Development

If you want to run it locally before deploying:

```bash
git clone https://github.com/YOUR-USERNAME/my-music-api.git
cd my-music-api
npm install
```

Create a `.env.local` file (this is gitignored, never committed):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
ADMIN_PASSWORD=your-password
```

```bash
npm run dev
```

Visit `http://localhost:3000` to browse, `http://localhost:3000/admin` to upload.

---

## Tech Stack

- **Next.js** — Pages + API routes
- **Supabase** — PostgreSQL database + file storage (free tier = 1GB storage)
- **Vercel** — Hosting + serverless functions (free tier = generous)

---

## Why?

Because you shouldn't need a PhD in Web Audio API to play background music in your game. Upload your `.mp3`, get a URL, play it. That's it.

---

<div align="center">

**Built by [SimplStudios](https://simplstudios.vercel.app)**

If this saved you time, consider donating:
**[cash.app/$simplstudiosofficial](https://cash.app/$simplstudiosofficial)**

</div>
