import { useState, useEffect } from 'react';
import { uploadCustomDataset, getDispatchHistory } from '../api/client';
import { 
  Database, Upload, CheckCircle2, AlertTriangle, ShieldCheck, 
  ExternalLink, Layers, RefreshCw, FileText, ArrowRight, Zap, Check, Lock, Cpu
} from 'lucide-react';

export default function DataConnectorsPage() {
  const [connectors, setConnectors] = useState([
    { id: 'snowflake', name: 'Snowflake Data Warehouse', category: 'Data Warehouse', status: 'Connected', rows: '1.2M events/day', cadence: '15m sync', icon: '❄️' },
    { id: 'databricks', name: 'Databricks Unity Catalog', category: 'Lakehouse', status: 'Connected', rows: '4.8M records', cadence: 'Hourly sync', icon: '🧱' },
    { id: 'stripe', name: 'Stripe Billing & Payments', category: 'Payment Gateway', status: 'Connected', rows: '7,108 transactions', cadence: 'Real-time Webhook', icon: '💳' },
    { id: 'salesforce', name: 'Salesforce Enterprise CRM', category: 'CRM & Pipeline', status: 'Connected', rows: '342 accounts', cadence: 'Daily sync', icon: '☁️' },
    { id: 'bigquery', name: 'Google BigQuery', category: 'Analytics Lake', status: 'Available', rows: '—', cadence: 'Batch sync', icon: '🔍' },
    { id: 'postgres', name: 'PostgreSQL Operational DB', category: 'OLTP Database', status: 'Available', rows: '—', cadence: 'CDC Streaming', icon: '🐘' },
  ]);

  const [customCsv, setCustomCsv] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('connectors'); // connectors, upload, dispatches

  useEffect(() => {
    getDispatchHistory().then(res => setDispatchLogs(res.history || [])).catch(() => {});
  }, []);

  const sampleCsvData = `date,region,orders,revenue,checkout_errors,marketing_spend
2026-08-01,East Region,140,4200,2,500
2026-08-02,East Region,138,4140,1,500
2026-08-03,East Region,142,4260,3,500
2026-08-04,East Region,135,4050,2,500
2026-08-05,East Region,139,4170,2,500
2026-08-06,East Region,141,4230,1,500
2026-08-07,East Region,140,4200,3,500
2026-08-08,East Region,142,4260,2,500
2026-08-09,East Region,130,3900,12,400
2026-08-10,East Region,125,3750,15,400
2026-08-11,East Region,118,3540,18,400`;

  const handleUpload = async () => {
    if (!customCsv.trim()) return;
    setUploadLoading(true);
    try {
      const res = await uploadCustomDataset(customCsv, 'client_production_data.csv');
      setUploadResult(res);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleLoadSample = () => {
    setCustomCsv(sampleCsvData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Zap size={12} /> Enterprise Integration Hub
            </span>
            <span className="text-xs text-slate-400">Zero-ETL Semantic Connectors</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Data Connectors & Ingestion Studio</h1>
          <p className="text-slate-300 text-sm mt-1">
            Connect live enterprise warehouses or drop custom CSV datasets for immediate automated root-cause analysis.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/10 text-right">
          <div className="text-xs text-slate-300 uppercase font-semibold">Active Connectors</div>
          <div className="text-2xl font-bold text-emerald-400">4 Connected</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('connectors')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'connectors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database size={16} /> Enterprise Data Connectors (6)
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload size={16} /> Custom CSV Ingest Studio
        </button>
        <button
          onClick={() => setActiveTab('dispatches')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'dispatches' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap size={16} /> Dispatched Actions Audit ({dispatchLogs.length})
        </button>
      </div>

      {/* Tab 1: Connectors Grid */}
      {activeTab === 'connectors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {connectors.map((c) => (
            <div key={c.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:border-indigo-200 transition-all space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 bg-slate-50 rounded-2xl border border-slate-100">{c.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                    <span className="text-xs text-slate-400">{c.category}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  c.status === 'Connected' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {c.status}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Volume:</span>
                  <span className="font-semibold text-slate-800">{c.rows}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sync Frequency:</span>
                  <span className="font-semibold text-slate-800">{c.cadence}</span>
                </div>
              </div>

              <button 
                onClick={() => alert(`Synchronizing schema for ${c.name}... Live connection active.`)}
                className="w-full py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} /> {c.status === 'Connected' ? 'Sync Schema' : 'Connect Source'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Custom CSV Ingest Studio */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Paste Custom Enterprise CSV</h3>
                <p className="text-xs text-slate-500">Provide client dataset with date, metric, and operational driver columns</p>
              </div>
              <button 
                onClick={handleLoadSample}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold underline"
              >
                Load Sample Dataset
              </button>
            </div>

            <textarea 
              rows={10}
              value={customCsv}
              onChange={(e) => setCustomCsv(e.target.value)}
              placeholder="Paste raw CSV contents here..."
              className="w-full bg-slate-50 font-mono text-xs p-4 rounded-2xl border border-slate-200 outline-none focus:bg-white focus:border-indigo-500"
            />

            <button
              onClick={handleUpload}
              disabled={!customCsv.trim() || uploadLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              {uploadLoading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>Process & Auto-Synthesize Diagnostic Case</span>
            </button>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {uploadResult ? (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 size={18} /> Ingested & Schema Inferred
                </div>
                
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold">{uploadResult.message}</div>
                  <div>Completeness: <strong>{uploadResult.completeness_pct}%</strong></div>
                  <div>Detected Date Column: <strong>{uploadResult.detected_date_column}</strong></div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase">Inferred KPI Entities:</div>
                  <div className="space-y-1.5">
                    {uploadResult.inferred_kpis?.map((k, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{k.kpi_name}</span>
                        <span className="font-mono text-indigo-600 font-bold">{k.total ? `$${k.total.toLocaleString()}` : 'Computed'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 text-center space-y-2 text-slate-500">
                <FileText size={32} className="mx-auto text-slate-400" />
                <h4 className="font-bold text-sm text-slate-700">Zero Configuration Ingestion</h4>
                <p className="text-xs max-w-xs mx-auto">
                  Paste or load any company dataset. The engine will infer timestamps, group regional partitions, and map candidate root causes.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 3: Dispatches Audit Log */}
      {activeTab === 'dispatches' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-base">Real-World Action Dispatch Audit Log</h3>
            <span className="text-xs text-slate-500">Immutable Operational History</span>
          </div>
          
          {dispatchLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">Dispatch ID</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Channel</th>
                    <th className="px-6 py-4">External Reference</th>
                    <th className="px-6 py-4">Authorized By</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 text-xs">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{log.dispatch_id}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 font-semibold capitalize">{log.channel.replace('_', ' ')}</td>
                      <td className="px-6 py-4 font-mono text-indigo-700 font-bold">{log.external_reference}</td>
                      <td className="px-6 py-4 font-bold uppercase">{log.authorized_by}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              No dispatches logged yet. Trigger an action from the Diagnostic Case page to log executions here.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
