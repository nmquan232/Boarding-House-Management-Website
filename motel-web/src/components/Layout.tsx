import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const Layout = () => {
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 text-white p-2 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-full w-64 bg-gray-800 text-white flex flex-col justify-between p-4 z-40
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          <h1 className="text-xl font-bold mb-6 text-center border-b border-gray-700 pb-3">
            🏠 Quản lý nhà trọ
          </h1>
          <nav className="flex flex-col gap-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>📊</span> Dashboard
            </Link>
            <Link
              to="/apartments"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>🏢</span> Tòa nhà
            </Link>
            <Link
              to="/tenants"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>👥</span> Người thuê
            </Link>
            <Link
              to="/contracts"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>📄</span> Hợp đồng
            </Link>
            <Link
              to="/collections"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>💳</span> Hóa đơn
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>👤</span> Hồ sơ
            </Link>
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🛡️</span> Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="space-y-3">
          {user && (
            <div className="text-sm text-gray-200 bg-gray-900/40 p-3 rounded-lg">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-gray-400 break-all">{user.email}</p>
              <p className="text-xs mt-1 uppercase tracking-wide text-blue-300">{user.role}</p>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              setMobileMenuOpen(false);
            }}
            className="bg-red-600 w-full py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-0 p-4 md:p-6 bg-gray-50 min-h-screen w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
