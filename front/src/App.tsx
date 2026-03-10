import { useState, useEffect } from 'react';
import { Search, Loader2, Film, Star, CheckCircle, Eye, EyeOff } from 'lucide-react';
import './index.css';

interface Movie {
  id: number;
  documentId: string;
  title: string;
  tmdbId: number;
  rating: number;
  watched: boolean;
  posterUrl: string;
}

// Strapi 5 returns flattened data inside the data array
interface StrapiMovie {
  id: number;
  documentId: string;
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

  // New state for movies list
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);

  // Fetch movies on mount
  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoadingMovies(true);
    try {
      const res = await fetch('http://localhost:1337/api/movies');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch movies');
      }

      // Map Strapi 5 flattened structure to our flat Movie interface
      if (data.data) {
        const formattedMovies: Movie[] = data.data.map((item: StrapiMovie) => ({
          id: item.id,
          documentId: item.documentId,
          title: item.title,
          tmdbId: item.tmdbId,
          rating: item.rating,
          watched: item.watched,
          posterUrl: item.posterUrl
        }));

        // Sort: newest first (assuming higher ID means newer, or you can sort by publishedAt)
        formattedMovies.sort((a, b) => b.id - a.id);

        setMovies(formattedMovies);
      }
    } catch (err: any) {
      console.error("Error fetching movies:", err);
    } finally {
      setLoadingMovies(false);
    }
  };

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

      // Refresh the movies list so the new import shows up
      fetchMovies();

    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatched = async (documentId: string, currentWatched: boolean) => {
    try {
      const res = await fetch(`http://localhost:1337/api/movies/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            watched: !currentWatched
          }
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to update movie');
      }

      // Optimistically update the UI
      setMovies(movies.map(movie =>
        movie.documentId === documentId ? { ...movie, watched: !currentWatched } : movie
      ));

    } catch (err) {
      console.error("Error updating watched status:", err);
      alert("Failed to update watched status. Make sure the 'update' permission is enabled in Strapi.");
    }
  };

  const toWatchMovies = movies.filter(m => !m.watched);
  const watchedMovies = movies.filter(m => m.watched);

  // Helper Function: Check if URL needs http://localhost:1337 prefix
  const getImageUrl = (url?: string) => {
    if (!url) return '';
    // If it's a relative path from Strapi (e.g. /uploads/image.png), prepend the backend URL.
    if (url.startsWith('/')) {
      return `http://localhost:1337${url}`;
    }
    // If it's already an absolute URL (like from TMDB), return as is.
    return url;
  };

  const renderMovieCard = (movie: Movie) => (
    <div key={movie.id} className="movie-card compact">
      {movie.posterUrl ? (
        <img src={getImageUrl(movie.posterUrl)} alt={movie.title} className="movie-poster" />
      ) : (
        <div className="movie-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
          <Film size={32} color="rgba(255,255,255,0.2)" />
        </div>
      )}

      <div className="movie-info">
        <h3 className="movie-title-small">{movie.title}</h3>

        <div className="movie-meta compact-meta">
          <span className="badge">
            <Star size={14} />
            {movie.rating ? movie.rating.toFixed(1) : 'N/A'}
          </span>
        </div>

        <button
          className={`btn-toggle-watched ${movie.watched ? 'watched' : ''}`}
          onClick={() => toggleWatched(movie.documentId, movie.watched)}
          title={movie.watched ? "Mark as unwatched" : "Mark as watched"}
        >
          {movie.watched ? (
            <>
              <EyeOff size={16} /> Mark Unwatched
            </>
          ) : (
            <>
              <Eye size={16} /> Mark Watched
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-container" style={{ maxWidth: '1000px' }}>
      <h1>Movie Finder</h1>

      <div className="main-layout">
        <div className="search-section">
          <h2>Add New Movie</h2>
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
            <div className="message success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <CheckCircle size={20} />
              {successMsg}
            </div>
          )}

          {result && (
            <div className="movie-card import-result">
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

        <div className="library-section">
          <h2>My Library</h2>

          {loadingMovies ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="spinner" size={32} color="var(--primary)" />
            </div>
          ) : (
            <>
              <div className="movie-category">
                <h3>To Watch <span>({toWatchMovies.length})</span></h3>
                {toWatchMovies.length === 0 ? (
                  <p className="empty-state">No movies in your wishlist yet. Import some above!</p>
                ) : (
                  <div className="movies-grid">
                    {toWatchMovies.map(renderMovieCard)}
                  </div>
                )}
              </div>

              <div className="movie-category" style={{ marginTop: '2rem' }}>
                <h3>Watched <span>({watchedMovies.length})</span></h3>
                {watchedMovies.length === 0 ? (
                  <p className="empty-state">You haven't watched any movies yet.</p>
                ) : (
                  <div className="movies-grid">
                    {watchedMovies.map(renderMovieCard)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
