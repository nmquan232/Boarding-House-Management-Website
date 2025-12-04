import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';

const Login = () => {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.login(email, password);
      const { access_token, user } = res.data;
      setAuth(access_token, user);

      navigate('/');
    } catch {
      setError('Sai email hoặc mật khẩu');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    if (!forgotIdentifier.trim()) {
      setForgotError('Vui lòng nhập email hoặc login ID');
      return;
    }
    try {
      setForgotLoading(true);
      const res = await authApi.forgotPassword(forgotIdentifier.trim());
      const data = res.data as { message: string; newPassword: string };
      setForgotMessage(`${data.message}. Mật khẩu mới: ${data.newPassword}`);
      setForgotIdentifier('');
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setForgotLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-6 sm:p-8 md:p-10">
        <form onSubmit={handleLogin}>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email hoặc Login ID</label>
              <input
                type="text"
                placeholder="Nhập email hoặc login ID"
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

          <div className="mt-2 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setShowForgot((prev) => !prev)}
              className="text-blue-600 hover:text-blue-700 hover:underline focus:outline-none"
            >
              {showForgot ? 'Đóng quên mật khẩu' : 'Quên mật khẩu?'}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all font-medium mt-4 shadow-md hover:shadow-lg"
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

        {showForgot && (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Đặt lại mật khẩu</h3>
            <p className="text-sm text-gray-600 mb-3">
              Nhập email hoặc login ID đã đăng ký. Hệ thống sẽ tạo mật khẩu mới và hiển thị ngay cho bạn.
            </p>
            {forgotError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {forgotError}
              </div>
            )}
            {forgotMessage && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                {forgotMessage}
              </div>
            )}
            <form className="space-y-3" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email hoặc Login ID</label>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập email hoặc login ID"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-lg bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-60"
              >
                {forgotLoading ? 'Đang xử lý...' : 'Tạo mật khẩu mới'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
