import { useState, useEffect } from 'react';
import { Search, Loader2, Film, Star, CheckCircle, Play, LogOut, User, X, Mail, Lock } from 'lucide-react';
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

interface StrapiMovie {
  id: number;
  documentId: string;
  title: string;
  tmdbId: number;
  rating: number;
  watched: boolean;
  posterUrl: string;
}

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:1337' 
  : 'https://back-0fdbd3b1b5.strapi.cloud';

function App() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Movie | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (token) {
      fetchMovies();
    }
  }, [token]);

  const authFetch = async (path: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Falha ao autenticar');
      }

      setToken(data.jwt);
      localStorage.setItem('token', data.jwt);
      setIdentifier('');
      setPassword('');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/local/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Falha ao registrar usuário');
      }

      setToken(data.jwt);
      localStorage.setItem('token', data.jwt);

      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao registrar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setMovies([]);
    setResult(null);
  };

  const fetchMovies = async () => {
    setLoadingMovies(true);
    setFetchError('');
    try {
      const res = await authFetch('/api/movies');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch movies');
      }

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

        formattedMovies.sort((a, b) => b.id - a.id);
        setMovies(formattedMovies);
      }
    } catch (err: any) {
      console.error("Error fetching movies:", err);
      setFetchError(err.message || 'Failed to fetch movies');
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
      const res = await authFetch('/api/movies/import', {
        method: 'POST',
        body: JSON.stringify({ name: query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to find movie.');
      }

      setResult(data as Movie);
      setSuccessMsg(`Film "${data.title}" imported successfully!`);
      setQuery('');
      fetchMovies();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatched = async (documentId: string, currentWatched: boolean) => {
    try {
      const res = await authFetch(`/api/movies/${documentId}`, {
        method: 'PUT',
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

      setMovies(movies.map(movie =>
        movie.documentId === documentId ? { ...movie, watched: !currentWatched } : movie
      ));

    } catch (err) {
      console.error("Error updating watched status:", err);
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('/')) return `${API_URL}${url}`;
    return url;
  };

  const renderMovieCard = (movie: Movie) => (
    <div key={movie.id} className="movie-card">
      <div className="movie-poster-container">
        {movie.posterUrl ? (
          <img src={getImageUrl(movie.posterUrl)} alt={movie.title} className="movie-poster" />
        ) : (
          <div className="movie-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
            <Film size={48} color="rgba(255,255,255,0.2)" />
          </div>
        )}
      </div>

      <div className="movie-info">
        <h3 className="movie-title-small" title={movie.title}>{movie.title}</h3>

        <div className="movie-meta">
          <span className="badge rating">
            <Star size={14} fill="currentColor" />
            {movie.rating ? movie.rating.toFixed(1) : 'N/A'}
          </span>
          <span className="badge">
            TMDB: {movie.tmdbId}
          </span>
        </div>

        <button
          className={`btn-toggle-watched ${movie.watched ? 'watched' : ''}`}
          onClick={() => toggleWatched(movie.documentId, movie.watched)}
        >
          {movie.watched ? (
            <><CheckCircle size={16} /> Watched</>
          ) : (
            <><Play size={16} /> Mark Watched</>
          )}
        </button>
      </div>
    </div>
  );

  const toWatchMovies = movies.filter(m => !m.watched);
  const watchedMovies = movies.filter(m => m.watched);

  return (
    <div className="app-container">
      {/* Header */}
      <nav className="header-nav">
        <div className="logo-container">
          <Film size={32} />
          <h1>MovieFinder</h1>
        </div>
        
        {token ? (
          <button className="btn-toggle-watched" onClick={handleLogout} style={{ width: 'auto', padding: '0.6rem 1.2rem' }}>
            <LogOut size={18} /> Logout
          </button>
        ) : (
          <button className="btn-toggle-watched" onClick={() => setIsAuthModalOpen(true)} style={{ width: 'auto', padding: '0.6rem 1.2rem' }}>
            <User size={18} /> Login / Register
          </button>
        )}
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button 
              className="auth-tab" 
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} 
              onClick={() => setIsAuthModalOpen(false)}
            >
              <X size={24} />
            </button>

            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setAuthError(''); }}
              >
                Login
              </button>
              <button 
                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setAuthError(''); }}
              >
                Register
              </button>
            </div>

            {authError && <div className="message" style={{ marginBottom: '1.5rem' }}>{authError}</div>}

            {authTab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                      type="text"
                      className="search-input"
                      style={{ paddingLeft: '3rem' }}
                      placeholder="Email or Username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                      type="password"
                      className="search-input"
                      style={{ paddingLeft: '3rem' }}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-search" disabled={loading}>
                  {loading ? <Loader2 className="spinner" size={20} /> : 'Welcome Back'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                      type="text"
                      className="search-input"
                      style={{ paddingLeft: '3rem' }}
                      placeholder="Username"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                      type="email"
                      className="search-input"
                      style={{ paddingLeft: '3rem' }}
                      placeholder="Email Address"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                      type="password"
                      className="search-input"
                      style={{ paddingLeft: '3rem' }}
                      placeholder="Password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-search" disabled={loading}>
                  {loading ? <Loader2 className="spinner" size={20} /> : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!token ? (
        <div className="landing-hero">
          <h1>Track your cinematic journey.</h1>
          <p>
            Your personal movie vault. Import films from TMDB, track your progress, 
            and build your ultimate watch list.
          </p>
          <button className="btn-hero" onClick={() => setIsAuthModalOpen(true)}>
            Get Started — It's free
          </button>
          
          <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'left' }}>
            <div className="movie-card" style={{ padding: '2rem' }}>
              <Film color="var(--primary)" size={32} />
              <h4 style={{ margin: '1rem 0 0.5rem' }}>Auto Import</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sync instantly with TMDB database.</p>
            </div>
            <div className="movie-card" style={{ padding: '2rem' }}>
              <Star color="#fbbf24" size={32} />
              <h4 style={{ margin: '1rem 0 0.5rem' }}>Rating History</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Keep track of your favorite scores.</p>
            </div>
            <div className="movie-card" style={{ padding: '2rem' }}>
              <CheckCircle color="#4ade80" size={32} />
              <h4 style={{ margin: '1rem 0 0.5rem' }}>Watch List</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Organize movies you've seen and want to see.</p>
            </div>
          </div>
        </div>
      ) : (
        <main className="main-layout">
          {/* Search/Import Section */}
          <section className="search-section">
            <form onSubmit={handleSearch} className="search-box">
              <div className="form-group" style={{ flexGrow: 1, position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input
                  type="text"
                  className="search-input"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="Search and import a movie (e.g., Inception)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-search btn-import" disabled={loading || !query.trim()}>
                {loading ? <Loader2 className="spinner" size={20} /> : 'Import Movie'}
              </button>
            </form>

            {(error || successMsg) && (
              <div className={`message ${successMsg ? 'success' : ''}`} style={{ marginTop: '1.5rem' }}>
                {error || successMsg}
              </div>
            )}

            {result && (
              <div className="movie-card" style={{ marginTop: '2rem', border: '1px solid var(--primary)' }}>
                <div style={{ display: 'flex', padding: '1.5rem', gap: '2rem' }}>
                  <img src={getImageUrl(result.posterUrl)} alt={result.title} style={{ width: '120px', borderRadius: '12px' }} />
                  <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{result.title}</h3>
                    <div className="movie-meta">
                      <span className="badge rating"><Star size={14} fill="currentColor" /> {result.rating.toFixed(1)}</span>
                      <span className="badge">New Release</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Successfully added to your library.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Library Section */}
          <section className="library-section">
            {loadingMovies ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <Loader2 className="spinner" size={48} color="var(--primary)" />
              </div>
            ) : fetchError ? (
              <div className="empty-state">
                <p>{fetchError}</p>
                <button className="btn-search" style={{ width: 'auto', marginTop: '1rem' }} onClick={fetchMovies}>Try Again</button>
              </div>
            ) : (
              <>
                <div className="movie-category">
                  <h3>To Watch <span>({toWatchMovies.length})</span></h3>
                  {toWatchMovies.length === 0 ? (
                    <div className="empty-state">
                      <Film size={48} />
                      <p>Your wishlist is empty. Try importing a movie above!</p>
                    </div>
                  ) : (
                    <div className="movies-grid">
                      {toWatchMovies.map(renderMovieCard)}
                    </div>
                  )}
                </div>

                <div className="movie-category">
                  <h3>Watched <span>({watchedMovies.length})</span></h3>
                  {watchedMovies.length === 0 ? (
                    <div className="empty-state">
                      <CheckCircle size={48} />
                      <p>You haven't marked any movies as watched yet.</p>
                    </div>
                  ) : (
                    <div className="movies-grid">
                      {watchedMovies.map(renderMovieCard)}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
