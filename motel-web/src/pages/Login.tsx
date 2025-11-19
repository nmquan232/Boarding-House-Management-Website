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
      const token = res.data.access_token;

      // ✅ Lưu token vào cả context và localStorage
      setToken(token);
      localStorage.setItem('token', token);

      navigate('/');
    } catch {
      setError('Sai email hoặc mật khẩu');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-xl rounded-2xl w-full max-w-md p-6 sm:p-8 md:p-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl text-blue-700 font-bold mb-2">Đăng nhập</h2>
          <p className="text-gray-600 text-sm">Chào mừng bạn trở lại!</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-center text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all font-medium mt-6 shadow-md hover:shadow-lg"
        >
          Đăng nhập
        </button>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
