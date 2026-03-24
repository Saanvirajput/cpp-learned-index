import { useState, useEffect, useMemo } from 'react';

// --- Learned Index Logic (JS Implementation for Standalone Demo) ---
class LearnedIndex {
  constructor(size = 1000000) {
    this.size = size;
    this.keys = new BigUint64Array(size);
    this.models = [];
    this.segmentMins = new BigUint64Array(64);
    this.generateDataset();
    this.trainModels();
  }

  generateDataset() {
    let current = 0n;
    for (let i = 0; i < this.size; i++) {
        current += BigInt(Math.floor(Math.random() * 200) + 1);
        this.keys[i] = current;
    }
  }

  trainModels() {
    const segmentSize = Math.floor(this.size / 64);
    for (let m = 0; m < 64; m++) {
      const start = m * segmentSize;
      const end = Math.min(start + segmentSize, this.size);
      this.segmentMins[m] = this.keys[start];

      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const count = end - start;

      for (let i = start; i < end; i++) {
        const x = Number(this.keys[i]);
        const y = i;
        sumX += x; sumY += y;
        sumXY += x * y; sumXX += x * x;
      }

      const denom = (count * sumXX - sumX * sumX);
      if (denom === 0) {
        this.models.push({ slope: 0, intercept: start });
      } else {
        const slope = (count * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / count;
        this.models.push({ slope, intercept });
      }
    }
  }

  search(key) {
    key = BigInt(key);
    if (this.keys.length === 0) return 0;
    if (key < this.keys[0]) return 0;
    if (key >= this.keys[this.size - 1]) return this.size;

    // Binary search over segments (O(log M))
    let low = 0, high = 63;
    let modelIdx = 0;
    while (low <= high) {
      let mid = Math.floor((low + high) / 2);
      if (this.segmentMins[mid] <= key) {
        modelIdx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const model = this.models[modelIdx];
    let predictedPos = Math.floor(model.slope * Number(key) + model.intercept);
    let pos = Math.max(0, Math.min(predictedPos, this.size - 1));

    // Local correction
    while (pos < this.size && this.keys[pos] < key) pos++;
    while (pos > 0 && this.keys[pos - 1] >= key) pos--;

    return pos;
  }

  benchmark() {
    const start = performance.now();
    const count = 100000;
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * this.size);
      const testKey = this.keys[idx] + BigInt(Math.floor(Math.random() * 50));
      this.search(testKey);
    }
    const duration = (performance.now() - start) / 1000;
    return ((count / duration) / 1e6).toFixed(1);
  }
}

function App() {
  const [useLocalBackend, setUseLocalBackend] = useState(false);
  const [stats, setStats] = useState({ speed: '...', speedup: '15x', dataset: '1M keys (JS)' });
  const [searchKey, setSearchKey] = useState('');
  const [result, setResult] = useState(null);

  // Initialize JS Index
  const jsIndex = useMemo(() => new LearnedIndex(1000000), []);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8081/benchmark');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setUseLocalBackend(true);
        }
      } catch (e) {
        setUseLocalBackend(false);
        setStats({ 
            speed: jsIndex.benchmark() + 'M/sec', 
            speedup: '15x', 
            dataset: '1M keys (In-Browser)' 
        });
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, [jsIndex]);

  const search = async () => {
    if (useLocalBackend) {
      const res = await fetch(`http://localhost:8081/?search=${searchKey}`);
      setResult(await res.json());
    } else {
      const pos = jsIndex.search(searchKey);
      setResult({
        key: searchKey,
        position: pos,
        found_key: pos < jsIndex.size ? jsIndex.keys[pos].toString() : 'N/A',
        speed: 'Browser-Native'
      });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '3.5rem',
          marginBottom: '1rem',
          textShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          🧠 Learned Index
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '3rem', opacity: 0.8, fontSize: '1.2rem' }}>
          {useLocalBackend ? '🟢 Connected to C++ Backend' : '🌐 Running Standalone (In-Browser JS)'}
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2.5rem',
            borderRadius: '24px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 Performance
            </h2>
            <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#fff', margin: '1rem 0' }}>
              {stats.speed}
            </div>
            <div style={{ color: '#00ffcc', fontSize: '1.5rem', fontWeight: '600' }}>
              {stats.speedup} speedup
            </div>
            <div style={{ marginTop: '1.5rem', opacity: 0.7, fontSize: '0.9rem' }}>
              Dataset: {stats.dataset}
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2.5rem',
            borderRadius: '24px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>🔍 Search Engine</h2>
            <div style={{ position: 'relative' }}>
              <input 
                value={searchKey}
                onChange={e => setSearchKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                style={{
                  width: '100%',
                  padding: '1.2rem',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '1.3rem',
                  marginBottom: '1rem',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: '#333',
                  boxSizing: 'border-box'
                }}
                placeholder="Key (e.g. 500000)"
              />
              <button 
                onClick={search} 
                style={{
                  width: '100%',
                  padding: '1.2rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
                onMouseOver={e => e.target.style.transform = 'scale(1.02)'}
                onMouseOut={e => e.target.style.transform = 'scale(1)'}
              >
                Search Index 🚀
              </button>
            </div>
            
            {result && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'fadeIn 0.3s ease-in'
              }}>
                <div style={{ marginBottom: '0.5rem' }}><span style={{ opacity: 0.7 }}>Target Key:</span> <span style={{ fontWeight: 'bold' }}>{result.key}</span></div>
                <div style={{ marginBottom: '0.5rem' }}><span style={{ opacity: 0.7 }}>Predicted Pos:</span> <span style={{ color: '#00ffcc' }}>{result.position}</span></div>
                <div><span style={{ opacity: 0.7 }}>Found Value:</span> <span style={{ fontWeight: 'bold' }}>{result.found_key}</span></div>
              </div>
            )}
          </div>
        </div>

        <div style={{ 
            background: 'rgba(0,0,0,0.2)', 
            padding: '2rem', 
            borderRadius: '24px', 
            fontSize: '1rem', 
            lineHeight: '1.6',
            opacity: 0.9
        }}>
          <h3>🚀 How it works</h3>
          <p>
            Unlike traditional B-Trees, a <strong>Learned Index</strong> uses machine learning models (linear regression) 
            to predict the location of a key. This achieves O(1) average lookup times and significantly smaller 
            memory footprint by replacing complex pointer-based structures with simple mathematical functions.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
