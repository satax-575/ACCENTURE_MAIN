import { useState } from 'react';
import { dispatchAction } from '../api/client';
import { usePersona } from '../context/PersonaContext';
import { 
  X, Send, CheckCircle2, AlertTriangle, ShieldCheck, 
  MessageSquare, Layers, ExternalLink, Copy, Check, Loader2
} from 'lucide-react';

export default function DispatchActionModal({ onClose, action, caseData }) {
  const { persona } = usePersona();
  const [selectedChannel, setSelectedChannel] = useState('slack'); // slack, jira, crm_outreach, webhook
  const [loading, setLoading] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const channels = [
    { id: 'slack', name: 'Slack Incident Channel', icon: '💬', desc: 'Broadcast P1 alert to #incident-ops' },
    { id: 'jira', name: 'Jira Engineering Ticket', icon: '🎫', desc: 'Create P1 engineering escalation' },
    { id: 'crm_outreach', name: 'Salesforce CRM Campaign', icon: '👥', desc: 'Trigger customer cart recovery' },
    { id: 'webhook', name: 'Enterprise Webhook', icon: '⚡', desc: 'Post JSON payload to event bus' },
  ];

  const handleDispatch = async () => {
    setLoading(true);
    try {
      const payload = {
        kpi: caseData?.metric || 'Revenue',
        region: caseData?.region || 'East Region',
        week_start: caseData?.week_start || '2026-08-11',
        pct_change: '-11.6%',
        driver: action?.driver || 'Checkout Error Rate',
        action: action?.action || 'Escalate to Engineering',
        owner: action?.owner || 'Head of Engineering',
        onset: '2026-08-09'
      };
      const res = await dispatchAction(selectedChannel, payload, persona);
      setDispatchResult(res);
    } catch (err) {
      alert('Dispatch failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (dispatchResult) {
      navigator.clipboard.writeText(JSON.stringify(dispatchResult, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
              ⚡ LIVE
            </span>
            <div>
              <h2 className="text-base font-bold">Enterprise Action Dispatcher</h2>
              <p className="text-[11px] text-slate-300">Execute authorized playbooks across enterprise operations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {dispatchResult ? (
            /* Success State */
            <div className="space-y-4">
              <div className={`p-5 border rounded-2xl flex items-start gap-3.5 ${
                dispatchResult.real_integration
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  dispatchResult.real_integration ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-sm ${dispatchResult.real_integration ? 'text-emerald-900' : 'text-amber-900'}`}>
                      {dispatchResult.real_integration ? '⚡ Real Integration Fired' : '🔵 Simulated Dispatch Logged'}
                    </h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      dispatchResult.real_integration
                        ? 'bg-emerald-200 text-emerald-800 border-emerald-300'
                        : 'bg-amber-200 text-amber-800 border-amber-300'
                    }`}>
                      {dispatchResult.real_integration ? 'LIVE' : 'DEMO MODE'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${dispatchResult.real_integration ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Target: <span className="font-semibold capitalize">{dispatchResult.channel.replace('_', ' ')}</span>
                    {' '}• Authorized by: <span className="font-bold uppercase">{dispatchResult.authorized_by}</span>
                    {!dispatchResult.real_integration && (
                      <span className="block mt-1 text-[10px] text-amber-600">
                        Set <code className="bg-amber-100 px-1 rounded">SLACK_WEBHOOK_URL</code> in <code className="bg-amber-100 px-1 rounded">.env</code> to fire real Slack messages.
                      </span>
                    )}
                  </p>
                  <div className="mt-2 text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-800 inline-block">
                    Ref: {dispatchResult.external_reference}
                  </div>
                </div>
              </div>

              {/* Message preview for Slack */}
              {dispatchResult.message_preview && (
                <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Slack Message Preview</div>
                  <pre className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">{dispatchResult.message_preview}</pre>
                </div>
              )}

              {/* JSON payload */}
              <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl text-xs font-mono space-y-2 relative">
                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                  <span>API Response Payload</span>
                  <button onClick={handleCopy} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="text-[11px] text-indigo-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {JSON.stringify(dispatchResult, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Channel Selection & Confirmation */
            <div className="space-y-5">
              
              {/* Prescribed Action Summary */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1">
                <div className="text-[11px] font-bold text-indigo-900 uppercase">Target Action</div>
                <div className="text-sm font-bold text-slate-900">{action?.action || 'Escalate checkout issue to Engineering; trigger customer-success outreach.'}</div>
                <div className="text-xs text-slate-600">Expected Impact: {action?.expected_impact || 'Resolve ~55% of revenue impact'} • Owner: {action?.owner || 'Head of Engineering'}</div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Select Execution Channel
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        selectedChannel === ch.id 
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{ch.icon}</span>
                        <span className="text-xs font-bold text-slate-900">{ch.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{ch.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-500 font-medium">
                  Authorizing as: <span className="font-bold text-indigo-600 uppercase">{persona}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDispatch}
                    disabled={loading}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Dispathing...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Dispatch Real-World Action
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
