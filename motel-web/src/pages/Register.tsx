import React, { useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await authApi.register(name, email, password);
      const { access_token, user } = res.data;
      setAuth(access_token, user);
      navigate('/');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <form onSubmit={submit} className="bg-white shadow-xl rounded-2xl w-full max-w-md p-6 sm:p-8 md:p-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl text-green-700 font-bold mb-2">Đăng ký</h2>
          <p className="text-gray-600 text-sm">Tạo tài khoản mới để bắt đầu</p>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-center text-sm">
            {err}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
            <input
              className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition shadow-sm"
              placeholder="Nhập họ tên của bạn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition shadow-sm"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              className="w-full text-gray-700 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition shadow-sm"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white w-full py-3 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-all font-medium mt-6 shadow-md hover:shadow-lg"
        >
          Tạo tài khoản
        </button>

        <p className="text-center text-gray-600 text-sm mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
