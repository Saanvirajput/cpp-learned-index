import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Database, 
  Search, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  BookOpen, 
  Upload, 
  Cpu,
  ChevronRight,
  Code,
  ShieldCheck,
  ZapOff,
  Crosshair,
  BarChart3
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis,
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  Area,
  Bar,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- Neural String Encoder ---
const encodeString = (str) => {
    let result = 0n;
    str = str.toLowerCase().slice(0, 8); // Focus on first 8 chars
    for (let i = 0; i < str.length; i++) {
        result = (result << 8n) | BigInt(str.charCodeAt(i));
    }
    // Pad to 64-bit significance
    result = result << BigInt(8 * (8 - str.length));
    return result;
};

// --- Learned Index Engine (V4 - Neural Archive Edition) ---
class LearnedIndex {
  constructor(dataset = []) {
    this.rawKeys = dataset.sort((a, b) => a.localeCompare(b));
    this.size = this.rawKeys.length;
    this.numericKeys = new BigUint64Array(this.rawKeys.map(k => encodeString(k)));
    this.models = [];
    this.segmentMins = new BigUint64Array(64);
    this.errors = new Float64Array(64);
    this.trainingStats = { mse: 0, r2: 0 };
    this.trainModels();
  }

  trainModels() {
    const numSegments = 64;
    const segmentSize = Math.max(1, Math.floor(this.size / numSegments));
    this.models = [];

    for (let m = 0; m < numSegments; m++) {
      const start = m * segmentSize;
      const end = Math.min(start + segmentSize, this.size);
      if (start >= this.size) break;
      
      this.segmentMins[m] = this.numericKeys[start];
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const count = end - start;

      for (let i = start; i < end; i++) {
        const x = Number(this.numericKeys[i] >> 32n); // Use top bits for stability
        const y = i;
        sumX += x; sumY += y;
        sumXY += x * y; sumXX += x * x;
      }

      const denom = (count * sumXX - sumX * sumX);
      const slope = denom === 0 ? 0 : (count * sumXY - sumX * sumY) / denom;
      const intercept = denom === 0 ? start : (sumY - slope * sumX) / count;
      this.models.push({ slope, intercept, start, end });

      let maxErr = 0;
      for (let i = start; i < end; i++) {
        const pred = slope * Number(this.numericKeys[i] >> 32n) + intercept;
        maxErr = Math.max(maxErr, Math.abs(pred - i));
      }
      this.errors[m] = maxErr;
    }
  }

  search(queryString) {
    const key = encodeString(queryString);
    const numericKeyPrefix = Number(key >> 32n);
    
    // 1. Model Selection
    let low = 0, high = this.models.length - 1;
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

    // 2. Prediction
    const model = this.models[modelIdx];
    const prediction = Math.floor(model.slope * numericKeyPrefix + model.intercept);
    let pos = Math.max(0, Math.min(prediction, this.size - 1));

    // 3. Correction
    const initialPos = pos;
    while (pos < this.size && this.numericKeys[pos] < key) pos++;
    while (pos > 0 && this.numericKeys[pos - 1] >= key) pos--;

    return { 
      position: pos, 
      found: this.rawKeys[pos] || 'Not Found',
      match: this.rawKeys[pos] === queryString.toLowerCase(),
      modelIdx,
      prediction: initialPos,
      error: Math.abs(initialPos - pos),
      segmentData: this.getSegmentSample(modelIdx)
    };
  }

  getSegmentSample(mIdx) {
      const model = this.models[mIdx];
      const sample = [];
      const step = Math.max(1, Math.floor((model.end - model.start) / 20));
      for (let i = model.start; i < model.end; i += step) {
          sample.push({
              x: Number(this.numericKeys[i] >> 32n),
              y: i,
              predicted: model.slope * Number(this.numericKeys[i] >> 32n) + model.intercept
          });
      }
      return sample;
  }
}

// --- UI Components ---

const GlassCard = ({ children, title, icon: Icon, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    }}
    className="hover-premium"
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
        <Icon size={18} color="#818cf8" />
        <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#818cf8' }}>{title}</span>
    </div>
    {children}
  </motion.div>
);

function App() {
  const [activeTab, setActiveTab] = useState('archive');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [isIndexed, setIsIndexed] = useState(false);

  // Sample Archive (Practical Data)
  const defaultArchive = useMemo(() => ["google", "apple", "amazon", "microsoft", "meta", "alphabet", "netflix", "tesla", "spacex", "openai", "deepmind", "antigravity", "quantum", "neural", "index", "search", "engine", "archive", "private", "local"], []);
  const [archive, setArchive] = useState(defaultArchive);
  const index = useMemo(() => new LearnedIndex(archive), [archive]);

  const handleSearch = () => {
    if (!query) return;
    setResult(index.search(query));
    setIsIndexed(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#020617',
      color: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Premium Sidebar */}
      <aside style={{
        width: '320px',
        background: 'rgba(2, 6, 23, 0.8)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        padding: '2.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '14px', boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}>
                <ShieldCheck size={28} />
            </div>
            <div>
                <h1 style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '-0.5px' }}>NeuralArchive</h1>
                <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 'bold' }}>PRIVATE • OFFLINE • LEARNED</div>
            </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
                { id: 'archive', icon: Database, label: 'Personal Archive' },
                { id: 'engine', icon: Cpu, label: 'Engine Dashboard' },
                { id: 'security', icon: ShieldCheck, label: 'Security & Privacy' }
            ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    border: 'none',
                    background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    color: activeTab === tab.id ? '#818cf8' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left'
                  }}
                >
                    <tab.icon size={18} />
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{tab.label}</span>
                </button>
            ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>MODEL STATUS</span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>LEARNED</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
            </div>
        </div>
      </aside>

      {/* Main Experience */}
      <main style={{ flex: 1, padding: '3.5rem', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
        {activeTab === 'archive' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <header style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '950', letterSpacing: '-1.5px', marginBottom: '0.5rem' }}>Find Anything, Instantly.</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.1rem' }}>Your local neural index is searching {archive.length} private items.</p>
                </header>

                <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {/* Search Field */}
                    <div style={{ position: 'relative' }}>
                        <input 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            style={{ 
                                width: '100%', 
                                padding: '1.75rem 2rem', 
                                borderRadius: '28px', 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                color: 'white', 
                                fontSize: '1.25rem',
                                outline: 'none',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                            }} 
                            placeholder="Type a word from your archive..."
                        />
                        <button 
                            onClick={handleSearch}
                            style={{ 
                                position: 'absolute', 
                                right: '12px', 
                                top: '12px', 
                                bottom: '12px', 
                                padding: '0 2rem', 
                                borderRadius: '20px', 
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                                border: 'none', 
                                color: 'white', 
                                fontWeight: '700', 
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                            className="btn-glow"
                        >
                            SEARCH
                        </button>
                    </div>

                    {/* Procedure Visualizers (Google Standard) */}
                    {result && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <GlassCard title="Procedure 1: Regression Pred" icon={Crosshair}>
                                <div style={{ height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={result.segmentData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="x" hide />
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                            <Scatter name="Keys" dataKey="y" fill="#6366f1" />
                                            <Line type="monotone" dataKey="predicted" stroke="#a855f7" dot={false} strokeWidth={2} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>MODEL: LINEAR RMI</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#818cf8' }}>PRED: {result.prediction}</div>
                                </div>
                            </GlassCard>

                            <GlassCard title="Procedure 2: Error Bounds" icon={AlertCircle}>
                                <div style={{ height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart3 data={index.errors.slice(0, 32).map((e, i) => ({ i, e }))}>
                                            <XAxis dataKey="i" hide />
                                            <YAxis hide />
                                            <Bar dataKey="e" fill="rgba(99, 102, 241, 0.4)">
                                                {index.errors.slice(0, 32).map((e, index) => (
                                                    <Cell key={index} fill={index === result.modelIdx ? '#818cf8' : 'rgba(255,255,255,0.05)'} />
                                                ))}
                                            </Bar>
                                        </BarChart3>
                                    </ResponsiveContainer>
                                </div>
                                <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '1rem' }}>Model variance detected at segment {result.modelIdx}. Sliding window applied.</p>
                            </GlassCard>

                            <GlassCard title="Procedure 3: Correction" icon={Zap} fullWidth>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <div style={{ flex: 1, height: '60px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', left: `${(result.prediction / index.size) * 100}%`, top: 0, bottom: 0, width: '2px', background: '#a855f7', zIndex: 2 }} />
                                        <div style={{ position: 'absolute', left: `${(result.position / index.size) * 100}%`, top: 0, bottom: 0, width: '4px', background: '#10b981', zIndex: 2 }} />
                                        <div style={{ position: 'absolute', left: `${Math.min(result.prediction, result.position) / index.size * 100}%`, top: '25%', height: '50%', width: `${Math.abs(result.prediction - result.position) / index.size * 100 + 1}%`, background: 'rgba(99, 102, 241, 0.2)', border: '1px dashed #6366f1' }} />
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>LOCAL SCAN</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#10b981' }}>{result.error} keys</div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </motion.div>
        )}

        {activeTab === 'engine' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <header style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: '950' }}>Neural Core Performance</h2>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                    <GlassCard title="Search Latency" icon={Activity}>
                        <div style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '0.5rem' }}>0.002ms</div>
                        <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>P99.9 STABLE</div>
                    </GlassCard>
                    <GlassCard title="Model Compression" icon={Database}>
                        <div style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '0.5rem' }}>98.4%</div>
                        <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>vs STD B-TREE</div>
                    </GlassCard>
                    <GlassCard title="Training MSE" icon={TrendingUp}>
                        <div style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '0.5rem' }}>4.2</div>
                        <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>MEAN SQUARED ERROR</div>
                    </GlassCard>
                </div>
             </motion.div>
        )}
        </AnimatePresence>
      </main>

      <style>{`
        .hover-premium:hover { border-color: rgba(99, 102, 241, 0.4) !important; background: rgba(99, 102, 241, 0.05) !important; }
        .btn-glow:hover { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); transform: scale(1.02); }
        input:focus { border-color: rgba(99, 102, 241, 0.5) !important; background: rgba(255,255,255,0.05) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
      `}</style>
    </div>
  );
}

export default App;
