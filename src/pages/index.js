import { useState, useEffect } from "react";
import {
  Music,
  Github,
  Heart,
  Search,
  FileAudio,
  Code,
  ExternalLink,
  Loader,
  DollarSign,
} from "lucide-react";

export default function HomePage() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");

  useEffect(() => {
    fetch("/api/tracks")
      .then((r) => r.json())
      .then((data) => setTracks(data.tracks || []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, []);

  /* ===== Unique tags ===== */
  const allTags = [...new Set(tracks.flatMap((t) => t.tags || []))].sort();

  /* ===== Filtered tracks ===== */
  const filtered = tracks.filter((t) => {
    const matchesSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !activeTag || t.tags?.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  /* ===== Base URL ===== */
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app";

  return (
    <div className="public-page">
      {/* Header */}
      <header className="public-header">
        <Music size={48} />
        <h1>My<span className="blue">Music</span>API</h1>
        <p className="subtitle">Self-hosted music API for your HTML games and apps</p>
        <div className="header-links">
          <a
            href="https://github.com/SimplStudios/my-music-api"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Github size={16} /> GitHub
          </a>
          <a
            href="https://cash.app/$simplstudiosofficial"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Heart size={16} /> Donate
          </a>
          <a href="/admin" className="btn btn-primary">
            Admin Dashboard <ExternalLink size={14} />
          </a>
        </div>
      </header>

      {/* Search */}
      <div className="search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search tracks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="tag-filter">
          <button
            className={`tag-btn ${!activeTag ? "active" : ""}`}
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

      {/* Track List */}
      {loading ? (
        <div className="loading-text"><Loader size={18} /> Loading tracks...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <FileAudio size={48} />
          <p>{search || activeTag ? "No tracks match your filters." : "No tracks available yet."}</p>
        </div>
      ) : (
        <div className="track-list">
          {filtered.map((track, i) => (
            <div key={track.id} className="track-item">
              <span className="track-number">{i + 1}</span>
              <div className="track-info">
                <div className="track-title">{track.title}</div>
                <div className="track-meta">
                  {track.tags?.map((tg) => (
                    <span key={tg} className="tag">{tg}</span>
                  ))}
                </div>
              </div>
              <div className="track-actions">
                <audio controls preload="none" src={track.file_url} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Start Code Card */}
      <div className="code-card">
        <div className="code-card-header">
          <Code size={16} />
          <h3>Quick Start</h3>
        </div>
        <pre><code>{`// Fetch all tracks
const res = await fetch("${baseUrl}/api/tracks");
const { tracks } = await res.json();

// Play a random track
const random = await fetch("${baseUrl}/api/random");
const { track } = await random.json();
const audio = new Audio(track.file_url);
audio.play();

// Filter by tag
const battle = await fetch("${baseUrl}/api/tracks?tag=battle");`}</code></pre>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>
          Built by{" "}
          <a href="https://simplstudios.vercel.app" target="_blank" rel="noopener noreferrer">
            SimplStudios
          </a>
        </p>
        <p>
          <a
            href="https://github.com/SimplStudios/my-music-api"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Source Code
          </a>
          {" · "}
          <a
            href="https://cash.app/$simplstudiosofficial"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Heart size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Donate
          </a>
        </p>
      </footer>
    </div>
  );
}
