import React, { useState, useEffect, useMemo } from 'react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // App State
  const [appMode, setAppMode] = useState('auto_scout');
  const [userPrompt, setUserPrompt] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [savedCvName, setSavedCvName] = useState('');

  // Dashboard Data
  const [scoutData, setScoutData] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [viewTab, setViewTab] = useState('all');
  const [isScouting, setIsScouting] = useState(false);
  const [jdText, setJdText] = useState('');
  const [manualMatchData, setManualMatchData] = useState(null);
  const [isManualAnalyzing, setIsManualAnalyzing] = useState(false);

  const getHeaders = () => ({ 'Authorization': `Token ${token}` });

  useEffect(() => {
    if (token) {
      fetch('http://127.0.0.1:8000/api/profile/', { headers: getHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.user_prompt) setUserPrompt(data.user_prompt);
          if (data.cv_name) setSavedCvName(data.cv_name);
        }).catch(e => console.error("Sync error", e));
    }
  }, [token]);

  const savePreferences = async (prompt, file = null) => {
    if (!token) return;
    const formData = new FormData();
    if (prompt) formData.append('raw_input', prompt);
    if (file) formData.append('cv_file', file);
    await fetch('http://127.0.0.1:8000/api/profile/', {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}` },
      body: formData
    });
  };

  const removeCv = async () => {
    try {
        const res = await fetch('http://127.0.0.1:8000/api/profile/', {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (res.ok) {
            setCvFile(null);
            setSavedCvName('');
        }
    } catch (e) { console.error("Delete failed", e); }
  };

  const handleAuth = async () => {
    const endpoint = isRegistering ? 'register/' : 'login/';
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);
        setToken(data.token);
      } else { alert(data.error || 'Auth failed'); }
    } catch (err) { alert('Network error'); }
  };

  const runAutoScout = async () => {
    if (!cvFile && !savedCvName) return alert("Upload a resume first.");
    setIsScouting(true);
    await savePreferences(userPrompt, cvFile);
    const formData = new FormData();
    if (cvFile) formData.append('cv_file', cvFile);
    formData.append('raw_input', userPrompt);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auto-scout/', { method: 'POST', headers: getHeaders(), body: formData });
      setScoutData(await res.json());
    } catch (err) { alert('Scout failed'); } finally { setIsScouting(false); }
  };

  const runDirectMatch = async () => {
    if (!cvFile && !savedCvName) return alert("Please upload a CV to analyze.");
    setIsManualAnalyzing(true);
    const formData = new FormData();
    if (cvFile) formData.append('cv_file', cvFile);
    formData.append('job_description', jdText);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/analyze-cv/', { method: 'POST', headers: getHeaders(), body: formData });
      const data = await res.json();
      setManualMatchData(data);
    } catch (err) { alert('Analysis failed'); } finally { setIsManualAnalyzing(false); }
  };

  const renderCvUpload = () => (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resume Document</label>
      {savedCvName || cvFile ? (
        <div className="flex justify-between items-center p-3 bg-[#0f172a] rounded-xl border border-slate-700">
          <span className="text-sm font-medium text-blue-400 truncate">📄 {cvFile ? cvFile.name : savedCvName}</span>
          <button onClick={removeCv} className="text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
            <span className="text-sm text-slate-500">Upload PDF Resume</span>
            <input type="file" className="hidden" accept=".pdf" onChange={(e) => setCvFile(e.target.files[0])} />
        </label>
      )}
    </div>
  );

  if (!token) return (
    <div className="min-h-screen bg-[#0b101d] flex items-center justify-center p-6">
      <div className="bg-[#131b2e] border border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
        <h1 className="text-xl font-bold text-white mb-6 text-center">AI Job Scout <span className="text-purple-500">Pro</span></h1>
        <div className="space-y-4">
            <input className="w-full bg-[#0b101d] p-3 rounded-lg border border-slate-700 text-white outline-none focus:border-purple-500" placeholder="Username" onChange={e => setUsername(e.target.value)} />
            <input type="password" className="w-full bg-[#0b101d] p-3 rounded-lg border border-slate-700 text-white outline-none focus:border-purple-500" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button onClick={handleAuth} className="w-full bg-purple-600 py-3 rounded-lg font-bold hover:bg-purple-500 transition-all cursor-pointer">
                {isRegistering ? 'Create Account' : 'Login'}
            </button>
            <p className="text-center text-xs text-slate-400 cursor-pointer hover:text-white" onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b101d] text-slate-200">
      <nav className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-lg text-white tracking-tight">AI Job Scout Pro</h1>
        <div className="flex gap-2">
            <button onClick={() => setAppMode('auto_scout')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${appMode === 'auto_scout' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-400 hover:text-white'}`}>Scout Engine</button>
            <button onClick={() => setAppMode('direct_match')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${appMode === 'direct_match' ? 'bg-purple-600 text-white' : 'bg-transparent text-slate-400 hover:text-white'}`}>CV Analyzer</button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="ml-4 px-4 py-1.5 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50">Logout</button>
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="bg-[#131b2e] p-6 rounded-2xl border border-slate-800 space-y-6">
            {renderCvUpload()}
            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Search Context</label>
                <textarea 
                    value={userPrompt} 
                    onChange={e => setUserPrompt(e.target.value)} 
                    className="w-full h-40 bg-[#0b101d] p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none" 
                    placeholder="E.g., Senior Python developer in London..." 
                />
            </div>
            <button onClick={runAutoScout} className="w-full bg-blue-600 py-3 rounded-xl font-bold text-white hover:bg-blue-500 transition cursor-pointer">
                {isScouting ? 'Searching...' : 'Run Search'}
            </button>
        </aside>

        <section className="lg:col-span-2 bg-[#131b2e] p-6 rounded-2xl border border-slate-800">
            {appMode === 'auto_scout' ? (
                <div>
                    <h2 className="font-bold text-lg mb-6">Discovery Feed</h2>
                    {scoutData?.jobs ? (
                        <div className="grid gap-4">
                            {scoutData.jobs.map((j, i) => (
                                <div key={i} className="p-4 bg-[#0b101d] rounded-xl border border-slate-800 hover:border-slate-600 transition">
                                    <h3 className="font-bold text-white">{j.title}</h3>
                                    <p className="text-xs text-slate-400 mt-1">{j.snippet}</p>
                                    <div className="mt-3 flex gap-2">
                                        <a href={j.link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">View Source</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-600 italic">No search results yet.</div>
                    )}
                </div>
            ) : (
                <div>
                    <h2 className="font-bold text-lg mb-6">Fit Analysis</h2>
                    <textarea value={jdText} onChange={e => setJdText(e.target.value)} className="w-full h-32 bg-[#0b101d] p-4 rounded-xl border border-slate-700 focus:border-purple-500 outline-none" placeholder="Paste JD..." />
                    <button onClick={runDirectMatch} className="w-full mt-4 bg-purple-600 py-3 rounded-xl font-bold text-white hover:bg-purple-500 transition cursor-pointer">
                        {isManualAnalyzing ? 'Calculating...' : 'Analyze Fit Score'}
                    </button>
                    {manualMatchData && (
                        <div className="mt-8 p-6 bg-[#0b101d] rounded-xl border border-purple-500/30">
                            <h3 className="text-3xl font-black text-purple-400">{manualMatchData.fit_percentage}% Match</h3>
                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <div><p className="font-bold text-emerald-400">Strengths</p><ul className="list-disc ml-4">{manualMatchData.strengths?.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                <div><p className="font-bold text-amber-400">Gaps</p><ul className="list-disc ml-4">{manualMatchData.gaps?.map((g,i) => <li key={i}>{g}</li>)}</ul></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
      </main>
    </div>
  );
}
