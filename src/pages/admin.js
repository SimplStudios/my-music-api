import { useState, useEffect } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  const login = (e) => {
    e.preventDefault();
    setIsAuthed(true);
    fetchTracks();
  };

  const fetchTracks = async () => {
    setLoading(true);
    const res = await fetch("/api/tracks");
    const data = await res.json();
    setTracks(data.tracks || []);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    formData.append("tags", tags);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`Uploaded: ${data.track.title}`);
        setFile(null);
        setTitle("");
        setTags("");
        // Reset file input
        document.getElementById("file-input").value = "";
        fetchTracks();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }

    setUploading(false);
  };

  const handleDelete = async (id, trackTitle) => {
    if (!confirm(`Delete "${trackTitle}"?`)) return;

    const res = await fetch(`/api/delete/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });

    if (res.ok) {
      setMessage(`Deleted: ${trackTitle}`);
      fetchTracks();
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
  };

  if (!isAuthed) {
    return (
      <div className="container">
        <h1>🔒 MyMusicAPI Admin</h1>
        <form onSubmit={login} className="login-form">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🎵 MyMusicAPI Admin</h1>

      {/* Upload Form */}
      <div className="card">
        <h2>Upload Track</h2>
        <form onSubmit={handleUpload} className="upload-form">
          <div className="field">
            <label>Audio File</label>
            <input
              id="file-input"
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          </div>
          <div className="field">
            <label>Title (optional, defaults to filename)</label>
            <input
              type="text"
              placeholder="My Epic Track"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="battle, boss, intense"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <button type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
      </div>

      {/* Track List */}
      <div className="card">
        <h2>All Tracks ({tracks.length})</h2>
        {loading ? (
          <p>Loading...</p>
        ) : tracks.length === 0 ? (
          <p>No tracks yet. Upload one above!</p>
        ) : (
          <div className="track-list">
            {tracks.map((track) => (
              <div key={track.id} className="track-item">
                <div className="track-info">
                  <strong>{track.title}</strong>
                  <div className="track-meta">
                    {track.tags?.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                    <span className="size">
                      {(track.file_size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <audio controls src={track.file_url} preload="none" />
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(track.id, track.title)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Reference */}
      <div className="card">
        <h2>API Endpoints (for your games)</h2>
        <div className="api-ref">
          <code>GET /api/tracks</code> — List all tracks
          <br />
          <code>GET /api/tracks?tag=battle</code> — Filter by tag
          <br />
          <code>GET /api/tracks?search=epic</code> — Search by title
          <br />
          <code>GET /api/tracks?limit=5</code> — Limit results
          <br />
          <code>GET /api/tracks/[id]</code> — Get single track
          <br />
          <code>GET /api/random</code> — Random track
          <br />
          <code>GET /api/random?tag=boss</code> — Random track by tag
        </div>
      </div>

      <footer className="footer">
        <p>
          Built by{" "}
          <a href="https://simplstudios.vercel.app" target="_blank" rel="noopener noreferrer">
            SimplStudios
          </a>
        </p>
        <p>
          <a href="/">← Back to Library</a>
        </p>
      </footer>
    </div>
  );
}
