import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 60000, // 60s — allows for LLM narration latency
});

// Request interceptor: add timing
api.interceptors.request.use(config => {
  config.metadata = { startTime: Date.now() };
  return config;
});

// Response interceptor: log latency in dev
api.interceptors.response.use(
  response => response,
  error => {
    const detail = error.response?.data?.detail || error.message;
    return Promise.reject(new Error(detail));
  }
);

export const getHealth       = () => api.get('/health').then(r => r.data);
export const getDashboard    = (persona, role) => api.get(`/dashboard?persona=${persona}&role=${role}`).then(r => r.data);
export const getDashboardTrends = (role, days = 30) => api.get(`/dashboard/trends?role=${role}&days=${days}`).then(r => r.data);
export const getCase         = (region, weekStart, metric, persona, role) =>
  api.get(`/case/${encodeURIComponent(region)}/${encodeURIComponent(weekStart)}?metric=${encodeURIComponent(metric)}&persona=${persona}&role=${role}&use_llm=true`).then(r => r.data);
export const getAlerts       = (persona, role) => api.get(`/alerts?persona=${persona}&role=${role}`).then(r => r.data);
export const submitFeedback  = (data) => api.post('/feedback', data).then(r => r.data);
export const getCalibration  = () => api.get('/calibration').then(r => r.data);
export const getKnowledgeGraph = () => api.get('/knowledge-graph').then(r => r.data);
export const getWaterfall    = (region, weekStart, metric) =>
  api.get(`/waterfall/${encodeURIComponent(region)}/${encodeURIComponent(weekStart)}?metric=${encodeURIComponent(metric)}`).then(r => r.data);
export const getForecast     = (kpi, region, horizon = 7) =>
  api.get(`/forecast/${encodeURIComponent(kpi)}/${encodeURIComponent(region)}?horizon=${horizon}`).then(r => r.data);
export const getLineage      = (kpi) => api.get(`/lineage/${encodeURIComponent(kpi)}`).then(r => r.data);
export const getSparseHistory = (product, region) =>
  api.get(`/sparse-history?product=${encodeURIComponent(product)}&region=${encodeURIComponent(region)}`).then(r => r.data);
export const sendChat        = (message, persona, role, useLlm = true) =>
  api.post('/chat', { message, persona, role, use_llm: useLlm }).then(r => r.data);
export const dispatchAction  = (channel, payload, persona) =>
  api.post('/integrations/dispatch', { channel, payload, persona }).then(r => r.data);
export const getDispatchHistory = () => api.get('/integrations/history').then(r => r.data);
export const uploadCustomDataset = (csvContent, filename) =>
  api.post('/upload-dataset', { csv_content: csvContent, filename }).then(r => r.data);
export const createCustomKPI = (data) => api.post('/kpi/create', data).then(r => r.data);
export const getExecutiveMemo = (region, weekStart, metric) =>
  api.get(`/export/executive-memo/${encodeURIComponent(region)}/${encodeURIComponent(weekStart)}?metric=${encodeURIComponent(metric)}`).then(r => r.data);
export const browseWeb       = (queryOrUrl) => api.post('/web/browse', { query_or_url: queryOrUrl }).then(r => r.data);
export const simulateScenario = (data) => api.post('/simulate-scenario', data).then(r => r.data);
export const getDataQuality  = () => api.get('/data-quality').then(r => r.data);
export const getTrustScore   = (region, weekStart, metric = 'revenue') =>
  api.get(`/trust-score/${encodeURIComponent(region)}/${encodeURIComponent(weekStart)}?metric=${metric}`).then(r => r.data);
export const getDrift        = () => api.get('/drift').then(r => r.data);
export const getActionOutcomes = () => api.get('/action-outcomes').then(r => r.data);
export const recordActionOutcome = (data) => api.post('/action-outcomes/record', data).then(r => r.data);
export const checkActionOutcomes = () => api.post('/action-outcomes/check').then(r => r.data);

export default api;
