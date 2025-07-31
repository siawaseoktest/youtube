import axios from 'axios';

const api = axios.create({
  baseURL: 'https://siawaseok.duckdns.org/api',
  withCredentials: true, 
});

export default api;