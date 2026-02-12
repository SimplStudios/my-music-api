import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Upload,
  Library,
  Settings,
  BookOpen,
  Music,
  Menu,
  X,
  LogOut,
  RefreshCw,
  Trash2,
  User,
  Lock,
  Power,
  Radio,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  Code,
  ExternalLink,
  Loader,
  Search,
  FileAudio,
  CheckCircle,
  XCircle,
  Globe,
  Zap,
  Shuffle,
  Tag,
  Hash,
  Play,
} from "lucide-react";

/* ===== Nav Items ===== */
const NAV_ITEMS = [
  { id: "upload", label: "Upload", icon: Upload, section: "manage" },
  { id: "library", label: "Library", icon: Library, section: "manage" },
  { id: "docs", label: "API Docs", icon: BookOpen, section: "manage" },
  { id: "settings", label: "Settings", icon: Settings, section: "system" },
];

export default function AdminPage() {
  /* ===== State ===== */
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [view, setView] = useState("upload");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Upload
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  // Library
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  // Settings
  const [settings, setSettings] = useState({ username: "Admin", api_enabled: true });
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState(null);

  // API status
  const [apiStatus, setApiStatus] = useState("checking");
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Copy state for docs
  const [copiedId, setCopiedId] = useState(null);

  /* ===== Helpers ===== */
  const adminPassword = useRef(password);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "x-admin-password": adminPassword.current,
  }), []);

  /* ===== Login ===== */
  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        adminPassword.current = password;
        setAuthed(true);
      } else {
        setLoginError(data.error || "Invalid password");
      }
    } catch {
      setLoginError("Network error — check your connection");
    }
    setLoggingIn(false);
  }

  /* ===== Fetch tracks ===== */
  const fetchTracks = useCallback(async () => {
    setLoadingTracks(true);
    try {
      const res = await fetch("/api/tracks");
      const data = await res.json();
      setTracks(data.tracks || []);
    } catch { setTracks([]); }
    setLoadingTracks(false);
  }, []);

  /* ===== Fetch settings ===== */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setNewUsername(data.username || "Admin");
      }
    } catch {}
  }, [authHeaders]);

  /* ===== API status check ===== */
  const checkApiStatus = useCallback(async () => {
    setCheckingStatus(true);
    setApiStatus("checking");
    try {
      const res = await fetch("/api/tracks");
      if (res.ok) setApiStatus("online");
      else if (res.status === 503) setApiStatus("disabled");
      else setApiStatus("offline");
    } catch {
      setApiStatus("offline");
    }
    setCheckingStatus(false);
  }, []);

  /* ===== Init on auth ===== */
  useEffect(() => {
    if (authed) {
      fetchTracks();
      fetchSettings();
      checkApiStatus();
    }
  }, [authed, fetchTracks, fetchSettings, checkApiStatus]);

  /* ===== Upload handler ===== */
  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    const ALLOWED = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/flac"];

    if (file.size > MAX_SIZE) {
      setUploadMsg({ type: "error", text: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 50MB.` });
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setUploadMsg({ type: "error", text: `Unsupported format: ${file.type || "unknown"}. Use MP3, WAV, OGG, etc.` });
      return;
    }

    setUploading(true);
    setUploadMsg(null);

    try {
      if (!supabase) throw new Error("Supabase not configured");

      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: storageError } = await supabase.storage
        .from("music")
        .upload(safeName, file, { contentType: file.type, upsert: false });

      if (storageError) throw new Error(`Storage: ${storageError.message}`);

      const { data: urlData } = supabase.storage.from("music").getPublicUrl(safeName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          file_name: safeName,
          file_url: publicUrl,
          tags: tags.trim(),
          file_size: file.size,
          mime_type: file.type,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setUploadMsg({ type: "success", text: `"${title.trim()}" uploaded successfully!` });
      setTitle("");
      setTags("");
      setFile(null);
      fetchTracks();
    } catch (err) {
      setUploadMsg({ type: "error", text: err.message });
    }
    setUploading(false);
  }

  /* ===== Delete track ===== */
  async function deleteTrack(id, fileName) {
    if (!confirm("Delete this track permanently?")) return;
    try {
      const res = await fetch(`/api/delete/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) fetchTracks();
    } catch {}
  }

  /* ===== Save settings ===== */
  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const body = {};
      if (newUsername && newUsername !== settings.username) body.username = newUsername;
      if (newPassword) body.new_password = newPassword;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      if (data.password_changed) adminPassword.current = newPassword;
      setSettingsMsg({ type: "success", text: "Settings updated!" });
      setNewPassword("");
      fetchSettings();
    } catch (err) {
      setSettingsMsg({ type: "error", text: err.message });
    }
    setSavingSettings(false);
  }

  /* ===== Toggle API ===== */
  async function toggleApi() {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ api_enabled: !settings.api_enabled }),
      });
      if (res.ok) {
        fetchSettings();
        setTimeout(checkApiStatus, 500);
      }
    } catch {}
  }

  /* ===== Copy helper ===== */
  function copyCode(text, id) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  /* ===== Format bytes ===== */
  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* ===== Filtered library tracks ===== */
  const filteredTracks = tracks.filter((t) =>
    !librarySearch ||
    t.title?.toLowerCase().includes(librarySearch.toLowerCase()) ||
    t.tags?.some((tg) => tg.toLowerCase().includes(librarySearch.toLowerCase()))
  );

  /* =============================== */
  /*         LOGIN PAGE              */
  /* =============================== */
  if (!authed) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <Music size={40} />
            <div className="logo">My<span className="blue">Music</span>API</div>
            <div className="tagline">Admin Dashboard</div>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-wrapper">
              <Lock size={16} />
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && (
              <div className="login-error">
                <AlertTriangle size={16} />
                {loginError}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-full" disabled={loggingIn || !password}>
              {loggingIn ? <><Loader size={16} /> Signing in...</> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* =============================== */
  /*        BASE URL FOR DOCS        */
  /* =============================== */
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app";

  /* =============================== */
  /*         STATUS LABEL            */
  /* =============================== */
  const statusLabels = {
    online: "API Online",
    offline: "API Offline",
    disabled: "API Disabled",
    checking: "Checking...",
  };

  /* =============================== */
  /*         MAIN LAYOUT             */
  /* =============================== */
  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="app-layout">
        {/* ===== Sidebar ===== */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <Music size={22} />
              MyMusicAPI
            </div>
            <div className="sidebar-subtitle">Admin Dashboard</div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-label">Manage</div>
            {NAV_ITEMS.filter((n) => n.section === "manage").map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${view === item.id ? "active" : ""}`}
                  onClick={() => { setView(item.id); setSidebarOpen(false); }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}

            <div className="nav-label">System</div>
            {NAV_ITEMS.filter((n) => n.section === "system").map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${view === item.id ? "active" : ""}`}
                  onClick={() => { setView(item.id); setSidebarOpen(false); }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* API Status */}
          <div className="sidebar-status">
            <div className="status-indicator">
              <span className={`status-dot ${apiStatus}`} />
              {statusLabels[apiStatus]}
              <button
                className="btn-ghost"
                onClick={checkApiStatus}
                disabled={checkingStatus}
                style={{ marginLeft: "auto", padding: "0.2rem" }}
              >
                <RefreshCw size={13} className={checkingStatus ? "spin" : ""} />
              </button>
            </div>
          </div>

          {/* User / Logout */}
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="user-avatar">
                {(settings.username || "A").charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{settings.username || "Admin"}</div>
                <div className="user-role">Administrator</div>
              </div>
              <button
                className="logout-btn"
                title="Sign out"
                onClick={() => {
                  setAuthed(false);
                  setPassword("");
                  adminPassword.current = "";
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* ===== Main Content ===== */}
        <main className="main-content">
          <div className="content-inner">

            {/* -------- UPLOAD -------- */}
            {view === "upload" && (
              <>
                <div className="page-header">
                  <h1><Upload size={22} /> Upload Track</h1>
                  <p>Add new music to your library. Files are stored in Supabase Storage.</p>
                </div>

                <div className="card">
                  <form onSubmit={handleUpload}>
                    <div className="form-group">
                      <label>Track Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Battle Theme"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tags (comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. battle, boss, intense"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Audio File</label>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                      <span className="file-info">Max 50MB — MP3, WAV, OGG, FLAC</span>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={uploading || !file || !title.trim()}>
                      {uploading ? <><Loader size={16} /> Uploading...</> : <><Upload size={16} /> Upload Track</>}
                    </button>

                    {uploadMsg && (
                      <div className={`message message-${uploadMsg.type}`}>
                        {uploadMsg.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {uploadMsg.text}
                      </div>
                    )}
                  </form>
                </div>
              </>
            )}

            {/* -------- LIBRARY -------- */}
            {view === "library" && (
              <>
                <div className="page-header">
                  <h1><Library size={22} /> Music Library</h1>
                  <p>{tracks.length} track{tracks.length !== 1 ? "s" : ""} in your collection</p>
                </div>

                {/* Search */}
                <div className="search-bar" style={{ marginBottom: "1rem" }}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search tracks or tags..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    style={{ paddingLeft: "2.5rem" }}
                  />
                </div>

                {loadingTracks ? (
                  <div className="loading-text"><Loader size={18} /> Loading tracks...</div>
                ) : filteredTracks.length === 0 ? (
                  <div className="empty-state">
                    <FileAudio size={48} />
                    <p>{librarySearch ? "No tracks match your search." : "No tracks yet. Upload some music!"}</p>
                  </div>
                ) : (
                  <div className="track-list">
                    {filteredTracks.map((track, i) => (
                      <div key={track.id} className="track-item">
                        <span className="track-number">{i + 1}</span>
                        <div className="track-info">
                          <div className="track-title">{track.title}</div>
                          <div className="track-meta">
                            {track.tags?.map((tg) => (
                              <span key={tg} className="tag">{tg}</span>
                            ))}
                            {track.file_size > 0 && (
                              <span className="track-size">{formatSize(track.file_size)}</span>
                            )}
                          </div>
                        </div>
                        <div className="track-actions">
                          <audio controls preload="none" src={track.file_url} />
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteTrack(track.id, track.file_name)}
                            title="Delete track"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* -------- API DOCS -------- */}
            {view === "docs" && (
              <>
                <div className="page-header">
                  <h1><BookOpen size={22} /> API Documentation</h1>
                  <p>Use these endpoints to play music in your HTML games and apps.</p>
                </div>

                {/* Base URL */}
                <div className="card">
                  <div className="card-header">
                    <h2><Globe size={18} /> Base URL</h2>
                  </div>
                  <div className="api-doc-block">
                    <div className="endpoint-badge">
                      {baseUrl}
                      <button className="copy-btn" onClick={() => copyCode(baseUrl, "base-url")}>
                        {copiedId === "base-url" ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <p>All endpoints below are relative to this base URL.</p>
                  </div>
                </div>

                {/* GET /api/tracks */}
                <div className="card">
                  <div className="card-header">
                    <h2><Library size={18} /> List All Tracks</h2>
                  </div>
                  <div className="api-doc-block">
                    <div className="endpoint-badge">
                      <span className="method">GET</span> /api/tracks
                    </div>
                    <p>Returns all tracks in your library. Supports optional query parameters for filtering.</p>
                    <p><strong>Query Parameters:</strong></p>
                    <pre>{`?tag=battle      Filter by tag
?search=epic     Search by title
?limit=10        Limit number of results
?tag=boss&limit=5  Combine parameters`}</pre>
                    <br/>
                    <p><strong>Response:</strong></p>
                    <pre>{`{
  "tracks": [
    {
      "id": 1,
      "title": "Battle Theme",
      "file_url": "https://...supabase.co/storage/v1/.../battle.mp3",
      "tags": ["battle", "intense"],
      "file_size": 3145728,
      "mime_type": "audio/mpeg",
      "created_at": "2024-01-15T..."
    }
  ]
}`}</pre>
                    <button className="copy-btn" onClick={() => copyCode(
`fetch("${baseUrl}/api/tracks")
  .then(res => res.json())
  .then(data => console.log(data.tracks));`, "tracks-code")}>
                      {copiedId === "tracks-code" ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy example</>}
                    </button>
                  </div>
                </div>

                {/* GET /api/random */}
                <div className="card">
                  <div className="card-header">
                    <h2><Shuffle size={18} /> Get Random Track</h2>
                  </div>
                  <div className="api-doc-block">
                    <div className="endpoint-badge">
                      <span className="method">GET</span> /api/random
                    </div>
                    <p>Returns a single random track. Great for background music in games.</p>
                    <p><strong>Query Parameters:</strong></p>
                    <pre>{`?tag=ambient     Get a random track with a specific tag`}</pre>
                    <br/>
                    <p><strong>Response:</strong></p>
                    <pre>{`{
  "track": {
    "id": 3,
    "title": "Forest Ambience",
    "file_url": "https://...supabase.co/storage/v1/.../forest.mp3",
    "tags": ["ambient", "nature"]
  }
}`}</pre>
                    <button className="copy-btn" onClick={() => copyCode(
`fetch("${baseUrl}/api/random?tag=battle")
  .then(res => res.json())
  .then(data => {
    const audio = new Audio(data.track.file_url);
    audio.play();
  });`, "random-code")}>
                      {copiedId === "random-code" ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy example</>}
                    </button>
                  </div>
                </div>

                {/* GET /api/tracks/:id */}
                <div className="card">
                  <div className="card-header">
                    <h2><FileAudio size={18} /> Get Track by ID</h2>
                  </div>
                  <div className="api-doc-block">
                    <div className="endpoint-badge">
                      <span className="method">GET</span> /api/tracks/:id
                    </div>
                    <p>Fetch a specific track by its ID.</p>
                    <p><strong>Response:</strong></p>
                    <pre>{`{
  "track": {
    "id": 1,
    "title": "Battle Theme",
    "file_url": "https://...",
    "tags": ["battle"]
  }
}`}</pre>
                  </div>
                </div>

                {/* HTML Game Integration */}
                <div className="card">
                  <div className="card-header">
                    <h2><Code size={18} /> HTML Game Integration</h2>
                  </div>
                  <div className="api-doc-block">
                    <h4><Play size={16} /> Quick Start — Play a Random Track</h4>
                    <p>Drop this into any HTML file to instantly play music:</p>
                    <pre>{`<script>
  fetch("${baseUrl}/api/random")
    .then(r => r.json())
    .then(data => {
      const music = new Audio(data.track.file_url);
      music.loop = true;
      music.volume = 0.5;
      document.addEventListener("click", () => music.play(), { once: true });
    });
</script>`}</pre>
                    <button className="copy-btn" onClick={() => copyCode(
`<script>
  fetch("${baseUrl}/api/random")
    .then(r => r.json())
    .then(data => {
      const music = new Audio(data.track.file_url);
      music.loop = true;
      music.volume = 0.5;
      document.addEventListener("click", () => music.play(), { once: true });
    });
</script>`, "quick-start")}>
                      {copiedId === "quick-start" ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy code</>}
                    </button>
                  </div>

                  <div className="divider" />

                  <div className="api-doc-block">
                    <h4><Zap size={16} /> Full GameMusic Class</h4>
                    <p>A reusable class for managing music in your HTML games with play, pause, skip, and volume controls:</p>
                    <pre>{`<script>
class GameMusic {
  constructor(apiBase) {
    this.api = apiBase;
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = 0.4;
    this.tracks = [];
    this.current = 0;
  }

  async loadPlaylist(tag = "") {
    const url = tag
      ? this.api + "/api/tracks?tag=" + tag
      : this.api + "/api/tracks";
    const res = await fetch(url);
    const data = await res.json();
    this.tracks = data.tracks || [];
  }

  play(index) {
    if (index !== undefined) this.current = index;
    if (!this.tracks[this.current]) return;
    this.audio.src = this.tracks[this.current].file_url;
    this.audio.play();
  }

  pause()  { this.audio.pause(); }
  resume() { this.audio.play(); }
  next()   { this.current = (this.current + 1) % this.tracks.length; this.play(); }
  prev()   { this.current = (this.current - 1 + this.tracks.length) % this.tracks.length; this.play(); }

  setVolume(v) { this.audio.volume = Math.max(0, Math.min(1, v)); }
}

// Usage:
const music = new GameMusic("${baseUrl}");
await music.loadPlaylist("battle");
music.play();
</script>`}</pre>
                    <button className="copy-btn" onClick={() => copyCode(
`class GameMusic {
  constructor(apiBase) {
    this.api = apiBase;
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = 0.4;
    this.tracks = [];
    this.current = 0;
  }

  async loadPlaylist(tag = "") {
    const url = tag
      ? this.api + "/api/tracks?tag=" + tag
      : this.api + "/api/tracks";
    const res = await fetch(url);
    const data = await res.json();
    this.tracks = data.tracks || [];
  }

  play(index) {
    if (index !== undefined) this.current = index;
    if (!this.tracks[this.current]) return;
    this.audio.src = this.tracks[this.current].file_url;
    this.audio.play();
  }

  pause()  { this.audio.pause(); }
  resume() { this.audio.play(); }
  next()   { this.current = (this.current + 1) % this.tracks.length; this.play(); }
  prev()   { this.current = (this.current - 1 + this.tracks.length) % this.tracks.length; this.play(); }

  setVolume(v) { this.audio.volume = Math.max(0, Math.min(1, v)); }
}

const music = new GameMusic("${baseUrl}");
await music.loadPlaylist("battle");
music.play();`, "game-class")}>
                      {copiedId === "game-class" ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy class</>}
                    </button>
                  </div>

                  <div className="divider" />

                  <div className="api-doc-block">
                    <h4><Tag size={16} /> Filter by Tag</h4>
                    <p>Load tracks by tag for different game scenes:</p>
                    <pre>{`// Load battle music
fetch("${baseUrl}/api/tracks?tag=battle")
  .then(r => r.json())
  .then(data => {
    // data.tracks = array of battle tracks
  });

// Load ambient/menu music
fetch("${baseUrl}/api/tracks?tag=menu")
  .then(r => r.json())
  .then(data => { ... });`}</pre>
                  </div>
                </div>

                {/* Endpoint Reference Table */}
                <div className="card">
                  <div className="card-header">
                    <h2><Hash size={18} /> Endpoint Reference</h2>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/tracks</span>
                    <span className="api-desc">List all tracks</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/tracks?tag=battle</span>
                    <span className="api-desc">Filter by tag</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/tracks?search=epic</span>
                    <span className="api-desc">Search by title</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/random</span>
                    <span className="api-desc">Random track</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/random?tag=ambient</span>
                    <span className="api-desc">Random by tag</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/tracks/:id</span>
                    <span className="api-desc">Get track by ID</span>
                  </div>
                </div>
              </>
            )}

            {/* -------- SETTINGS -------- */}
            {view === "settings" && (
              <>
                <div className="page-header">
                  <h1><Settings size={22} /> Settings</h1>
                  <p>Manage your profile, security, and API access.</p>
                </div>

                {/* Profile */}
                <div className="card">
                  <div className="settings-section">
                    <h3><User size={18} /> Profile</h3>
                    <div className="form-group">
                      <label>Display Name</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Admin"
                      />
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Security */}
                  <div className="settings-section">
                    <h3><Lock size={18} /> Security</h3>
                    <div className="settings-hint">
                      Set a new password. This overrides the ADMIN_PASSWORD environment variable.
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={saveSettings}
                    disabled={savingSettings}
                  >
                    {savingSettings ? <><Loader size={16} /> Saving...</> : "Save Changes"}
                  </button>

                  {settingsMsg && (
                    <div className={`message message-${settingsMsg.type}`}>
                      {settingsMsg.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {settingsMsg.text}
                    </div>
                  )}
                </div>

                <div className="divider" />

                {/* API Toggle */}
                <div className="card">
                  <div className="settings-section">
                    <h3><Power size={18} /> API Kill Switch</h3>
                    <div className="settings-hint">
                      When disabled, all public API endpoints (/api/tracks, /api/random) will return 503.
                    </div>

                    <div className="toggle-wrapper" onClick={toggleApi}>
                      <div className="toggle-label">
                        <strong>Public API Access</strong>
                        <span>{settings.api_enabled ? "Anyone can fetch your tracks" : "All public endpoints are disabled"}</span>
                      </div>
                      <label className="toggle" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={settings.api_enabled}
                          onChange={toggleApi}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* API Status */}
                <div className="card">
                  <div className="settings-section">
                    <h3><Radio size={18} /> API Status</h3>
                    <div className="status-card">
                      <span className={`status-dot ${apiStatus}`} />
                      <div className="status-info">
                        <div className="status-title">{statusLabels[apiStatus]}</div>
                        <div className="status-desc">
                          {apiStatus === "online" && "Endpoints are responding normally."}
                          {apiStatus === "offline" && "Endpoints are not reachable. Check Vercel logs."}
                          {apiStatus === "disabled" && "You turned off API access via the kill switch."}
                          {apiStatus === "checking" && "Testing endpoint connectivity..."}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={checkApiStatus}
                        disabled={checkingStatus}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
