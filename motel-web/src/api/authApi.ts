import axiosClient from './axiosClient';

export const authApi = {
  login: (email: string, password: string) =>
    axiosClient.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    axiosClient.post('/auth/register', { name, email, password }),
};
