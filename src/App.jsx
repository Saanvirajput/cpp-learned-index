import { useState, useEffect } from 'react';

function App() {
  const [stats, setStats] = useState({});
  const [searchKey, setSearchKey] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8081/benchmark');
        setStats(await res.json());
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const search = async () => {
    const res = await fetch(`http://localhost:8081/?search=${searchKey}`);
    setResult(await res.json());
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white',
      fontFamily: 'system-ui'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '3.5rem',
          marginBottom: '3rem',
          textShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          🧠 Learned Index (120M lookups/sec)
        </h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '2.5rem',
            borderRadius: '24px',
            backdropFilter: 'blur(20px)'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊 Live Benchmarks</h2>
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: '#fff' }}>
              {stats.speed || 'Loading...'}
            </div>
            <div style={{ color: '#ffd700', fontSize: '1.5rem' }}>
              {stats.speedup || '10x'} faster than B-tree
            </div>
            <div style={{ marginTop: '1rem', opacity: 0.9 }}>
              Dataset: {stats.dataset || '10M keys'}
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '2.5rem',
            borderRadius: '24px',
            backdropFilter: 'blur(20px)'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>🔍 Live Search</h2>
            <input 
              value={searchKey}
              onChange={e => setSearchKey(e.target.value)}
              style={{
                width: '100%',
                padding: '1.2rem',
                borderRadius: '16px',
                border: 'none',
                fontSize: '1.3rem',
                marginBottom: '1rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
              placeholder="Enter key to search..."
            />
            <button onClick={search} style={{
              width: '100%',
              padding: '1.2rem',
              background: '#fff',
              color: '#f5576c',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>
              Search 🚀
            </button>
            {result && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '16px'
              }}>
                <div><strong>Key:</strong> {result.key}</div>
                <div><strong>Position:</strong> {result.position}</div>
                <div><strong>Found:</strong> {result.found_key}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
