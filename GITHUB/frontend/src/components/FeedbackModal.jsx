import { useState } from 'react';
import { usePersona } from '../context/PersonaContext';
import { submitFeedback } from '../api/client';
import { X, Star, GitBranch, AlertTriangle } from 'lucide-react';

export default function FeedbackModal({ onClose, caseData }) {
  const { persona } = usePersona();
  const [verdict, setVerdict] = useState('confirmed');
  const [correctedCause, setCorrectedCause] = useState('');
  const [correctedNarrative, setCorrectedNarrative] = useState('');
  const [severity, setSeverity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const originalNarrative = caseData?.narrative || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitFeedback({
        ...caseData,
        verdict,
        corrected_cause: verdict === 'corrected' ? correctedCause : null,
        corrected_narrative: verdict === 'corrected' && correctedNarrative ? correctedNarrative : null,
        severity_rating: severity,
        analyst: persona,
        override_version: verdict === 'corrected' ? new Date().toISOString() : null,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Analysis Feedback &amp; Override</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Your corrections immediately re-rank future driver weights</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>
        
        {success ? (
          <div className="p-10 text-center text-emerald-600">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="text-emerald-500 fill-current" size={28} />
            </div>
            <h3 className="text-lg font-bold mb-2">Feedback Recorded</h3>
            <p className="text-sm text-slate-500">Driver weights will be adjusted for future cases.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">

            {/* Verdict selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Your Verdict on the AI Analysis
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'confirmed', label: '✓ Confirmed', style: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
                  { val: 'rejected',  label: '✗ Rejected',  style: 'border-rose-300   bg-rose-50   text-rose-800'   },
                  { val: 'corrected', label: '✎ Corrected', style: 'border-amber-300  bg-amber-50  text-amber-800'  },
                ].map(({ val, label, style }) => (
                  <label
                    key={val}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer text-xs font-bold transition-all ${
                      verdict === val ? style : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" className="sr-only" checked={verdict === val} onChange={() => setVerdict(val)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Corrected cause field */}
            {verdict === 'corrected' && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    What was the actual root cause?
                  </label>
                  <input 
                    type="text" 
                    value={correctedCause}
                    onChange={(e) => setCorrectedCause(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Competitor pricing change, Supply disruption..."
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This correction will lower the weight of the AI's top driver and raise the weight of your correction in future cases.
                  </p>
                </div>

                {/* Analyst override narrative */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Override Narrative (optional)
                    </label>
                    {originalNarrative && (
                      <button
                        type="button"
                        onClick={() => setShowDiff(!showDiff)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                      >
                        <GitBranch size={10} /> {showDiff ? 'Hide' : 'Show'} original
                      </button>
                    )}
                  </div>

                  {/* Diff view */}
                  {showDiff && originalNarrative && (
                    <div className="mb-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[10px] text-rose-700 leading-relaxed">
                      <div className="font-bold text-[9px] uppercase tracking-wider mb-1 text-rose-500">Original AI Narrative</div>
                      {originalNarrative}
                    </div>
                  )}

                  <textarea
                    value={correctedNarrative}
                    onChange={(e) => setCorrectedNarrative(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Write your corrected narrative here (will be versioned and stored alongside the AI's original)..."
                  />
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                    <GitBranch size={9} />
                    Versioned correction — stored with analyst name, timestamp, and diff against original
                  </div>
                </div>
              </div>
            )}

            {/* Severity Rating */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Business Severity (1–5)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <button 
                    key={star}
                    type="button"
                    onClick={() => setSeverity(star)}
                    className={`${severity >= star ? 'text-amber-500' : 'text-slate-200'} hover:text-amber-400 transition-colors`}
                  >
                    <Star size={22} className={severity >= star ? 'fill-current' : ''} />
                  </button>
                ))}
              </div>
            </div>

            {/* Learning loop reminder */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-indigo-700 leading-relaxed">
                <strong>Live learning loop:</strong> Submitting a correction immediately updates driver weights.
                Re-load any case to see re-ranked drivers reflecting your correction.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || severity === 0}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
