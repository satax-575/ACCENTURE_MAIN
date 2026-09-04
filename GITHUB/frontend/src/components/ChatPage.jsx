import { useState, useRef, useEffect, useCallback } from 'react';
import { usePersona } from '../context/PersonaContext';
import { sendChat, browseWeb } from '../api/client';
import {
  Send, User, Bot, Loader2, Globe, Sparkles,
  ExternalLink, BarChart2, TrendingUp, ShieldCheck,
  ChevronRight, BarChart3, ArrowUpRight, Zap, Search, BookOpen,
  AlertTriangle, CheckCircle, Database, Brain, FileCode2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
  ReferenceLine,
} from 'recharts';

// Render markdown-like bold (**text**) and bullet lists in message text
function renderMessageContent(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;

    // Bullet lines
    if (line.startsWith('• ') || line.startsWith('- ')) {
      const content = line.slice(2);
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} className="flex items-start gap-2 mt-1">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
          <span className="leading-relaxed">
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j}>{p.slice(2,-2)}</strong>
                : p
            )}
          </span>
        </div>
      );
    }

    // Normal line with bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="leading-relaxed">
        {parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j}>{p.slice(2,-2)}</strong>
            : p
        )}
      </p>
    );
  });
}

function DriverBarChart({ data }) {
  if (!data?.length) return null;
  return (
    <div className="mt-3 bg-slate-50 rounded-2xl p-3 border border-slate-200">
      <div className="text-xs font-semibold text-slate-600 mb-2">Driver Contributions</div>
      <ResponsiveContainer width="100%" height={data.length * 44 + 20}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} width={130} />
          <Tooltip
            formatter={(v, name) => [`${v}%`, 'Contribution']}
            contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="contribution" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ForecastChart({ historical, forecast }) {
  const combined = [
    ...(historical || []).map(p => ({ date: p.date, actual: p.value })),
    ...(forecast || []).map(p => ({
      date: p.date,
      forecast: p.value,
      lower: p.lower,
      upper: p.upper,
    })),
  ];
  if (!combined.length) return null;

  return (
    <div className="mt-3 bg-slate-50 rounded-2xl p-3 border border-slate-200">
      <div className="text-xs font-semibold text-slate-600 mb-2">Revenue Forecast</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={combined} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0' }} />
          <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} dot={false} name="Actual" />
          <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Forecast" />
          <Line type="monotone" dataKey="upper" stroke="#10b981" strokeWidth={1} strokeOpacity={0.3} dot={false} name="Upper CI" />
          <Line type="monotone" dataKey="lower" stroke="#10b981" strokeWidth={1} strokeOpacity={0.3} dot={false} name="Lower CI" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function WebInsightCard({ insight }) {
  if (!insight) return null;
  return (
    <div className="mt-3 p-3 bg-blue-50/60 border border-blue-200 rounded-2xl">
      <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs mb-1">
        <Globe size={12} />
        {insight.topic}
        {insight.source_type === 'live_web' && (
          <span className="px-1.5 py-0.5 bg-blue-100 rounded-full text-[9px] font-bold ml-auto">LIVE</span>
        )}
        {insight.source_type === 'curated' && (
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold ml-auto">CURATED</span>
        )}
      </div>
      <div className="text-[11px] font-bold text-blue-800 mb-1">Benchmark: {insight.benchmark}</div>
      <p className="text-[11px] text-blue-700 leading-relaxed">{insight.summary}</p>
      {insight.citations?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {insight.citations.slice(0, 3).map((c, i) => (
            <span key={i} className="text-[10px] bg-white border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded-lg font-medium">
              {typeof c === 'string' && c.startsWith('http')
                ? <a href={c} target="_blank" rel="noreferrer" className="hover:underline">Source {i+1} ↗</a>
                : c
              }
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionSuggestions({ actions }) {
  if (!actions?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold text-slate-600">Recommended Actions</div>
      {actions.slice(0, 2).map((a, i) => (
        <div key={i} className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px]">
          <div className="font-semibold text-emerald-800">{a.driver} → {a.lever}</div>
          <div className="text-emerald-700 mt-0.5">{a.action}</div>
          {a.expected_impact && (
            <div className="text-emerald-600 mt-0.5 font-medium">Impact: {a.expected_impact}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-indigo-600 text-white'
          : 'bg-gradient-to-br from-[#a100ff] to-indigo-600 text-white'
      }`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-3 rounded-2xl text-sm ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
        }`}>
          {renderMessageContent(msg.content)}

          {/* Chart payloads */}
          {msg.chartPayload?.type === 'drivers_bar' && (
            <DriverBarChart data={msg.chartPayload.data} />
          )}
          {msg.chartPayload?.type === 'time_series_forecast' && (
            <ForecastChart
              historical={msg.chartPayload.historical}
              forecast={msg.chartPayload.forecast}
            />
          )}

          {/* Web insights */}
          {msg.webInsights && <WebInsightCard insight={msg.webInsights} />}

          {/* Action suggestions */}
          {msg.actionPayload && <ActionSuggestions actions={msg.actionPayload} />}
        </div>

        {/* Sources row */}
        {msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.sources.map((s, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
                <Database size={9} />
                {s.ref}
                {s.confidence && <span className="text-slate-400">· {s.confidence}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Suggested chips */}
        {msg.suggestedChips?.length > 0 && !isUser && (
          <div className="flex flex-wrap gap-2 pt-1 px-1">
            {msg.suggestedChips.map((chip, i) => (
              <button
                key={i}
                className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-xl font-medium transition-colors"
                data-chip={chip}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Telemetry */}
        {msg.telemetry && (
          <div className="text-[10px] text-slate-400 px-1 font-medium">
            {msg.telemetry.latency_ms}ms ·
            {msg.telemetry.intent_detected ? ` intent: ${msg.telemetry.intent_detected} · ` : ' '}
            {msg.telemetry.narrate_method || 'template'}
          </div>
        )}
      </div>
    </div>
  );
}

const INITIAL_MESSAGES = [{
  role: 'assistant',
  content: 'Hello! I am your KPI Decision Assistant — grounded in real-time enterprise telemetry. I can explain KPI anomalies, identify root causes, generate forecasts, and answer benchmark questions. All responses are backed by verified statistical analysis.',
  suggestedChips: [
    'Why did revenue drop in East Region?',
    'What is the 7-day revenue forecast?',
    'Show me all active alerts',
    'What are industry checkout error benchmarks?',
  ],
}];

export default function ChatPage() {
  const { persona, role } = usePersona();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useLlm, setUseLlm] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async (text = input) => {
    const trimmed = (text || '').trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChat(trimmed, persona, role, useLlm);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.response,
        sources: res.sources,
        chartPayload: res.chart_payload,
        actionPayload: res.action_payload,
        webInsights: res.web_insights,
        suggestedChips: res.suggested_chips,
        telemetry: res.telemetry,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${err.message}. Please check that the backend is running.`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, persona, role, useLlm]);

  const handleChipClick = useCallback((e) => {
    const chip = e.target.closest('[data-chip]')?.dataset?.chip;
    if (chip) handleSend(chip);
  }, [handleSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)]">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#a100ff] to-indigo-600 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            KPI Decision Assistant
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 ml-9">
            Grounded in real-time enterprise telemetry · Profile: {persona.toUpperCase()}
          </p>
        </div>

        {/* LLM toggle */}
        <label className="flex items-center gap-2 cursor-pointer group">
          <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700">
            {useLlm ? <><Brain size={12} className="inline mr-1 text-purple-500" />AI Narration</> : <><FileCode2 size={12} className="inline mr-1" />Template</>}
          </span>
          <div
            onClick={() => setUseLlm(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              useLlm ? 'bg-purple-500' : 'bg-slate-300'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
              useLlm ? 'left-4' : 'left-0.5'
            }`} />
          </div>
        </label>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto space-y-5 pr-1"
        onClick={handleChipClick}
      >
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#a100ff] to-indigo-600 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500 font-medium">
                  Running statistical analysis…
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about KPI anomalies, root causes, forecasts, or benchmarks…"
            className="flex-1 resize-none text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent px-3 py-2 max-h-32 min-h-[40px] leading-snug"
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1 border-t border-slate-100 mt-1">
          {[
            'Why did revenue drop in East Region?',
            '7-day revenue forecast?',
            'Active alerts',
            'Checkout benchmarks',
          ].map(chip => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={loading}
              className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
