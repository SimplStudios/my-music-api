import { useState, useEffect } from "react";

export default function HomePage() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    fetchTracks();
  }, [activeTag]);

  const fetchTracks = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTag) params.set("tag", activeTag);
    if (search) params.set("search", search);

    const res = await fetch(`/api/tracks?${params}`);
    const data = await res.json();
    const fetched = data.tracks || [];
    setTracks(fetched);

    // Collect all unique tags
    const tagSet = new Set();
    fetched.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    setAllTags([...tagSet].sort());

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTracks();
  };

  return (
    <div className="container">
      <h1>� MyMusicAPI</h1>
      <p className="subtitle">
        Your music. Your API. Your games.
      </p>
      <p className="subtitle">
        <a href="/admin">Admin Panel →</a>
      </p>

      {/* Search */}
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search tracks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

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

      {/* Tracks */}
      {loading ? (
        <p>Loading...</p>
      ) : tracks.length === 0 ? (
        <p>No tracks found.</p>
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
                </div>
                <audio controls src={track.file_url} preload="none" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* API Info */}
      <div className="card api-card">
        <h3>Use in your games</h3>
        <pre>{`// Fetch all tracks
const res = await fetch("${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/tracks");
const { tracks } = await res.json();

// Play a random battle track
const res2 = await fetch("/api/random?tag=battle");
const { track } = await res2.json();
const audio = new Audio(track.file_url);
audio.play();`}</pre>
      </div>

      <footer className="footer">
        <p>
          Built by{" "}
          <a href="https://simplstudios.vercel.app" target="_blank" rel="noopener noreferrer">
            SimplStudios
          </a>
        </p>
        <p>
          <a href="https://cash.app/$simplstudiosofficial" target="_blank" rel="noopener noreferrer">
            Donate ☕
          </a>
          {" · "}
          <a href="https://github.com/simplstudios/my-music-api" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
