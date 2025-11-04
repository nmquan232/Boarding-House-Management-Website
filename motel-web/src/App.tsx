import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Apartments from './pages/Apartments';
import Rooms from './pages/Rooms';
import Tenants from './pages/Tenants';
import Contracts from './pages/Contracts';
import Collections from './pages/Collections';
import Register from './pages/Register';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            
            <Route index element={<Dashboard />} />
            <Route path="apartments" element={<Apartments />} />
            <Route path="apartments/:id/rooms" element={<Rooms />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="collections" element={<Collections />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
