import React, { useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const { setToken } = useAuth();
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
      // backend trả về { access_token, user }
      setToken(res.data.access_token);
      navigate('/');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-blue-100 p-4">
      <form onSubmit={submit} className="bg-white shadow-md rounded-lg p-8 w-96">
        <h2 className="text-3xl text-blue-600 font-bold mb-4 text-center">Đăng ký</h2>
        {err && <p className="text-red-600 text-center mb-3">{err}</p>}

        <input
          className="w-full text-gray-700 p-3 mb-4 border rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Họ tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          className="w-full text-gray-700 p-3 mb-4 border rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full text-gray-700 p-3 mb-4 border rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Mật khẩu (>=6 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700">
          Tạo tài khoản
        </button>

        <p className="text-center text-gray-800 text-sm mt-3">
          Đã có tài khoản? <Link to="/login" className="text-blue-600">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
