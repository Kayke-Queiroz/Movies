import { useState } from 'react';
import { Search, Loader2, Film, Star, CheckCircle } from 'lucide-react';
import './index.css';

interface Movie {
  id: number;
  title: string;
  tmdbId: number;
  rating: number;
  watched: boolean;
  posterUrl: string;
}

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Movie | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSuccessMsg('');

    try {
      // Calls the custom backend endpoint we fixed earlier
      const res = await fetch('http://localhost:1337/api/movies/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to find movie.');
      }

      setResult(data as Movie);
      setSuccessMsg(`Film "${data.title}" imported successfully to the database!`);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>Movie Finder</h1>
      
      <form onSubmit={handleSearch} className="search-box">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          className="search-input"
          placeholder="Search and import a movie (e.g., The Matrix)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-search" disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="spinner" size={20} /> : 'Import'}
        </button>
      </form>

      {error && <div className="message">{error}</div>}
      
      {successMsg && !error && (
        <div className="message success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}

      {result && (
        <div className="movie-card">
          {result.posterUrl ? (
            <img src={result.posterUrl} alt={result.title} className="movie-poster" />
          ) : (
            <div className="movie-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
              <Film size={48} color="rgba(255,255,255,0.2)" />
            </div>
          )}
          
          <div className="movie-info">
            <h2 className="movie-title">{result.title}</h2>
            
            <div className="movie-meta">
              <span className="badge">
                <Star size={16} />
                {result.rating ? result.rating.toFixed(1) : 'N/A'}
              </span>
              <span>TMDB ID: {result.tmdbId}</span>
            </div>
            
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '1rem' }}>
              This movie has been automatically saved to your Strapi backend database via the custom TMDB integration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
