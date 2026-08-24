import { useState } from 'react';
import { usePersona } from '../context/PersonaContext';
import { submitFeedback } from '../api/client';
import { X, Star } from 'lucide-react';

export default function FeedbackModal({ onClose, caseData }) {
  const { persona } = usePersona();
  const [verdict, setVerdict] = useState('confirmed');
  const [correctedCause, setCorrectedCause] = useState('');
  const [severity, setSeverity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitFeedback({
        ...caseData,
        verdict,
        corrected_cause: verdict === 'corrected' ? correctedCause : null,
        severity_rating: severity,
        analyst: persona
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      alert("Failed to submit feedback: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Analysis Feedback</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        {success ? (
          <div className="p-8 text-center text-emerald-600">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="text-emerald-500 fill-current" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Thank You!</h3>
            <p>Your feedback helps calibrate the KPI Engine.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Engine Verdict</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={verdict === 'confirmed'} onChange={() => setVerdict('confirmed')} className="text-indigo-600" /> Confirmed
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={verdict === 'rejected'} onChange={() => setVerdict('rejected')} className="text-indigo-600" /> Rejected
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={verdict === 'corrected'} onChange={() => setVerdict('corrected')} className="text-indigo-600" /> Corrected
                </label>
              </div>
            </div>

            {verdict === 'corrected' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Corrected Cause</label>
                <input 
                  type="text" 
                  value={correctedCause}
                  onChange={(e) => setCorrectedCause(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="What was the actual root cause?"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Severity Rating (1-5)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <button 
                    key={star}
                    type="button"
                    onClick={() => setSeverity(star)}
                    className={`${severity >= star ? 'text-amber-500' : 'text-slate-200'} hover:text-amber-400 transition-colors`}
                  >
                    <Star size={24} className={severity >= star ? 'fill-current' : ''} />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
              <button type="submit" disabled={loading || severity === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
