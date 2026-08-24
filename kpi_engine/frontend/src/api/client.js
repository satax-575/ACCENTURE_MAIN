import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

export const getDashboard = (persona, role) => api.get(`/dashboard?persona=${persona}&role=${role}`).then(res => res.data);
export const getCase = (region, weekStart, metric, persona, role) => api.get(`/case/${encodeURIComponent(region)}/${encodeURIComponent(weekStart)}?metric=${encodeURIComponent(metric)}&persona=${persona}&role=${role}`).then(res => res.data);
export const getAlerts = (persona, role) => api.get(`/alerts?persona=${persona}&role=${role}`).then(res => res.data);
export const submitFeedback = (data) => api.post(`/feedback`, data).then(res => res.data);
export const getCalibration = () => api.get(`/calibration`).then(res => res.data);
export const getKnowledgeGraph = () => api.get(`/knowledge-graph`).then(res => res.data);
export const getWaterfall = (region, weekStart, metric) => api.get(`/waterfall/${encodeURIComponent(region)}/${encodeURIComponent(weekStart)}?metric=${encodeURIComponent(metric)}`).then(res => res.data);
export const getForecast = (kpi, region) => api.get(`/forecast/${encodeURIComponent(kpi)}/${encodeURIComponent(region)}`).then(res => res.data);
export const getLineage = (kpi) => api.get(`/lineage/${encodeURIComponent(kpi)}`).then(res => res.data);
export const getSparseHistory = (product, region) => api.get(`/sparse-history?product=${encodeURIComponent(product)}&region=${encodeURIComponent(region)}`).then(res => res.data);
export const sendChat = (message, persona, role) => api.post(`/chat`, { message, persona, role }).then(res => res.data);
export const dispatchAction = (channel, payload, persona) => api.post(`/integrations/dispatch`, { channel, payload, persona }).then(res => res.data);
export const getDispatchHistory = () => api.get(`/integrations/history`).then(res => res.data);
export const uploadCustomDataset = (csvContent, filename) => api.post(`/upload-dataset`, { csv_content: csvContent, filename }).then(res => res.data);
export const createCustomKPI = (data) => api.post(`/kpi/create`, data).then(res => res.data);
export const getExecutiveMemo = (region, weekStart, metric) => api.get(`/export/executive-memo/${encodeURIComponent(region)}/${encodeURIComponent(weekStart)}?metric=${encodeURIComponent(metric)}`).then(res => res.data);
export const browseWeb = (queryOrUrl) => api.post(`/web/browse`, { query_or_url: queryOrUrl }).then(res => res.data);
export const simulateScenario = (data) => api.post(`/simulate-scenario`, data).then(res => res.data);

export default api;


