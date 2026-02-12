import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Client-side Supabase for direct file uploads
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
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
    if (!file || !supabaseClient) return;

    setUploading(true);
    setMessage("");
    setUploadProgress("Uploading file to storage...");

    try {
      // Step 1: Upload file directly to Supabase Storage (no size limit from Vercel)
      const trackTitle = (title || file.name).replace(/\.[^/.]+$/, "");
      const ext = file.name.substring(file.name.lastIndexOf(".")) || ".mp3";
      const fileName = `${Date.now()}-${trackTitle.replace(/\s+/g, "-").toLowerCase()}${ext}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("music")
        .upload(fileName, file, {
          contentType: file.type || "audio/mpeg",
          upsert: false,
        });

      if (uploadError) {
        setMessage(`Upload error: ${uploadError.message}`);
        setUploading(false);
        setUploadProgress("");
        return;
      }

      // Step 2: Get public URL
      const { data: urlData } = supabaseClient.storage
        .from("music")
        .getPublicUrl(fileName);

      setUploadProgress("Saving track info...");

      // Step 3: Save metadata via our API (password-protected)
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          title: trackTitle,
          file_name: fileName,
          file_url: urlData.publicUrl,
          tags: tags,
          file_size: file.size,
          mime_type: file.type,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`Uploaded: ${data.track.title}`);
        setFile(null);
        setTitle("");
        setTags("");
        document.getElementById("file-input").value = "";
        fetchTracks();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }

    setUploading(false);
    setUploadProgress("");
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
            {uploading ? uploadProgress || "Uploading..." : "Upload"}
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
