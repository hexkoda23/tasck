import axios from 'axios';

// REACT_APP_BACKEND_URL must be provided at build time. No hardcoded fallback
// — a stale fallback would silently point production API calls at the wrong
// domain after a redeploy.
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const API = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tasck_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API functions

// Auth
export const demoLogin = (role) => api.post('/auth/demo-login', { role });

// Users
export const getUsers = (role) => api.get('/users', { params: { role } });
export const getUser = (userId) => api.get(`/users/${userId}`);
export const getStaff = () => api.get('/staff');
export const getSuperCreatives = () => api.get('/super-creatives');
export const getCreatives = () => api.get('/creatives');

// Brands
export const getBrands = () => api.get('/brands');
export const getBrand = (brandId) => api.get(`/brands/${brandId}`);

// Deals
export const getDeals = (params) => api.get('/deals', { params });
export const getDeal = (dealId) => api.get(`/deals/${dealId}`);
export const getPipelineSummary = () => api.get('/deals/pipeline/summary');
export const createDeal = (deal) => api.post('/deals', deal);
export const updateDealStatus = (dealId, status) => api.patch(`/deals/${dealId}/status`, null, { params: { status } });

// Projects
export const getProjects = (params) => api.get('/projects', { params });
export const getProject = (projectId) => api.get(`/projects/${projectId}`);

// Opportunities
export const getOpportunities = (params) => api.get('/opportunities', { params });
export const getOpenOpportunities = () => api.get('/opportunities/open');
export const getOpportunity = (oppId) => api.get(`/opportunities/${oppId}`);

// Tasks
export const getTasks = (params) => api.get('/tasks', { params });
export const getTask = (taskId) => api.get(`/tasks/${taskId}`);
export const updateTaskStatus = (taskId, status) => api.patch(`/tasks/${taskId}/status`, null, { params: { status } });

// Activities
export const getActivities = (limit = 20) => api.get('/activities', { params: { limit } });

// Copilot
export const getCopilotRecommendations = () => api.get('/copilot/recommendations');
export const dismissRecommendation = (recId) => api.post(`/copilot/recommendations/${recId}/dismiss`);

// Wallet
export const getWallet = (userId) => api.get(`/wallet/${userId}`);
export const getWalletTransactions = (userId) => api.get(`/wallet/${userId}/transactions`);

// Messages
export const getMessages = (userId) => api.get('/messages', { params: { user_id: userId } });
export const getMessageThreads = (userId) => api.get('/messages/threads', { params: { user_id: userId } });

// Stats
export const getStaffStats = (staffId) => api.get(`/stats/staff/${staffId}`);
export const getSuperCreativeStats = (scId) => api.get(`/stats/super-creative/${scId}`);
export const getCreativeStats = (creativeId) => api.get(`/stats/creative/${creativeId}`);
export const getAdminStats = () => api.get('/stats/admin');

// Health
export const healthCheck = () => api.get('/health');

export default api;
