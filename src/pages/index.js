import { useState, useEffect } from "react";
import Head from "next/head";

export default function HomePage() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tracks");
      if (res.ok) {
        const data = await res.json();
        const t = data.tracks || [];
        setTracks(t);

        // Collect all unique tags
        const tagSet = new Set();
        t.forEach((track) =>
          track.tags?.forEach((tag) => tagSet.add(tag))
        );
        setAllTags([...tagSet].sort());
      }
    } catch {}
    setLoading(false);
  };

  const filtered = tracks.filter((t) => {
    const matchSearch =
      !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || t.tags?.includes(activeTag);
    return matchSearch && matchTag;
  });

  function formatBytes(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <Head>
        <title>MyMusicAPI — Free Music API for Games</title>
        <meta
          name="description"
          content="Open-source music API for HTML games. Browse, stream, and integrate game-ready tracks with a simple REST API."
        />
      </Head>

      <div className="public-page">
        {/* Header */}
        <header className="public-header">
          <h1>
            My<span className="blue">Music</span>API
          </h1>
          <p className="subtitle">
            Open-source music API for your games — built by SimplStudios
          </p>
          <div className="header-links">
            <a
              href="https://github.com/SimplStudios/my-music-api"
              className="btn btn-secondary btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              📦 GitHub
            </a>
            <a
              href="https://cash.app/$simplstudiosofficial"
              className="btn btn-primary btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              ♥ Donate
            </a>
            <a href="/admin" className="btn btn-ghost btn-sm">
              Admin →
            </a>
          </div>
        </header>

        {/* Search */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search tracks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="tag-filter">
            <button
              className={`tag-btn ${activeTag === "" ? "active" : ""}`}
              onClick={() => setActiveTag("")}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-btn ${activeTag === tag ? "active" : ""}`}
                onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Track list */}
        {loading ? (
          <div className="loading-text">Loading tracks…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">♫</div>
            <p>
              {search || activeTag
                ? "No tracks match your filter."
                : "No tracks uploaded yet."}
            </p>
          </div>
        ) : (
          <div className="track-list">
            {filtered.map((track, i) => (
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API usage example */}
        <div className="code-card">
          <div className="code-card-header">
            <span>💻</span>
            <h3>Use in Your Game</h3>
          </div>
          <pre>{`// Fetch all tracks
fetch("${baseUrl || "https://your-app.vercel.app"}/api/tracks")
  .then(res => res.json())
  .then(data => {
    const tracks = data.tracks;
    const audio = new Audio(tracks[0].file_url);
    audio.play();
  });

// Get a random track
fetch("${baseUrl || "https://your-app.vercel.app"}/api/random")
  .then(res => res.json())
  .then(data => {
    const audio = new Audio(data.track.file_url);
    audio.play();
  });

// Filter by tag
fetch("${baseUrl || "https://your-app.vercel.app"}/api/tracks?tag=battle")
  .then(res => res.json())
  .then(data => console.log(data.tracks));`}</pre>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p>
            Built with ♥ by{" "}
            <a
              href="https://simplstudios.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              SimplStudios
            </a>
          </p>
          <p>
            <a
              href="https://github.com/SimplStudios/my-music-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {" · "}
            <a
              href="https://cash.app/$simplstudiosofficial"
              target="_blank"
              rel="noopener noreferrer"
            >
              Donate
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
