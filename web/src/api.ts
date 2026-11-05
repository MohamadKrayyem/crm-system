import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A wrong password on the login page is also a 401, but there is no token yet
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && localStorage.getItem('token')) {
    localStorage.clear();
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export function errorMessage(error: any): string {
  return error.response?.data?.message ?? 'Could not reach the server';
}

export default api;
