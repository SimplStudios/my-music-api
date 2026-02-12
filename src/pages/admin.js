import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Head from "next/head";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const NAV_ITEMS = [
  { id: "upload", label: "Upload", icon: "⬆" },
  { id: "library", label: "Library", icon: "♫" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/webm",
  "audio/x-m4a",
  "audio/mp4",
];

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function AdminPage() {
  // ── Auth ──
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── Nav ──
  const [activeView, setActiveView] = useState("upload");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Upload ──
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadMsgType, setUploadMsgType] = useState("success");

  // ── Library ──
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  // ── Settings ──
  const [username, setUsername] = useState("Admin");
  const [editUsername, setEditUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [apiEnabled, setApiEnabled] = useState(true);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsMsgType, setSettingsMsgType] = useState("success");
  const [saving, setSaving] = useState(false);

  // ── API Status ──
  const [apiStatus, setApiStatus] = useState("checking"); // online | offline | disabled | checking

  // ──────── Auth ────────
  const login = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError("Please enter your admin password.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAuthed(true);
        setUsername(data.username || "Admin");
        setEditUsername(data.username || "Admin");
        setApiEnabled(data.api_enabled !== false);
        fetchTracks();
        checkApiStatus();
      } else {
        setAuthError(data.error || "Invalid admin password.");
      }
    } catch {
      setAuthError("Unable to connect. Check your deployment and try again.");
    }
    setAuthLoading(false);
  };

  // ──────── Tracks ────────
  const fetchTracks = useCallback(async () => {
    setTracksLoading(true);
    try {
      const res = await fetch("/api/tracks");
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      }
    } catch {}
    setTracksLoading(false);
  }, []);

  const deleteTrack = async (id) => {
    if (!confirm("Delete this track?")) return;
    try {
      const res = await fetch(`/api/delete/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setTracks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {}
  };

  // ──────── Upload ────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > MAX_FILE_SIZE) {
      setUploadMsg(
        `File too large (${formatBytes(f.size)}). Maximum is ${formatBytes(MAX_FILE_SIZE)}.`
      );
      setUploadMsgType("error");
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|ogg|flac|aac|webm|m4a)$/i)) {
      setUploadMsg("Only audio files (MP3, WAV, OGG, FLAC, AAC, WebM, M4A) are supported.");
      setUploadMsgType("error");
      setFile(null);
      return;
    }
    setFile(f);
    setUploadMsg("");
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setUploadMsg("Please provide a file and a title.");
      setUploadMsgType("error");
      return;
    }
    if (!supabaseClient) {
      setUploadMsg("Supabase not configured. Check your environment variables.");
      setUploadMsgType("error");
      return;
    }

    setUploading(true);
    setUploadMsg("Uploading to Supabase Storage…");
    setUploadMsgType("success");

    try {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: storageErr } = await supabaseClient.storage
        .from("music")
        .upload(safeName, file, { contentType: file.type });

      if (storageErr) throw new Error(storageErr.message);

      const { data: urlData } = supabaseClient.storage.from("music").getPublicUrl(safeName);
      const fileUrl = urlData.publicUrl;

      setUploadMsg("Saving track metadata…");

      const tagArray = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          title: title.trim(),
          file_name: safeName,
          file_url: fileUrl,
          tags: tagArray,
          file_size: file.size,
          mime_type: file.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadMsg(`"${title.trim()}" uploaded successfully!`);
      setUploadMsgType("success");
      setFile(null);
      setTitle("");
      setTags("");
      fetchTracks();

      // Reset file input
      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setUploadMsg(err.message);
      setUploadMsgType("error");
    }
    setUploading(false);
  };

  // ──────── Settings ────────
  const saveProfile = async () => {
    if (!editUsername.trim()) {
      setSettingsMsg("Username cannot be empty.");
      setSettingsMsgType("error");
      return;
    }
    setSaving(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ username: editUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsername(data.username);
        setSettingsMsg("Username updated!");
        setSettingsMsgType("success");
      } else {
        setSettingsMsg(data.error || "Failed to update.");
        setSettingsMsgType("error");
      }
    } catch {
      setSettingsMsg("Unable to save. Check connection.");
      setSettingsMsgType("error");
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!newPassword.trim()) {
      setSettingsMsg("Enter a new password.");
      setSettingsMsgType("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSettingsMsg("Passwords do not match.");
      setSettingsMsgType("error");
      return;
    }
    if (newPassword.length < 6) {
      setSettingsMsg("Password must be at least 6 characters.");
      setSettingsMsgType("error");
      return;
    }
    setSaving(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.password_changed) {
        setPassword(newPassword); // Keep session alive with new password
        setNewPassword("");
        setConfirmPassword("");
        setSettingsMsg("Password changed successfully!");
        setSettingsMsgType("success");
      } else {
        setSettingsMsg(data.error || "Failed to change password.");
        setSettingsMsgType("error");
      }
    } catch {
      setSettingsMsg("Unable to save. Check connection.");
      setSettingsMsgType("error");
    }
    setSaving(false);
  };

  const toggleApi = async (enabled) => {
    setApiEnabled(enabled);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ api_enabled: enabled }),
      });
      if (res.ok) {
        setApiStatus(enabled ? "online" : "disabled");
      } else {
        setApiEnabled(!enabled); // Revert
      }
    } catch {
      setApiEnabled(!enabled);
    }
  };

  // ──────── API Status ────────
  const checkApiStatus = useCallback(async () => {
    setApiStatus("checking");
    try {
      const res = await fetch("/api/tracks");
      if (res.ok) setApiStatus("online");
      else if (res.status === 503) setApiStatus("disabled");
      else setApiStatus("offline");
    } catch {
      setApiStatus("offline");
    }
  }, []);

  // Poll API status every 30 seconds
  useEffect(() => {
    if (!isAuthed) return;
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, [isAuthed, checkApiStatus]);

  // ──────── UI Helpers ────────
  const statusLabel = {
    online: "API Online",
    offline: "API Offline",
    disabled: "API Disabled",
    checking: "Checking…",
  };

  const closeSidebar = () => setSidebarOpen(false);

  // ═══════════════════════════════
  // ██  LOGIN PAGE
  // ═══════════════════════════════
  if (!isAuthed) {
    return (
      <>
        <Head>
          <title>Login — MyMusicAPI</title>
        </Head>
        <div className="login-page">
          <div className="login-card">
            <div className="login-brand">
              <div className="logo">
                My<span className="blue">Music</span>API
              </div>
              <div className="tagline">by SimplStudios</div>
            </div>

            <form className="login-form" onSubmit={login}>
              {authError && <div className="login-error">{authError}</div>}
              <input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={authLoading}
              >
                {authLoading ? "Verifying…" : "Login"}
              </button>
            </form>

            <div
              style={{
                marginTop: "1.5rem",
                fontSize: "0.75rem",
                color: "var(--text-disabled)",
              }}
            >
              <a
                href="https://simplstudios.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                simplstudios.vercel.app
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════
  // ██  DASHBOARD
  // ═══════════════════════════════
  return (
    <>
      <Head>
        <title>Dashboard — MyMusicAPI</title>
      </Head>

      {/* Mobile toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((p) => !p)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
      />

      <div className="app-layout">
        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <span className="logo-icon">♫</span>
              My<span style={{ color: "var(--blue-500)" }}>Music</span>API
            </div>
            <div className="sidebar-subtitle">Admin Dashboard</div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-label">Menu</div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeView === item.id ? "active" : ""}`}
                onClick={() => {
                  setActiveView(item.id);
                  closeSidebar();
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div className="nav-label">Quick Links</div>
            <a href="/" className="nav-item" target="_blank" rel="noopener noreferrer">
              <span className="nav-icon">🌐</span> Public Page
            </a>
            <a
              href="https://github.com/SimplStudios/my-music-api"
              className="nav-item"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="nav-icon">📦</span> GitHub
            </a>
          </nav>

          {/* API Status */}
          <div className="sidebar-status">
            <div className="status-indicator">
              <span className={`status-dot ${apiEnabled ? apiStatus : "disabled"}`} />
              <span>{apiEnabled ? statusLabel[apiStatus] : "API Disabled"}</span>
            </div>
          </div>

          {/* User / Footer */}
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="user-avatar">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{username}</div>
                <div className="user-role">Administrator</div>
              </div>
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  setIsAuthed(false);
                  setPassword("");
                }}
                title="Logout"
                style={{ fontSize: "1rem", padding: "0.3rem" }}
              >
                ↗
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="main-content">
          <div className="content-inner">
            {/* ════════ Upload View ════════ */}
            {activeView === "upload" && (
              <>
                <div className="page-header">
                  <h1>Upload Track</h1>
                  <p>Add new music to your API library</p>
                </div>

                <div className="card">
                  <form onSubmit={upload}>
                    <div className="form-group">
                      <label htmlFor="file-input">Audio File</label>
                      <input
                        id="file-input"
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                      />
                      {file && (
                        <span className="file-info">
                          {file.name} — {formatBytes(file.size)}
                        </span>
                      )}
                      <span className="file-info">
                        Max 50 MB · MP3, WAV, OGG, FLAC, AAC, WebM, M4A
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="title-input">Title</label>
                      <input
                        id="title-input"
                        type="text"
                        placeholder="Track title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="tags-input">Tags</label>
                      <input
                        id="tags-input"
                        type="text"
                        placeholder="battle, ambient, boss (comma-separated)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={uploading || !file}
                    >
                      {uploading ? "Uploading…" : "Upload Track"}
                    </button>

                    {uploadMsg && (
                      <div className={`message message-${uploadMsgType}`}>
                        {uploadMsg}
                      </div>
                    )}
                  </form>
                </div>

                {/* Quick API Reference */}
                <div className="card">
                  <div className="card-header">
                    <h2>API Reference</h2>
                    <span className="card-badge">Quick Ref</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/tracks</span>
                    <span className="api-desc">All tracks</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/tracks?tag=battle</span>
                    <span className="api-desc">Filter by tag</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/random</span>
                    <span className="api-desc">Random track</span>
                  </div>
                  <div className="api-ref-item">
                    <span className="api-method">GET</span>
                    <span className="api-path">/api/tracks/[id]</span>
                    <span className="api-desc">Single track</span>
                  </div>
                </div>
              </>
            )}

            {/* ════════ Library View ════════ */}
            {activeView === "library" && (
              <>
                <div className="page-header">
                  <h1>Library</h1>
                  <p>
                    {tracks.length} track{tracks.length !== 1 ? "s" : ""} in
                    your collection
                  </p>
                </div>

                {tracksLoading ? (
                  <div className="loading-text">Loading tracks…</div>
                ) : tracks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">♫</div>
                    <p>No tracks yet. Upload your first one!</p>
                  </div>
                ) : (
                  <div className="track-list">
                    {tracks.map((track, i) => (
                      <div className="track-item" key={track.id}>
                        <span className="track-number">{i + 1}</span>
                        <div className="track-info">
                          <div className="track-title">{track.title}</div>
                          <div className="track-meta">
                            {track.tags?.map((tag) => (
                              <span key={tag} className="tag">
                                {tag}
                              </span>
                            ))}
                            {track.file_size && (
                              <span className="track-size">
                                {formatBytes(track.file_size)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="track-actions">
                          {track.file_url && (
                            <audio controls preload="none">
                              <source
                                src={track.file_url}
                                type={track.mime_type || "audio/mpeg"}
                              />
                            </audio>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteTrack(track.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ════════ Settings View ════════ */}
            {activeView === "settings" && (
              <>
                <div className="page-header">
                  <h1>Settings</h1>
                  <p>Manage your profile, security, and API access</p>
                </div>

                {settingsMsg && (
                  <div className={`message message-${settingsMsgType}`}>
                    {settingsMsg}
                  </div>
                )}

                {/* Profile */}
                <div className="card">
                  <div className="settings-section">
                    <h3>👤 Profile</h3>
                    <div className="settings-row">
                      <div className="form-group">
                        <label>Username</label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder="Your display name"
                        />
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={saveProfile}
                        disabled={saving}
                        style={{ marginBottom: "1rem" }}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="card">
                  <div className="settings-section">
                    <h3>🔒 Security</h3>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        marginBottom: "1rem",
                      }}
                    >
                      Change your admin password. This overrides the environment
                      variable.
                    </p>
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        placeholder="New password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={changePassword}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Change Password"}
                    </button>
                  </div>
                </div>

                {/* API Control */}
                <div className="card">
                  <div className="settings-section">
                    <h3>🔌 API Access</h3>
                    <div
                      className="toggle-wrapper"
                      onClick={() => toggleApi(!apiEnabled)}
                    >
                      <div className="toggle-label">
                        <strong>Public API</strong>
                        <span>
                          {apiEnabled
                            ? "Your API is live. Games can fetch tracks."
                            : "API is disabled. All public endpoints return 503."}
                        </span>
                      </div>
                      <div className="toggle">
                        <input
                          type="checkbox"
                          checked={apiEnabled}
                          readOnly
                        />
                        <span className="toggle-slider" />
                      </div>
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="settings-section" style={{ marginBottom: 0 }}>
                    <h3>📡 API Status</h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem 1rem",
                        background: "var(--bg-surface)",
                        borderRadius: "var(--radius-xl)",
                      }}
                    >
                      <span
                        className={`status-dot ${apiEnabled ? apiStatus : "disabled"}`}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {apiEnabled ? statusLabel[apiStatus] : "API Disabled"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {apiEnabled
                            ? apiStatus === "online"
                              ? "All endpoints are responding normally."
                              : apiStatus === "checking"
                                ? "Pinging endpoints…"
                                : "Endpoints are not responding."
                            : "Enable the API toggle above to go live."}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={checkApiStatus}
                        style={{ marginLeft: "auto" }}
                      >
                        ↻ Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div
                  className="card"
                  style={{
                    borderColor: "rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <div className="settings-section" style={{ marginBottom: 0 }}>
                    <h3 style={{ color: "var(--red-500)" }}>⚠ Danger Zone</h3>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        marginBottom: "1rem",
                      }}
                    >
                      Session logout. You will need to enter your password again
                      to access the dashboard.
                    </p>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        setIsAuthed(false);
                        setPassword("");
                      }}
                    >
                      Logout
                    </button>
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
