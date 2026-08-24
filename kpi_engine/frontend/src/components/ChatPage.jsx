import { useState, useRef, useEffect } from 'react';
import { usePersona } from '../context/PersonaContext';
import { sendChat, browseWeb } from '../api/client';
import { 
  Send, User, Bot, Loader2, Globe, Sparkles, 
  ExternalLink, BarChart2, TrendingUp, ShieldCheck, 
  ChevronRight, RefreshCw, Layers, ArrowUpRight, Zap, Search, Compass, BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

export default function ChatPage() {
  const { persona, role } = usePersona();
  const [activeTab, setActiveTab] = useState('assistant'); // 'assistant' or 'web_browser'
  
  // Chat Assistant State
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: `Hello! I am your Enterprise KPI Decision Assistant. I am operating under your ${persona.toUpperCase()} profile with live enterprise telemetry and real-time Web Search enabled out-of-the-box. Ask me about internal metric shifts, or ask me to search the web for industry benchmarks.`,
      suggestedChips: [
        "Why did revenue drop in East Region?",
        "Search web for latest SaaS conversion rate benchmarks 2026",
        "What is the 7-day revenue forecast?",
        "Search web for Stripe checkout error rate baselines"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [webAccessEnabled, setWebAccessEnabled] = useState(true);
  const messagesEndRef = useRef(null);

  // Live Web Browser State
  const [webQuery, setWebQuery] = useState('SaaS checkout error rate benchmark 2026');
  const [browserLoading, setBrowserLoading] = useState(false);
  const [webResults, setWebResults] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'assistant') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;
    
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChat(text, persona, role);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.response,
        sources: res.sources,
        chartPayload: res.chart_payload,
        actionPayload: res.action_payload,
        webInsights: res.web_insights,
        suggestedChips: res.suggested_chips,
        telemetry: res.telemetry
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleWebSearch = async (query = webQuery) => {
    if (!query.trim()) return;
    setBrowserLoading(true);
    try {
      const res = await browseWeb(query);
      setWebResults(res);
    } catch (err) {
      alert('Live web search error: ' + err.message);
    } finally {
      setBrowserLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden pb-2">
      
      {/* Chat Top Banner & View Switcher */}
      <div className="p-4 px-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              Decision Assistant & Market Intelligence
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} /> Live Web Grounded
              </span>
            </h2>
            <p className="text-[11px] text-slate-300">Deterministic Analytics + Live Web Search Index</p>
          </div>
        </div>

        {/* View Switcher Tabs & Persona Tag */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'assistant' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              💬 Assistant
            </button>
            <button
              onClick={() => {
                setActiveTab('web_browser');
                if (!webResults) handleWebSearch(webQuery);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                activeTab === 'web_browser' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={13} className="text-cyan-300" /> Live Web Browser
            </button>
          </div>

          <span className="text-xs bg-slate-800 border border-slate-700 text-indigo-300 px-3 py-1.5 rounded-xl uppercase font-bold tracking-wider">
            {persona}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ASSISTANT TAB VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'assistant' && (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                    <Bot size={18} className="text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] rounded-3xl p-5 shadow-xs space-y-4 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                  
                  {/* Embedded Chart Widget */}
                  {msg.chartPayload && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-3 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5"><BarChart2 size={14} className="text-indigo-600" /> {msg.chartPayload.title}</span>
                        <span className="text-[10px] text-slate-500 font-normal">Deterministic Data</span>
                      </div>

                      {msg.chartPayload.type === 'drivers_bar' && (
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={msg.chartPayload.data} layout="vertical" margin={{ left: 10, right: 20 }}>
                              <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
                              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Bar dataKey="contribution" fill="#4f46e5" radius={[0, 6, 6, 0]} name="Contribution %" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {msg.chartPayload.type === 'time_series_forecast' && (
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...msg.chartPayload.historical, ...msg.chartPayload.forecast]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                              <Tooltip />
                              <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 2 }} name="Revenue ($)" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Web Intelligence & Industry Benchmarks Card */}
                  {msg.webInsights && webAccessEnabled && (
                    <div className="bg-gradient-to-br from-cyan-50 to-indigo-50/50 p-4 rounded-2xl border border-cyan-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-cyan-900 flex items-center gap-1.5">
                          <Globe size={14} className="text-cyan-600" /> {msg.webInsights.topic}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                          {msg.webInsights.benchmark}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{msg.webInsights.summary}</p>
                      
                      {msg.webInsights.citations && (
                        <div className="pt-2 border-t border-cyan-200/50 flex items-center gap-2 flex-wrap text-[11px] text-cyan-800 font-medium">
                          <span className="text-slate-400">Sources:</span>
                          {msg.webInsights.citations.map((c, ci) => (
                            <a 
                              key={ci} 
                              href={c} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="bg-white/80 px-2 py-0.5 rounded-md border border-cyan-200 text-cyan-700 hover:text-cyan-900 flex items-center gap-1 text-[10px]"
                            >
                              <ExternalLink size={9} /> {c.replace('https://', '').replace('http://', '').split('/')[0]}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sources Chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Evidence:</span>
                        {msg.sources.map((src, idx) => (
                          <Link 
                            key={idx} 
                            to={`/case/East%20Region/2026-08-11?metric=revenue`} 
                            className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            <span>{src.ref}</span>
                            <ArrowUpRight size={12} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Chips */}
                  {msg.suggestedChips && (
                    <div className="pt-2 flex gap-1.5 flex-wrap">
                      {msg.suggestedChips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleSend(chip)}
                          className="text-xs bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-3 py-1.5 rounded-full border border-slate-200 transition-all font-medium flex items-center gap-1 text-left"
                        >
                          <span>{chip}</span>
                          <ChevronRight size={12} className="text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 shadow-md">
                    <User size={18} className="text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-none p-4 px-5 flex items-center gap-2.5 text-slate-600 shadow-xs text-sm">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  <span>Searching live web sources & running statistical inference...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Assistant Input Bar */}
          <div className="p-4 px-6 border-t border-slate-200 bg-white">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-3"
            >
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about KPI movements or type "search web for <topic>"...`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading}
                className="bg-indigo-600 text-white p-3 px-5 rounded-2xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold shadow-md flex items-center gap-2"
              >
                <span>Ask</span>
                <Send size={16} />
              </button>
            </form>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. LIVE WEB BROWSER TAB VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'web_browser' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          
          {/* Live Web URL / Query Search Bar */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Compass size={16} className="text-cyan-600" /> Live Web Search & Page Scraper
              </span>
              <span className="text-[11px] text-slate-400">Queries DuckDuckGo & Live HTTP Endpoints</span>
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleWebSearch(); }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  value={webQuery}
                  onChange={(e) => setWebQuery(e.target.value)}
                  placeholder="Enter any market query (e.g. SaaS churn benchmarks 2026, Stripe incident reports) or URL..."
                  className="w-full bg-slate-50 pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-cyan-500 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={browserLoading}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                {browserLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                <span>Fetch Live Web Intelligence</span>
              </button>
            </form>

            {/* Quick Query Pills */}
            <div className="flex gap-2 flex-wrap text-xs pt-1">
              <span className="text-slate-400 font-medium">Quick Benchmarks:</span>
              {[
                "SaaS conversion rate benchmark 2026",
                "E-commerce checkout failure rate standards",
                "Gartner cloud revenue growth index",
                "Payment gateway outage statistics"
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setWebQuery(q);
                    handleWebSearch(q);
                  }}
                  className="bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 text-slate-600 px-3 py-1 rounded-full text-[11px] border border-slate-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Web Search Results Display */}
          {browserLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Loader2 size={24} className="animate-spin text-cyan-600 mx-auto" />
              <p className="text-sm font-medium">Searching live web and extracting intelligence snippets...</p>
            </div>
          ) : webResults ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>Found live web intelligence for: <strong className="text-slate-800">"{webResults.query || webQuery}"</strong></span>
                <span className="text-cyan-700 font-bold">{webResults.results?.length || 1} Sources Retrieved</span>
              </div>

              {webResults.results ? (
                <div className="grid grid-cols-1 gap-4">
                  {webResults.results.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 hover:border-cyan-300 transition-all space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-slate-900 hover:text-cyan-600">
                          {item.title}
                        </h4>
                        <span className="text-[10px] bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded-full font-bold border border-cyan-200">
                          {item.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {item.snippet}
                      </p>
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1 truncate max-w-md"
                        >
                          <ExternalLink size={11} /> {item.url}
                        </a>
                        <button
                          onClick={() => {
                            setActiveTab('assistant');
                            handleSend(`Analyze our KPI performance against this web finding: "${item.snippet}"`);
                          }}
                          className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-cyan-600 transition-colors"
                        >
                          Analyze in Chat &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Page Summary View */
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-3">
                  <h4 className="font-bold text-base text-slate-900">{webResults.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{webResults.summary}</p>
                </div>
              )}
            </div>
          ) : null}

        </div>
      )}

    </div>
  );
}
