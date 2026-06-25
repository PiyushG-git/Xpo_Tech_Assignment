import axios from 'axios';

// Create an Axios instance with base URL pointing to the Node.js backend
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Get lightweight timeline data for the scatter chart
  getTimeline: async () => {
    const { data } = await apiClient.get('/timeline');
    return data;
  },

  // Get a list of all clusters
  getClusters: async () => {
    const { data } = await apiClient.get('/clusters');
    return data;
  },

  // Get detailed articles for a specific cluster
  getClusterById: async (clusterId) => {
    const { data } = await apiClient.get(`/clusters/${clusterId}`);
    return data;
  },

  // Trigger the background python pipeline
  triggerIngestion: async () => {
    const { data } = await apiClient.post('/ingest/trigger');
    return data; // { jobId: "..." }
  },

  // Poll the job status
  getIngestionStatus: async (jobId) => {
    const { data } = await apiClient.get(`/ingest/status/${jobId}`);
    return data; // { status: "running" | "completed" | "failed" }
  },
};
