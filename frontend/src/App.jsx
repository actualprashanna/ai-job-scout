import React, { useState, useMemo } from 'react';

const QUICK_CATEGORIES = [
  { id: 'custom', label: '✨ Any Custom Role', icon: '🔍' },
  { id: 'trades', label: '🛠️ Trades & Labor', icon: '🛠️', defaultInput: 'Need urgent site electrician work with daily pay.', jobDesc: 'Licensed Electrician required for commercial fit-out. Must hold certifications and personal protective equipment.' },
  { id: 'healthcare', label: '🏥 Healthcare & Nursing', icon: '🏥', defaultInput: 'ICU Staff Nurse positions in London hospitals.', jobDesc: 'Registered Nurse (RN) for Intensive Care Unit. Requires NMC registration and 2+ years acute care experience.' },
  { id: 'tech', label: '💻 Software & Engineering', icon: '💻', defaultInput: 'Senior Full Stack Engineer working with React, Python, and AWS in London.', jobDesc: 'Senior Software Engineer to architect SaaS cloud applications using React, Python, PostgreSQL, and AWS.' },
  { id: 'education', label: '📚 Education & Teaching', icon: '📚', defaultInput: 'High school science teacher roles near Manchester.', jobDesc: 'Secondary School Physics & Chemistry Teacher required. Must hold Qualified Teacher Status (QTS).' },
  { id: 'hospitality', label: '🍳 Hospitality & Culinary', icon: '🍳', defaultInput: 'Head Chef required for fine dining restaurant.', jobDesc: 'Head Chef needed to lead kitchen staff, develop seasonal menus, and manage inventory control.' },
  { id: 'legal', label: '⚖️ Legal & Compliance', icon: '⚖️', defaultInput: 'In-house legal counsel for tech mergers and acquisitions.', jobDesc: 'Corporate Legal Counsel for M&A transactions. Bar admission required with 5+ years post-qualification experience.' },
  { id: 'executive', label: '💼 Executive Leadership', icon: '💼', defaultInput: 'VP of Operations or CEO role in growing tech startup.', jobDesc: 'Chief Executive Officer / VP of Operations to lead strategic expansion, financial planning, and cross-functional teams.' },
];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('custom');
  const [rawInput, setRawInput] = useState('Senior Software Developer');
  const [location, setLocation] = useState('London, UK');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingCV, setLoadingCV] = useState(false);

  // Backend response states
  const [searchResponse, setSearchResponse] = useState(null);
  const [cvResponse, setCvResponse] = useState(null);

  // File upload & Job description states
  const [cvFile, setCvFile] = useState(null);
  const [jobDescriptionText, setJobDescriptionText] = useState(
    'Enter or select a target job posting description here to test your PDF resume fit score.'
  );

  // Job Listing Interactive States
  const [savedJobs, setSavedJobs] = useState([]);
  const [resultFilter, setResultFilter] = useState('');
  const [activeDorkIndex, setActiveDorkIndex] = useState(0);
  const [copiedDork, setCopiedDork] = useState(false);
  const [viewTab, setViewTab] = useState('all'); // 'all' or 'saved'

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat.id);
    if (cat.defaultInput) {
      setRawInput(cat.defaultInput);
      setJobDescriptionText(cat.jobDesc);
    }
  };

  const handleInputChange = (text) => {
    setRawInput(text);
    if (selectedCategory !== 'custom') {
      setSelectedCategory('custom');
    }
  };

  const runJobSearch = async (overrideQuery = null) => {
    const queryToUse = overrideQuery || rawInput;
    if (!queryToUse.trim()) {
      alert('Please enter a job search term or select a category first.');
      return;
    }

    setLoadingSearch(true);
    setSearchResponse(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/search-jobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: queryToUse, location: location })
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      setSearchResponse(data);
      setActiveDorkIndex(0);
    } catch (err) {
      console.error('Search request failed:', err);
      alert('Failed to connect to backend server at http://127.0.0.1:8000/api/search-jobs/. Ensure Django is running on port 8000.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const runCvAnalysis = async () => {
    if (!cvFile) {
      alert('Please upload a PDF CV file first.');
      return;
    }
    if (!jobDescriptionText.trim()) {
      alert('Please provide a target job description context.');
      return;
    }

    setLoadingCV(true);
    setCvResponse(null);

    const formData = new FormData();
    formData.append('cv_file', cvFile);
    formData.append('job_description', jobDescriptionText);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/analyze-cv/', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      setCvResponse(data);
    } catch (err) {
      console.error('CV analysis failed:', err);
      alert('Failed to analyze CV. Ensure Django backend is running.');
    } finally {
      setLoadingCV(false);
    }
  };

  const toggleSaveJob = (job) => {
    setSavedJobs((prev) => {
      const exists = prev.some((j) => j.link === job.link);
      if (exists) {
        return prev.filter((j) => j.link !== job.link);
      } else {
        return [...prev, { ...job, savedAt: new Date().toLocaleTimeString() }];
      }
    });
  };

  const selectJobForCVMatch = (job) => {
    const formattedContext = `Job Title: ${job.title}\nSource Link: ${job.link}\nDescription Snippet: ${job.snippet}`;
    setJobDescriptionText(formattedContext);

    // Smooth scroll to CV module
    const cvSection = document.getElementById('cv-analyzer-module');
    if (cvSection) {
      cvSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedDork(true);
    setTimeout(() => setCopiedDork(false), 2000);
  };

  const extractDomain = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch (e) {
      return 'web';
    }
  };

  // Filtered Jobs Memo
  const displayedJobs = useMemo(() => {
    const sourceList = viewTab === 'saved' ? savedJobs : (searchResponse?.jobs || []);
    if (!resultFilter.trim()) return sourceList;
    return sourceList.filter(
      (j) =>
        j.title.toLowerCase().includes(resultFilter.toLowerCase()) ||
        j.snippet.toLowerCase().includes(resultFilter.toLowerCase())
    );
  }, [searchResponse, savedJobs, viewTab, resultFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">

        { }
        <header className="text-center space-y-3 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 bg-blue-950/80 text-blue-400 border border-blue-800/80 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-inner">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Universal Gemini AI Search Infrastructure
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            AI Job Scout <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">V2</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto font-normal">
            Search for <strong className="text-slate-200">any role worldwide</strong> — with automated Gemini search dorking, direct job-to-CV fit matching, and bookmarked listings.
          </p>
        </header>

        { }
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Module 01: Universal Search Input */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/20">01</span>
                  <h2 className="text-xl font-bold text-white">Universal Search Input</h2>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  {selectedCategory === 'custom' ? 'Free-Form Search' : 'Category Preset'}
                </span>
              </div>

              {/* Quick Category Chips */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Category Quick Shortcuts
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg transition-all duration-150 font-medium cursor-pointer ${selectedCategory === cat.id
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40 border border-blue-400'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free-text Raw Search Input */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Search Query / Role Description
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Senior React Developer, Site Electrician, ICU Nurse, Head Chef..."
                  value={rawInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* Target Location */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Target Location / Work Style
                </label>
                <input
                  type="text"
                  placeholder="e.g. Remote, London, New York, Nationwide"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              onClick={() => runJobSearch()}
              disabled={loadingSearch}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-blue-950/50 disabled:opacity-50 cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loadingSearch ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Executing Gemini Dorking...
                </>
              ) : (
                '🔍 Run Universal AI Search'
              )}
            </button>
          </div>

          {/* Module 02: AI Dork Transformation Overview */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">02</span>
                  <h2 className="text-xl font-bold text-white">Gemini Dork Engine</h2>
                </div>
                {searchResponse && (
                  <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full font-bold">
                    {searchResponse.results_count} Live Hits
                  </span>
                )}
              </div>

              {searchResponse ? (
                <div className="space-y-3 text-xs">
                  {/* Profession Badge */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider block mb-1">Detected Domain</span>
                    <span className="text-emerald-400 font-semibold text-sm">{searchResponse.transformation?.detected_profession}</span>
                  </div>

                  {/* Primary Google Dork Query */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 relative group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Active Search Dork</span>
                      <button
                        onClick={() => copyToClipboard(searchResponse.dork_used)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase underline cursor-pointer"
                      >
                        {copiedDork ? '✓ Copied!' : 'Copy Dork'}
                      </button>
                    </div>
                    <span className="text-blue-400 font-mono text-[11px] break-all block">{searchResponse.dork_used}</span>
                  </div>

                  {/* Alternative Generated Dorks */}
                  {searchResponse.transformation?.search_dorks?.length > 1 && (
                    <div>
                      <span className="text-slate-400 font-bold block mb-1.5 text-[11px]">Alternative Dork Strategies:</span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {searchResponse.transformation.search_dorks.map((dork, i) => (
                          <div
                            key={i}
                            onClick={() => copyToClipboard(dork)}
                            className="p-2 bg-slate-950/70 hover:bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 cursor-pointer transition flex items-center justify-between"
                          >
                            <span className="truncate pr-2">{dork}</span>
                            <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">Click Copy</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-center p-6 space-y-2">
                  <div className="p-3 bg-slate-800/50 rounded-full text-2xl">🌐</div>
                  <p className="text-slate-400 text-sm font-medium">Ready to Search</p>
                  <p className="text-slate-500 text-xs max-w-xs">Enter any query and click <strong>"Run Universal AI Search"</strong> to populate live dorks and results.</p>
                </div>
              )}
            </div>
          </div>

          {/* Module 03: CV Fit Analyzer */}
          <div id="cv-analyzer-module" className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-bold border border-purple-500/20">03</span>
                <h2 className="text-xl font-bold text-white">CV Fit Analyzer</h2>
              </div>

              {/* File Upload Input */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Upload Candidate PDF CV
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCvFile(e.target.files[0])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-950 file:text-purple-300 hover:file:bg-purple-900 cursor-pointer"
                />
              </div>

              {/* Target Job Context Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Target Job Description Context
                  </label>
                  <span className="text-[10px] text-purple-400">Synced from Job Card</span>
                </div>
                <textarea
                  rows="3"
                  value={jobDescriptionText}
                  onChange={(e) => setJobDescriptionText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* CV Analysis Output */}
              {cvResponse ? (
                <div className="space-y-3 pt-2">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 text-center shadow-inner">
                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      {cvResponse.fit_percentage}%
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Match Confidence</p>
                  </div>

                  <div className="space-y-2 text-xs max-h-36 overflow-y-auto pr-1">
                    {cvResponse.strengths?.length > 0 && (
                      <div>
                        <span className="font-bold text-emerald-400 block mb-1">Key Strengths:</span>
                        <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1">
                          {cvResponse.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}

                    {cvResponse.gaps?.length > 0 && (
                      <div className="mt-2">
                        <span className="font-bold text-amber-400 block mb-1">Identified Gaps:</span>
                        <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1">
                          {cvResponse.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              onClick={runCvAnalysis}
              disabled={loadingCV || !cvFile}
              className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-purple-950/50 disabled:opacity-40 cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loadingCV ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing PDF & Scoring Fit...
                </>
              ) : (
                '📄 Analyze PDF CV Match'
              )}
            </button>
          </div>

        </div>

        { }
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">

          {/* Section Header & Tab Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">Live Searched Job Listings</h2>
                <span className="bg-blue-950 text-blue-400 border border-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {displayedJobs.length} {viewTab === 'saved' ? 'Bookmarked' : 'Found'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Explore real-time web listings extracted by Gemini. Click <strong>"Analyze Match with CV"</strong> to feed any job card into Module 03.
              </p>
            </div>

            {/* Filter Input & Tab Switches */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Filter listed jobs by keyword..."
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-full sm:w-60"
              />

              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setViewTab('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${viewTab === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  All Results ({searchResponse?.jobs?.length || 0})
                </button>
                <button
                  onClick={() => setViewTab('saved')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${viewTab === 'saved'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  ⭐ Bookmarked ({savedJobs.length})
                </button>
              </div>
            </div>
          </div>

          {/* Job Listings Grid */}
          {displayedJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedJobs.map((job, idx) => {
                const isSaved = savedJobs.some((j) => j.link === job.link);
                const domain = extractDomain(job.link);

                return (
                  <div
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-xl group relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      {/* Card Header Badges */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 font-mono tracking-wider">
                          🌐 {domain}
                        </span>

                        <button
                          onClick={() => toggleSaveJob(job)}
                          className={`text-sm p-1.5 rounded-lg border transition cursor-pointer ${isSaved
                              ? 'bg-amber-950/80 text-amber-400 border-amber-700/80'
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-amber-400'
                            }`}
                          title={isSaved ? 'Remove Bookmark' : 'Save Job'}
                        >
                          {isSaved ? '⭐ Saved' : '☆ Save'}
                        </button>
                      </div>

                      {/* Job Title */}
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-bold text-blue-400 hover:text-blue-300 transition line-clamp-2 block leading-snug group-hover:underline"
                      >
                        {job.title}
                      </a>

                      {/* Snippet Description */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {job.snippet}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 mt-4 border-t border-slate-900/80 flex items-center gap-2">
                      <button
                        onClick={() => selectJobForCVMatch(job)}
                        className="flex-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60 font-bold py-2 px-3 rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        🎯 Analyze Match with CV
                      </button>

                      <a
                        href={job.link}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center"
                      >
                        Apply ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
              <div className="text-4xl">📋</div>
              <h3 className="text-lg font-bold text-slate-300">
                {viewTab === 'saved' ? 'No Bookmarked Jobs Yet' : 'No Searched Jobs Displayed'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {viewTab === 'saved'
                  ? 'Click "☆ Save" on any job card to bookmark listings for later evaluation.'
                  : 'Enter any query in Module 01 and click "Run Universal AI Search" to populate live listings here.'}
              </p>
            </div>
          )}

        </section>

      </div>
    </div>
  );
}