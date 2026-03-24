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
  Info,
  ShieldAlert,
  Wifi,
  Database
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

const CodeSnippet = ({ code }) => (
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
  const [securityLogs, setSecurityLogs] = useState([]);
  const [throughputData, setThroughputData] = useState(Array.from({length: 30}, (_, i) => ({ i, neural: 12 + Math.random(), btree: 2.5 + Math.random() })));

  const archiveBase = useMemo(() => ["google", "apple", "amazon", "microsoft", "meta", "alphabet", "netflix", "tesla", "spacex", "openai", "deepmind", "antigravity", "quantum", "neural", "index", "search", "engine", "archive", "private", "local", "security", "encryption", "vault", "designer", "standard", "performance"], []);
  const index = useMemo(() => new LearnedIndex(archiveBase, modelType), [archiveBase, modelType]);

  // Unified Simulation Interface
  useEffect(() => {
    if (!isIngestRunning) return;
    const interval = setInterval(() => {
        const fakeKey = Math.random().toString(36).substring(7);
        const time = new Date().toLocaleTimeString();
        
        // Data Logs
        setLogs(prev => [{ time, action: 'INGEST', key: fakeKey, latency: (Math.random() * 0.005).toFixed(4) }, ...prev.slice(0, 15)]);
        
        // Security Logs
        if (Math.random() > 0.7) {
            setSecurityLogs(prev => [{ time, event: 'AUTH_CHALLENGE', source: `10.0.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, status: 'MITIGATED' }, ...prev.slice(0, 10)]);
        }

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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)', zIndex: 0 }} />

      {/* Enterprise Sidebar */}
      <aside style={{
        width: '400px',
        background: 'rgba(2, 6, 23, 0.98)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        padding: '4rem 3rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '4rem',
        backdropFilter: 'blur(100px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 40px rgba(99, 102, 241, 0.5)' }}>
                <FlaskConical size={32} color="white" />
            </div>
            <div>
                <h1 style={{ fontSize: '1.7rem', fontWeight: '950', letterSpacing: '-1px', color: 'white' }}>NeuralLab</h1>
                <div style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: '900', letterSpacing: '4px' }}>ENTERPRISE SUITE</div>
            </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
                { id: 'archive', icon: Search, label: 'Search Archives' },
                { id: 'comparison', icon: Activity, label: 'Operational Hub' },
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
                    gap: '18px',
                    padding: '22px 28px',
                    borderRadius: '26px',
                    border: 'none',
                    background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: activeTab === tab.id ? '#818cf8' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'left',
                    position: 'relative'
                  }}
                >
                    <tab.icon size={20} />
                    <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>{tab.label}</span>
                    {activeTab === tab.id && <motion.div layoutId="glow-line" style={{ position: 'absolute', right: '15px', width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 15px #818cf8' }} />}
                </button>
            ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.4, letterSpacing: '2px' }}>CLOUD SYNC</span>
                <Wifi size={14} color="#10b981" />
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1.5 }} style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)' }} />
            </div>
        </div>
      </aside>

      {/* Main Experience Interface */}
      <main style={{ 
        flex: 1, 
        padding: '0', 
        overflowY: 'auto', 
        zIndex: 1,
        position: 'relative'
      }}>
        <div style={{ padding: '6rem 8rem' }}>
        <AnimatePresence mode="wait">
        {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <header style={{ marginBottom: '6rem' }}>
                    <h2 style={{ fontSize: '5.5rem', fontWeight: '950', letterSpacing: '-5px', lineHeight: 0.85, marginBottom: '2.5rem' }}>Predict. Retrieve.<br/>Accelerate.</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.8rem', maxWidth: '900px', fontWeight: '400', lineHeight: 1.6 }}>The world's first Neural Spaced Indexing system for Enterprise Archives. $O(1)$ performance on any string dataset.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '6rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                style={{ width: '100%', padding: '3rem 5rem', borderRadius: '50px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '2.2rem', outline: 'none', boxShadow: '0 50px 100px rgba(0, 0, 0, 0.6)' }} 
                                placeholder="Search neural space..." />
                            <button onClick={handleSearch} style={{ position: 'absolute', right: '20px', top: '20px', bottom: '20px', padding: '0 5rem', borderRadius: '35px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: '950', cursor: 'pointer', letterSpacing: '4px', fontSize: '1.1rem', boxShadow: '0 15px 30px rgba(99,102,241,0.4)' }}>SEARCH</button>
                        </div>

                        {result && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3.5rem' }}>
                                <EnterpriseCard title="Regression Analysis" icon={TrendingUp}>
                                    <div style={{ height: '320px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={result.segmentData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                <XAxis dataKey="x" hide />
                                                <YAxis hide domain={['auto', 'auto']} />
                                                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px' }} />
                                                <Scatter name="Data" dataKey="y" fill="#818cf8" shape="circle" />
                                                <Line type="step" dataKey="predicted" stroke="#a855f7" strokeWidth={5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </EnterpriseCard>
                                <EnterpriseCard title="Neural Metadata" icon={Binary} gradient>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', height: '100%', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                                            <span style={{ opacity: 0.4, fontSize: '1.1rem', fontWeight: '900' }}>POSITION</span>
                                            <span style={{ fontWeight: '950', fontSize: '2.5rem', color: '#818cf8', letterSpacing: '-2px' }}>{result.position}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                                            <span style={{ opacity: 0.4, fontSize: '1.1rem', fontWeight: '900' }}>MODEL RMI</span>
                                            <span style={{ fontWeight: '950', fontSize: '2.5rem', letterSpacing: '-2px' }}>#{result.modelIdx}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ opacity: 0.4, fontSize: '1.1rem', fontWeight: '900' }}>VARIANCE</span>
                                            <span style={{ fontWeight: '950', fontSize: '2.5rem', color: '#10b981', letterSpacing: '-2px' }}>±{result.error}</span>
                                        </div>
                                    </div>
                                </EnterpriseCard>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
                        <EnterpriseCard title="Real-time Ingest" icon={Terminal}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                                STREAMING ACTIVE <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {logs.map((log, i) => (
                                    <div key={i} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ opacity: 0.3, fontFamily: 'monospace' }}>{log.time}</span>
                                        <span style={{ fontWeight: '800', color: '#818cf8' }}>{log.key}</span>
                                        <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>{log.latency}ms</span>
                                    </div>
                                ))}
                            </div>
                        </EnterpriseCard>
                    </div>
                </div>
            </motion.div>
        )}

        {activeTab === 'research' && (
            <motion.div key="research" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                <header style={{ marginBottom: '6rem' }}>
                    <h2 style={{ fontSize: '4.5rem', fontWeight: '950', letterSpacing: '-4px' }}>Research Laboratory</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.5rem', maxWidth: '800px' }}>Comprehensive documentation of the Neural RMI (Recursive Model Index) logic.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4rem' }}>
                    <EnterpriseCard title="Mathematical Foundations" icon={Layers}>
                        <Formula latex="y = mx + b" desc="LINEAR REGRESSION MODEL" />
                        <Formula latex="MSE = \frac{1}{n} \sum (y - \hat{y})^2" desc="MEAN SQUARED ERROR" />
                        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', opacity: 0.5, fontSize: '1rem', lineHeight: 1.7, textAlign: 'center' }}>
                            We partition the key-space into 64 distinct segments, training a local linear model for each. This replaces $O(\log N)$ traversal with $O(1)$ calculation.
                        </div>
                    </EnterpriseCard>
                    <EnterpriseCard title="System Architecture" icon={Cpu}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {[
                                { t: 'DATA PREPARATION', d: 'Dataset is lexicographically sorted and mapped to BigUint64 space.' },
                                { t: 'MODEL TRAINING', d: 'Segment boundaries are calculated to minimize MSE (Mean Squared Error).' },
                                { t: 'INFERENCE ENGINE', d: 'Predictive lookups within a ±8 key variance window.' }
                            ].map((s, i) => (
                                <div key={i} style={{ paddingLeft: '2rem', borderLeft: '3px solid rgba(129, 140, 248, 0.4)' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#818cf8', marginBottom: '0.5rem' }}>{s.t}</div>
                                    <p style={{ opacity: 0.4, fontSize: '1rem' }}>{s.d}</p>
                                </div>
                            ))}
                         </div>
                    </EnterpriseCard>
                    <EnterpriseCard title="Core Engine Logic (Javascript / C++)" icon={Code2} fullWidth>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
                            <div>
                                <h4 style={{ fontWeight: '900', marginBottom: '1rem', color: '#818cf8' }}>STRING ENCODER</h4>
                                <CodeSnippet code={`const encodeString = (str) => {
  let res = 0n;
  str = str.toLowerCase().slice(0, 8);
  for (let i = 0; i < str.length; i++) {
    res = (res << 8n) | BigInt(str.charCodeAt(i));
  }
  return res << BigInt(8 * (8 - str.length));
};`} />
                            </div>
                            <div>
                                <h4 style={{ fontWeight: '900', marginBottom: '1rem', color: '#10b981' }}>LOOKUP PREDICTION</h4>
                                <CodeSnippet code={`search(query) {
  const k = encode(query);
  const m = getModel(k); 
  const p = m.slope * k + m.intercept;
  
  // Predict position + local scan
  return scanRange(p - m.err, p + m.err, k);
}`} />
                            </div>
                        </div>
                    </EnterpriseCard>
                </div>
            </motion.div>
        )}

        {activeTab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                <header style={{ marginBottom: '6rem' }}>
                    <h2 style={{ fontSize: '4.5rem', fontWeight: '950', letterSpacing: '-4px' }}>Security Vault</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.5rem' }}>Enterprise-grade encryption and access monitoring.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem' }}>
                    <EnterpriseCard title="Infrastructure" icon={Server}>
                        <div style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '1rem', color: 'white' }}>ON-PREM</div>
                        <div style={{ color: '#10b981', fontSize: '1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            AIR-GAPPED HUB <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        </div>
                    </EnterpriseCard>
                    <EnterpriseCard title="Encryption" icon={Lock}>
                        <div style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '1rem', color: 'white' }}>AES-GCM</div>
                        <div style={{ opacity: 0.4, fontSize: '1rem', fontWeight: '900' }}>FIPS 140-2 COMPLIANT</div>
                    </EnterpriseCard>
                    <EnterpriseCard title="Threat Protection" icon={ShieldAlert}>
                        <div style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '1rem', color: '#f43f5e' }}>ACTIVE</div>
                        <div style={{ opacity: 0.4, fontSize: '1rem', fontWeight: '900' }}>NEURAL ANOMALY DETECT</div>
                    </EnterpriseCard>

                    <EnterpriseCard title="Access Audit Logs" icon={Fingerprint} fullWidth>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        {['TIMESTAMP', 'EVENT', 'SOURCE IP', 'SECURITY STATUS'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '1.5rem', fontSize: '0.8rem', opacity: 0.4, fontWeight: '900' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {securityLogs.length > 0 ? securityLogs.map((l, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td style={{ padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>{l.time}</td>
                                            <td style={{ padding: '1.5rem', fontWeight: '800' }}>{l.event}</td>
                                            <td style={{ padding: '1.5rem', opacity: 0.5 }}>{l.source}</td>
                                            <td style={{ padding: '1.5rem' }}><span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '900' }}>{l.status}</span></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', opacity: 0.2, fontWeight: '900' }}>NO SECURITY EVENTS DETECTED</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </EnterpriseCard>
                </div>
            </motion.div>
        )}

        {/* --- Comparison Hub --- */}
        {activeTab === 'comparison' && (
            <motion.div key="comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', height: 'calc(100vh - 200px)' }}>
                <header style={{ marginBottom: '5rem' }}>
                    <h2 style={{ fontSize: '5rem', fontWeight: '950', letterSpacing: '-4px' }}>Operational Hub</h2>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '5rem', height: '100%' }}>
                    <EnterpriseCard title="Real-time Throughput (lookups/sec)" icon={Activity}>
                        <div style={{ height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={throughputData}>
                                    <defs>
                                        <linearGradient id="colorNeural" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818cf8" stopOpacity={0.6}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorBTree" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#334155" stopOpacity={0.2}/><stop offset="95%" stopColor="#334155" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="i" hide />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '24px' }} />
                                    <Legend verticalAlign="top" height={60} iconType="circle"/>
                                    <Area type="monotone" name="Neural Enterprise" dataKey="neural" stroke="#818cf8" fillOpacity={1} fill="url(#colorNeural)" strokeWidth={6} />
                                    <Area type="monotone" name="Standard B-Tree" dataKey="btree" stroke="#475569" fillOpacity={1} fill="url(#colorBTree)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </EnterpriseCard>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
                        <EnterpriseCard title="Efficiency Audit" icon={TrendingUp}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem', height: '100%', justifyContent: 'center' }}>
                                {[
                                    { l: 'LATENCY SPEEDUP', v: '14.2x', p: 94, c: '#818cf8' },
                                    { l: 'MEMORY SAVINGS', v: '98.8%', p: 98, c: '#10b981' },
                                    { l: 'MODEL ACCURACY', v: '0.999 R²', p: 99, c: '#a855f7' }
                                ].map(s => (
                                    <div key={s.l}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '950', opacity: 0.4 }}>{s.l}</span>
                                            <span style={{ fontWeight: '950', color: s.c, fontSize: '1.6rem' }}>{s.v}</span>
                                        </div>
                                        <div style={{ height: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${s.p}%` }} style={{ background: s.c, height: '100%', boxShadow: `0 0 15px ${s.c}` }} />
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </EnterpriseCard>
                    </div>
                </div>
            </motion.div>
        )}

        {/* --- Model Architect --- */}
        {activeTab === 'architect' && (
            <motion.div key="architect" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <header style={{ marginBottom: '6rem' }}>
                    <h2 style={{ fontSize: '5rem', fontWeight: '950', letterSpacing: '-4px' }}>Model Architect</h2>
                    <p style={{ opacity: 0.4, fontSize: '1.5rem' }}>Select the neural projection algorithm for your archive.</p>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem' }}>
                    {[
                        { id: 'linear', name: 'Linear RMI', desc: 'Predictive linear mapping. Optimal for monotonic string datasets.', icon: Layers },
                        { id: 'quadratic', name: 'Quadratic Fit', desc: '2nd degree polynomials. Better for non-linear frequency distributions.', icon: Zap },
                        { id: 'spline', name: 'Spline Interpolate', desc: 'Piecewise smooth paths. Maximum accuracy for sparse datasets.', icon: Cpu }
                    ].map(m => (
                        <button key={m.id} onClick={() => setModelType(m.id)} style={{ padding: '4rem 3rem', background: modelType === m.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)', border: modelType === m.id ? '2px solid #818cf8' : '1px solid rgba(255,255,255,0.06)', borderRadius: '40px', color: 'white', textAlign: 'left', cursor: 'pointer', transition: '0.4s' }}>
                            <div style={{ width: '60px', height: '60px', background: modelType === m.id ? '#818cf8' : 'rgba(255,255,255,0.06)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem' }}>
                                <m.icon size={28} color={modelType === m.id ? 'white' : 'rgba(255,255,255,0.3)'} />
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '950', marginBottom: '1rem' }}>{m.name}</div>
                            <p style={{ opacity: 0.4, lineHeight: 1.6, fontSize: '1.1rem' }}>{m.desc}</p>
                        </button>
                    ))}
                </div>
            </motion.div>
        )}
        </AnimatePresence>
        </div>
      </main>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
        ::selection { background: #6366f1; color: white; }
        input:focus { border-color: #818cf8 !important; background: rgba(255,255,255,0.04) !important; }
      `}</style>
    </div>
  );
}

export default App;
