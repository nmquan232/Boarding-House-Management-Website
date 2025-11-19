import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

type Stats = {
  apartments: number;
  tenants: number;
  contracts: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ap, te, co] = await Promise.all([
          axiosClient.get('/apartments?page=1&take=1'),
          axiosClient.get('/tenants?page=1&take=1'),
          axiosClient.get('/contracts?page=1&take=1'),
        ]);

        setStats({
          apartments: ap.data.total ?? (ap.data.items?.length || 0),
          tenants: te.data.total ?? (te.data.items?.length || 0),
          contracts: co.data.total ?? (co.data.items?.length || 0),
        });
      } catch {
        setStats({ apartments: 0, tenants: 0, contracts: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500 text-lg">
        Đang tải dữ liệu...
      </div>
    );

  if (!stats)
    return (
      <div className="flex justify-center items-center h-screen text-red-500 text-lg">
        Không thể tải số liệu.
      </div>
    );

  const Card = ({
    title,
    value,
    color,
  }: {
    title: string;
    value: number;
    color: string;
  }) => (
    <div className="bg-white shadow-lg rounded-xl md:rounded-2xl p-5 md:p-6 flex flex-col items-center hover:shadow-xl transition-all duration-300 border-t-4 transform hover:-translate-y-1" style={{ borderColor: color }}>
      <h3 className="text-gray-700 text-base md:text-lg font-semibold mb-2">{title}</h3>
      <p className="text-3xl md:text-4xl lg:text-5xl font-extrabold" style={{ color }}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-6 md:mb-8 text-gray-800">
          📊 Bảng thống kê tổng quan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card title="Tòa nhà" value={stats.apartments} color="#3B82F6" />
          <Card title="Người thuê" value={stats.tenants} color="#10B981" />
          <Card title="Hợp đồng" value={stats.contracts} color="#F59E0B" />
        </div>

        <footer className="text-center text-gray-500 mt-8 md:mt-10 text-xs md:text-sm">
          © 2025 Quản lý trọ - Dashboard thông minh
        </footer>
      </div>
    </div>
  );
}
