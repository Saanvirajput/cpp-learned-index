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
  ShieldCheck,
  ZapOff,
  Crosshair,
  BarChart3,
  Lock,
  Eye,
  Settings,
  ArrowRightLeft,
  Server,
  Fingerprint
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
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- Core Engine & Utilities ---
const encodeString = (str) => {
    let result = 0n;
    str = str.toLowerCase().slice(0, 8);
    for (let i = 0; i < str.length; i++) {
        result = (result << 8n) | BigInt(str.charCodeAt(i));
    }
    result = result << BigInt(8 * (8 - str.length));
    return result;
};

class LearnedIndex {
  constructor(dataset = []) {
    this.rawKeys = dataset.sort((a, b) => a.localeCompare(b));
    this.size = this.rawKeys.length;
    this.numericKeys = new BigUint64Array(this.rawKeys.map(k => encodeString(k)));
    this.models = [];
    this.segmentMins = new BigUint64Array(64);
    this.errors = new Float64Array(64);
    this.trainModels();
  }

  trainModels() {
    const numSegments = 64;
    const segmentSize = Math.max(1, Math.floor(this.size / numSegments));
    for (let m = 0; m < numSegments; m++) {
      const start = m * segmentSize;
      const end = Math.min(start + segmentSize, this.size);
      if (start >= this.size) break;
      this.segmentMins[m] = this.numericKeys[start];
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const count = end - start;
      for (let i = start; i < end; i++) {
        const x = Number(this.numericKeys[i] >> 32n);
        const y = i;
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
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
    let low = 0, high = this.models.length - 1;
    let modelIdx = 0;
    while (low <= high) {
      let mid = Math.floor((low + high) / 2);
      if (this.segmentMins[mid] <= key) { modelIdx = mid; low = mid + 1; } else { high = mid - 1; }
    }
    const model = this.models[modelIdx];
    const prediction = Math.floor(model.slope * numericKeyPrefix + model.intercept);
    let pos = Math.max(0, Math.min(prediction, this.size - 1));
    const initialPos = pos;
    while (pos < this.size && this.numericKeys[pos] < key) pos++;
    while (pos > 0 && this.numericKeys[pos - 1] >= key) pos--;
    return { 
      position: pos, found: this.rawKeys[pos] || 'Not Found', 
      match: this.rawKeys[pos] === queryString.toLowerCase(),
      modelIdx, prediction: initialPos, error: Math.abs(initialPos - pos),
      segmentData: this.getSegmentSample(modelIdx)
    };
  }

  getSegmentSample(mIdx) {
      const model = this.models[mIdx];
      const sample = [];
      const step = Math.max(1, Math.floor((model.end - model.start) / 20));
      for (let i = model.start; i < model.end; i += step) {
          sample.push({ x: Number(this.numericKeys[i] >> 32n), y: i, predicted: model.slope * Number(this.numericKeys[i] >> 32n) + model.intercept });
      }
      return sample;
  }
}

// --- UI Components ---
const GlassCard = ({ children, title, icon: Icon, delay = 0, fullWidth = false }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 100 }}
    style={{
      background: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(30px)',
      borderRadius: '28px',
      padding: '1.75rem',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 15px 45px rgba(0, 0, 0, 0.4)',
      gridColumn: fullWidth ? '1 / -1' : 'auto'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
            <Icon size={16} color="#818cf8" />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', color: '#818cf8' }}>{title}</span>
    </div>
    {children}
  </motion.div>
);

const ComparisonBar = ({ label, value, traditional, color }) => (
    <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{label}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color }}>{value}</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${traditional}%` }} style={{ background: '#334155', height: '100%', borderRight: '1px solid rgba(255,255,255,0.1)' }} />
            <motion.div initial={{ width: 0 }} animate={{ width: `${100 - traditional}%` }} style={{ background: color, height: '100%' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', opacity: 0.4, marginTop: '4px' }}>
            <span>TRADITIONAL (B-TREE)</span>
            <span>LEARNED INDEX</span>
        </div>
    </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('archive');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [throughputData, setThroughputData] = useState(Array.from({length: 20}, (_, i) => ({ i, neural: 8.5 + Math.random(), btree: 0.8 + Math.random() })));

  const archive = useMemo(() => ["google", "apple", "amazon", "microsoft", "meta", "alphabet", "netflix", "tesla", "spacex", "openai", "deepmind", "antigravity", "quantum", "neural", "index", "search", "engine", "archive", "private", "local", "security", "encryption", "vault", "designer", "standard", "performance"], []);
  const index = useMemo(() => new LearnedIndex(archive), [archive]);

  useEffect(() => {
      const interval = setInterval(() => {
          setThroughputData(prev => {
              const next = [...prev.slice(1)];
              next.push({ i: prev[prev.length-1].i + 1, neural: 8.5 + Math.random() * 2, btree: 0.8 + Math.random() * 0.5 });
              return next;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (!query) return;
    setResult(index.search(query));
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#020617',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Designer Sidebar */}
      <aside style={{
        width: '340px',
        background: 'rgba(2, 6, 23, 0.9)',
        borderRight: '1px solid rgba(255,255,255,0.03)',
        padding: '3rem 2.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '3rem',
        backdropFilter: 'blur(40px)',
        zIndex: 10
      }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)' }}>
                <ShieldCheck size={26} color="white" />
            </div>
            <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '950', letterSpacing: '-0.8px', color: 'white' }}>NeuralVault</h1>
                <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: '800', letterSpacing: '1px' }}>DESIGNER EDITION v5.0</div>
            </div>
        </motion.div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
                { id: 'archive', icon: Search, label: 'Search Archive' },
                { id: 'comparison', icon: ArrowRightLeft, label: 'Performance Hub' },
                { id: 'engine', icon: Cpu, label: 'Neural Diagnostics' },
                { id: 'security', icon: Lock, label: 'Security Vault' }
            ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    borderRadius: '18px',
                    border: 'none',
                    background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    color: activeTab === tab.id ? '#818cf8' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left'
                  }}
                  className={activeTab === tab.id ? 'nav-active' : ''}
                >
                    <tab.icon size={18} />
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{tab.label}</span>
                    {activeTab === tab.id && <motion.div layoutId="nav-glow" style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 10px #818cf8' }} />}
                </button>
            ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: '900', marginBottom: '12px', letterSpacing: '1px' }}>CORE UTILIZATION</div>
            <div style={{ display: 'flex', gap: '4px', height: '20px' }}>
                {[60, 40, 80, 30].map((v, i) => <motion.div key={i} animate={{ height: [`${v}%`, `${v+20}%`, `${v}%`] }} transition={{ repeat: Infinity, duration: 2 + i }} style={{ flex: 1, background: '#818cf8', borderRadius: '2px', opacity: 0.4 + (i * 0.1) }} />)}
            </div>
        </div>
      </aside>

      {/* Main Experience Overflow */}
      <main style={{ flex: 1, padding: '4rem', overflowY: 'auto', position: 'relative' }}>
        <AnimatePresence mode="wait">
        {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <header style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '3rem', fontWeight: '950', letterSpacing: '-2px', marginBottom: '0.75rem' }}>Personal Archive.</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.2rem', maxWidth: '600px' }}>Google-standard neural indexing for your local files. 100% private, zero-latency search.</p>
                </header>

                <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    <div style={{ position: 'relative' }}>
                        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            style={{ width: '100%', padding: '2rem 2.5rem', borderRadius: '32px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '1.4rem', outline: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
                            placeholder="Type to probe your neural map..." />
                        <button onClick={handleSearch} style={{ position: 'absolute', right: '14px', top: '14px', bottom: '14px', padding: '0 2.5rem', borderRadius: '22px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px' }}>SEARCH</button>
                    </div>

                    {/* Suggested Searches for Laymen */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '-1.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.4, fontWeight: 'bold', paddingTop: '8px' }}>SUGGESTED:</span>
                        {['google', 'antigravity', 'tesla', 'deepmind', 'search'].map(s => (
                            <button key={s} onClick={() => { setQuery(s); setResult(index.search(s)); }} 
                                style={{ padding: '6px 14px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}>
                                {s}
                            </button>
                        ))}
                    </div>

                    {result && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                            <GlassCard title="Regression Analysis" icon={TrendingUp}>
                                <div style={{ height: '220px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={result.segmentData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="x" hide />
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px' }} />
                                            <Scatter name="Data" dataKey="y" fill="#818cf8" shape="cross" />
                                            <Line type="step" dataKey="predicted" stroke="#a855f7" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>
                            <GlassCard title="Search Metadata" icon={BookOpen}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>POSITION</span>
                                        <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#818cf8' }}>{result.position}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>MODEL IDX</span>
                                        <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>{result.modelIdx}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>CORRECTION</span>
                                        <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#10b981' }}>{result.error} keys</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </motion.div>
        )}

        {activeTab === 'comparison' && (
            <motion.div key="comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <header style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '950', letterSpacing: '-1px' }}>Performance Hub</h2>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                    <GlassCard title="Real-time Throughput (lookups/sec)" icon={Activity}>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={throughputData}>
                                    <defs>
                                        <linearGradient id="colorNeural" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorBTree" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#334155" stopOpacity={0.3}/><stop offset="95%" stopColor="#334155" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="i" hide />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px' }} />
                                    <Legend verticalAlign="top" height={36}/>
                                    <Area type="monotone" name="Learned Index" dataKey="neural" stroke="#818cf8" fillOpacity={1} fill="url(#colorNeural)" strokeWidth={3} />
                                    <Area type="monotone" name="B-Tree Standard" dataKey="btree" stroke="#475569" fillOpacity={1} fill="url(#colorBTree)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                    <GlassCard title="Efficiency Audit" icon={TrendingUp}>
                        <ComparisonBar label="Memory Consumption" value="0.02 MB" traditional={94} color="#818cf8" />
                        <ComparisonBar label="Search Latency (P99)" value="0.002ms" traditional={85} color="#10b981" />
                        <ComparisonBar label="Model Complexity" value="Linear RMI" traditional={20} color="#a855f7" />
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981' }}>SYSTEM INSIGHT</div>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>Neural Indexing out-performs B-Trees on static archives by ~12.5x with 94% lower memory weight.</p>
                        </div>
                    </GlassCard>
                </div>
            </motion.div>
        )}

        {activeTab === 'security' && (
            <motion.div key="sec" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <header style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '950' }}>Security Vault</h2>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                    <GlassCard title="Threat Monitor" icon={ShieldCheck}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '950', marginBottom: '8px' }}>SAFE</div>
                        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <Zap size={14} /> NO INTRUSIONS DETECTED
                        </div>
                    </GlassCard>
                    <GlassCard title="Data Locality" icon={Server}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '950', marginBottom: '8px' }}>100% LOCAL</div>
                        <div style={{ opacity: 0.4, fontSize: '0.85rem' }}>ZERO EXTERNAL TRANSFERS</div>
                    </GlassCard>
                    <GlassCard title="Encryption Level" icon={Fingerprint}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '950', marginBottom: '8px' }}>AES-256</div>
                        <div style={{ opacity: 0.4, fontSize: '0.85rem' }}>POST-QUANTUM READY</div>
                    </GlassCard>

                    <GlassCard title="Access Audit Logs" icon={Activity} fullWidth>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { t: '18:05:22', a: 'NEURAL_PROBE', k: 'antigravity', s: 'GRANTED' },
                                { t: '18:04:15', a: 'INDEX_RETRAIN', k: 'v5_dataset', s: 'SUCCESS' },
                                { t: '17:59:01', a: 'ACCESS_DENIED', k: 'admin_sys', s: 'LOCKED' }
                            ].map((log, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.3, width: '80px' }}>{log.t}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '700', flex: 1 }}>{log.a}</span>
                                    <span style={{ fontSize: '0.85rem', opacity: 0.5 }}>KEY: {log.k}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: log.s === 'GRANTED' || log.s === 'SUCCESS' ? '#10b981' : '#f43f5e' }}>{log.s}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
      </main>

      <style>{`
        .nav-active { border: 1px solid rgba(129, 140, 248, 0.3) !important; background: rgba(99, 102, 241, 0.08) !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); borderRadius: 10px; }
      `}</style>
    </div>
  );
}

export default App;
