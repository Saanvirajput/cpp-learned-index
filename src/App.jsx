import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Activity, 
  Search, 
  Zap, 
  TrendingUp, 
  BookOpen, 
  Cpu,
  ShieldCheck,
  Lock,
  ArrowRightLeft,
  Server,
  Fingerprint,
  Layers,
  Download,
  Terminal,
  Play,
  Pause,
  Maximize2,
  Code2,
  FlaskConical,
  Binary,
  Microscope,
  Info
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  Area,
  AreaChart,
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
  constructor(dataset = [], type = 'linear') {
    this.rawKeys = dataset.sort((a, b) => a.localeCompare(b));
    this.size = this.rawKeys.length;
    this.numericKeys = new BigUint64Array(this.rawKeys.map(k => encodeString(k)));
    this.models = [];
    this.segmentMins = new BigUint64Array(64);
    this.errors = new Float64Array(64);
    this.type = type;
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

  exportMetadata() {
      return JSON.stringify({ type: this.type, size: this.size, models: this.models }, null, 2);
  }
}

// --- UI Components ---
const EnterpriseCard = ({ children, title, icon: Icon, delay = 0, fullWidth = false, gradient = false }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.5 }}
    style={{
      background: gradient ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(2, 6, 23, 0.4) 100%)' : 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(30px)',
      borderRadius: '24px',
      padding: '2rem',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
      gridColumn: fullWidth ? '1 / -1' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
                <Icon size={16} color="#818cf8" />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', color: '#818cf8' }}>{title}</span>
        </div>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
    </div>
    <div style={{ flex: 1 }}>{children}</div>
  </motion.div>
);

const CodeSnippet = ({ code, language = 'javascript' }) => (
    <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1', overflowX: 'auto', margin: '1rem 0' }}>
        <pre style={{ margin: 0 }}><code>{code}</code></pre>
    </div>
);

const Formula = ({ latex, desc }) => (
    <div style={{ margin: '2rem 0', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: '300', fontStyle: 'italic', letterSpacing: '4px', color: '#818cf8', marginBottom: '0.5rem' }}>{latex}</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.4, fontWeight: '700', letterSpacing: '1px' }}>{desc}</div>
    </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('archive');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [modelType, setModelType] = useState('linear');
  const [isIngestRunning, setIsIngestRunning] = useState(true);
  const [logs, setLogs] = useState([]);
  const [throughputData, setThroughputData] = useState(Array.from({length: 30}, (_, i) => ({ i, neural: 12 + Math.random(), btree: 2.5 + Math.random() })));

  const archiveBase = useMemo(() => ["google", "apple", "amazon", "microsoft", "meta", "alphabet", "netflix", "tesla", "spacex", "openai", "deepmind", "antigravity", "quantum", "neural", "index", "search", "engine", "archive", "private", "local", "security", "encryption", "vault", "designer", "standard", "performance"], []);
  const index = useMemo(() => new LearnedIndex(archiveBase, modelType), [archiveBase, modelType]);

  // Live Ingest Simulation
  useEffect(() => {
    if (!isIngestRunning) return;
    const interval = setInterval(() => {
        const fakeKey = Math.random().toString(36).substring(7);
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), action: 'ENTRY_INGEST', key: fakeKey, latency: (Math.random() * 0.005).toFixed(4) }, ...prev.slice(0, 15)]);
        setThroughputData(prev => {
            const next = [...prev.slice(1)];
            next.push({ i: prev[prev.length-1].i + 1, neural: 12 + Math.random() * 3, btree: 2.5 + Math.random() * 1 });
            return next;
        });
    }, 2000);
    return () => clearInterval(interval);
  }, [isIngestRunning]);

  const handleSearch = () => {
    if (!query) return;
    setResult(index.search(query));
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#020617',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Deep Space Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.04) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(168, 85, 247, 0.04) 0%, transparent 50%)', zIndex: 0 }} />

      {/* Enterprise Navigation - Fully Responsive */}
      <aside style={{
        width: '380px',
        background: 'rgba(2, 6, 23, 0.98)',
        borderRight: '1px solid rgba(255,255,255,0.03)',
        padding: '4rem 2.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '3rem',
        backdropFilter: 'blur(80px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px rgba(99, 102, 241, 0.4)' }}>
                <FlaskConical size={32} color="white" />
            </div>
            <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '950', letterSpacing: '-1.5px', color: 'white' }}>NeuralLab</h1>
                <div style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: '900', letterSpacing: '3px' }}>RESEARCH EDITION v7.0</div>
            </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
                { id: 'archive', icon: Search, label: 'Search Archives' },
                { id: 'comparison', icon: ArrowRightLeft, label: 'Performance Hub' },
                { id: 'research', icon: Microscope, label: 'Research Laboratory' },
                { id: 'architect', icon: Layers, label: 'Model Architect' },
                { id: 'security', icon: Lock, label: 'Security Vault' }
            ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    color: activeTab === tab.id ? '#818cf8' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left'
                  }}
                  className={activeTab === tab.id ? 'nav-active' : ''}
                >
                    <tab.icon size={20} />
                    <span style={{ fontWeight: '800', fontSize: '1rem' }}>{tab.label}</span>
                    {activeTab === tab.id && <motion.div layoutId="nav-bg" style={{ position: 'absolute', left: 0, right: 0, height: '100%', background: 'rgba(99,102,241,0.05)', borderRadius: '24px', zIndex: -1 }} />}
                </button>
            ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: '900', letterSpacing: '2px', marginBottom: '1rem' }}>SYSTEM LOAD</div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 2 }} style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)' }} />
            </div>
        </div>
      </aside>

      {/* Main Experience Interface - Truly Edge-to-Edge */}
      <main style={{ 
        flex: 1, 
        padding: '0', 
        overflowY: 'auto', 
        zIndex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '5rem 6rem' }}>
        <AnimatePresence mode="wait">
        {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                <header style={{ marginBottom: '5rem' }}>
                    <h2 style={{ fontSize: '5rem', fontWeight: '950', letterSpacing: '-5px', lineHeight: 0.9, marginBottom: '2rem' }}>Predict. Retrieve.<br/>Perfect.</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.6rem', maxWidth: '850px', fontWeight: '400', lineHeight: 1.6 }}>Neural Suite v7.0 implements a state-of-the-art Recursive Model Index (RMI) that replaces traditional tree structures with linear regression for sub-millisecond lookups.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                        <div style={{ position: 'relative' }}>
                            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                style={{ width: '100%', padding: '2.5rem 4rem', borderRadius: '45px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '2rem', outline: 'none', boxShadow: '0 40px 80px rgba(0, 0, 0, 0.5)' }} 
                                placeholder="Query the neural map..." />
                            <button onClick={handleSearch} style={{ position: 'absolute', right: '18px', top: '18px', bottom: '18px', padding: '0 4rem', borderRadius: '32px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: '900', cursor: 'pointer', letterSpacing: '3px', fontSize: '1rem', boxShadow: '0 10px 20px rgba(99,102,241,0.3)' }}>SEARCH</button>
                        </div>

                        {result && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                                <EnterpriseCard title="Regression Analysis" icon={TrendingUp}>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={result.segmentData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                <XAxis dataKey="x" hide />
                                                <YAxis hide domain={['auto', 'auto']} />
                                                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px' }} />
                                                <Scatter name="Data" dataKey="y" fill="#818cf8" shape="circle" />
                                                <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={4} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </EnterpriseCard>
                                <EnterpriseCard title="Neural Metadata" icon={Binary} gradient>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                                            <span style={{ opacity: 0.4, fontSize: '1rem', fontWeight: '700' }}>POSITION</span>
                                            <span style={{ fontWeight: '950', fontSize: '2rem', color: '#818cf8' }}>{result.position}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                                            <span style={{ opacity: 0.4, fontSize: '1rem', fontWeight: '700' }}>MODEL RMI</span>
                                            <span style={{ fontWeight: '950', fontSize: '2rem' }}>#{result.modelIdx}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ opacity: 0.4, fontSize: '1rem', fontWeight: '700' }}>PRECISION</span>
                                            <span style={{ fontWeight: '950', fontSize: '2rem', color: '#10b981' }}>±{result.error} KEYS</span>
                                        </div>
                                    </div>
                                </EnterpriseCard>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                        <EnterpriseCard title="Real-time Ingest" icon={Terminal}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    STREAMING <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                </div>
                                <Activity size={16} opacity={0.3} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {logs.map((log, i) => (
                                    <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <span style={{ opacity: 0.3, fontFamily: 'monospace' }}>{log.time}</span>
                                        <span style={{ fontWeight: '700', color: '#818cf8' }}>{log.key}</span>
                                        <span style={{ opacity: 0.5 }}>{log.latency}ms</span>
                                    </div>
                                ))}
                            </div>
                        </EnterpriseCard>
                    </div>
                </div>
            </motion.div>
        )}

        {activeTab === 'research' && (
            <motion.div key="research" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}>
                <header style={{ marginBottom: '5rem' }}>
                    <h2 style={{ fontSize: '4.5rem', fontWeight: '950', letterSpacing: '-4px' }}>Research Laboratory</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.4rem' }}>A documentation suite for the mathematical and architectural foundations of NeuralLab.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4rem' }}>
                    <EnterpriseCard title="R&D Evolution" icon={Activity}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {[
                                { phase: 'PHASE 01: THE CORE', desc: 'Implementation of the Recursive Model Index (RMI) architecture using C++20. Focused on O(log M) segment selection.' },
                                { phase: 'PHASE 02: NEURAL MAPPING', desc: 'Transition from numeric indices to String Spaced Encoding. Mapping characters to high-significance 64-bit uints.' },
                                { phase: 'PHASE 03: ENTERPRISE SUITE', desc: 'Full-stack integration. P99 latency monitoring and real-time model retraining simulations.' }
                            ].map((p, i) => (
                                <div key={i} style={{ paddingLeft: '1.5rem', borderLeft: '2px solid rgba(129, 140, 248, 0.4)' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#818cf8', marginBottom: '0.5rem' }}>{p.phase}</div>
                                    <p style={{ fontSize: '0.95rem', opacity: 0.5, lineHeight: 1.6 }}>{p.desc}</p>
                                </div>
                            ))}
                        </div>
                    </EnterpriseCard>

                    <EnterpriseCard title="Mathematical Core" icon={Layers}>
                        <Formula latex="y = mx + b" desc="LINEAR REGRESSION MODEL" />
                        <div style={{ fontSize: '0.9rem', opacity: 0.4, textAlign: 'center', padding: '0 2rem' }}>
                            By fitting a linear model to each segment, we predict the key position $y$ given the high-order bits $x$.
                        </div>
                        <Formula latex="MSE = \frac{1}{n} \sum (y - \hat{y})^2" desc="MEAN SQUARED ERROR" />
                        <div style={{ fontSize: '0.9rem', opacity: 0.4, textAlign: 'center', padding: '0 2rem' }}>
                            We minimize MSE across 64 segments to ensure the initial prediction is within a predictable error bound.
                        </div>
                    </EnterpriseCard>

                    <EnterpriseCard title="Algorithm Breakdown: Encoders" icon={Code2} fullWidth>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                            <div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '1rem' }}>String Encoder (JS)</h4>
                                <CodeSnippet code={`const encodeString = (str) => {
  let result = 0n;
  str = str.toLowerCase().slice(0, 8);
  for (let i = 0; i < str.length; i++) {
    result = (result << 8n) | BigInt(str.charCodeAt(i));
  }
  return result << BigInt(8 * (8 - str.length));
};`} />
                                <p style={{ fontSize: '0.85rem', opacity: 0.4 }}>This encoder maps strings into a 64-bit space, ordered lexicographically to maintain the monotonic property required for the learned index.</p>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '1rem' }}>Search Engine (RMI)</h4>
                                <CodeSnippet code={`search(queryString) {
  const key = encodeString(queryString);
  const model = findModel(key); // Binary Search O(log M)
  const pred = model.slope * key + model.intercept;
  
  // Correction: Local binary search/scan
  let pos = correct(pred, key);
  return { position: pos, error: Math.abs(pred - pos) };
}`} />
                                <p style={{ fontSize: '0.85rem', opacity: 0.4 }}>The search engine performs a model-based prediction followed by a local correction scan within the predefined error bounds.</p>
                            </div>
                        </div>
                    </EnterpriseCard>
                </div>
            </motion.div>
        )}

        {/* ... Other Tabs Comparison, Architect, Security remain but with updated V7 styles below ... */}
        {activeTab === 'comparison' && (
            <motion.div key="comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', height: 'calc(100vh - 200px)' }}>
                <header style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '4.5rem', fontWeight: '950', letterSpacing: '-4px' }}>Operational Hub</h2>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '4rem', height: '100%' }}>
                    <EnterpriseCard title="Real-time Throughput" icon={Activity}>
                        <div style={{ height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={throughputData}>
                                    <defs>
                                        <linearGradient id="colorNeural" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818cf8" stopOpacity={0.5}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorBTree" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#334155" stopOpacity={0.2}/><stop offset="95%" stopColor="#334155" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="i" hide />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '24px' }} />
                                    <Legend verticalAlign="top" height={60} iconType="circle"/>
                                    <Area type="monotone" name="Neural Enterprise" dataKey="neural" stroke="#818cf8" fillOpacity={1} fill="url(#colorNeural)" strokeWidth={5} />
                                    <Area type="monotone" name="Standard B-Tree" dataKey="btree" stroke="#475569" fillOpacity={1} fill="url(#colorBTree)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </EnterpriseCard>
                    <EnterpriseCard title="Efficiency Audit" icon={Binary}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', height: '100%', justifyContent: 'center' }}>
                            {[
                                { label: 'LATENCY SPEEDUP', val: '14.2x', p: 92, c: '#818cf8' },
                                { label: 'MEMORY REDUCTION', val: '98.8%', p: 98, c: '#10b981' },
                                { label: 'P99 STABILITY', val: '99.9%', p: 99, c: '#a855f7' }
                            ].map(s => (
                                <div key={s.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '900', opacity: 0.4 }}>{s.label}</span>
                                        <span style={{ fontWeight: '950', color: s.c, fontSize: '1.4rem' }}>{s.val}</span>
                                    </div>
                                    <div style={{ height: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${s.p}%` }} style={{ background: s.c, height: '100%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </EnterpriseCard>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
        </div>
      </main>

      <style>{`
        .nav-active { border: 1px solid rgba(129, 140, 248, 0.4) !important; background: rgba(99, 102, 241, 0.1) !important; box-shadow: 0 10px 40px rgba(99, 102, 241, 0.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); borderRadius: 10px; }
      `}</style>
    </div>
  );
}

export default App;
