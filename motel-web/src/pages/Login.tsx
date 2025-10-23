import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';

const Login = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.login(email, password);
      setToken(res.data.access_token);
      navigate('/');
    } catch {
      setError('Sai email hoặc mật khẩu');
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-blue-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md rounded-lg w-full max-w-md p-6 sm:p-8"
      >
        <h2 className="text-3xl text-blue-700 font-bold mb-6 text-center">Đăng nhập</h2>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-gray-700 p-3 mb-4 border rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />

        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full text-gray-700 p-3 mb-4 border rounded-md bg-gray-100 focus:ring-2 focus:ring-blue-500 transition"
        />

        <button className="w-full text-white p-3 rounded-md hover:bg-red-700 focus: ring-amber-300  transition">
          Đăng nhập
        </button>

        <p className="mt-4 text-center text-gray-600 text-sm">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-600 hover:underline ">
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
