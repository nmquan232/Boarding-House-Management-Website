import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-60 bg-gray-800 text-white flex flex-col justify-between p-4">
        <div>
          <h1 className="text-lg font-semibold mb-6 text-center">Quản lý nhà trọ</h1>
          <nav className="flex flex-col gap-2">
            <Link to="/" className="hover:bg-gray-700 p-2 rounded">Dashboard</Link>
            <Link to="/apartments" className="hover:bg-gray-700 p-2 rounded">Tòa nhà</Link>
            <Link to="/tenants" className="hover:bg-gray-700 p-2 rounded">Người thuê</Link>
            <Link to="/contracts" className="hover:bg-gray-700 p-2 rounded">Hợp đồng</Link>
            <Link to="/collections" className="hover:bg-gray-700 p-2 rounded">Hóa đơn</Link>
          </nav>
        </div>

        <button
          onClick={logout}
          className="bg-red-600 w-full py-2 rounded hover:bg-red-700 transition-colors"
        >
          Đăng xuất
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-6 bg-gray-50 min-h-screen min-w-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
