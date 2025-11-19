import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 thêm
import axiosClient from '../api/axiosClient';

type Tenant = {
  id: number;
  name: string;
  tel?: string | null;
  email?: string | null;
  identity_card_number?: string | null;
};

function Tenants() {
  const navigate = useNavigate(); // 👈 thêm
  const [items, setItems] = useState<Tenant[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [take] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<Partial<Tenant>>({ name: '', tel: '', email: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    const res = await axiosClient.get('/tenants', { params: { q, page, take } });
    setItems(res.data.items || []);
    setTotal(res.data.total || 0);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, q]);

  const submit = async () => {
    if (!form.name) return alert('Nhập tên');
    if (editingId) {
      await axiosClient.put(`/tenants/${editingId}`, form);
      setEditingId(null);
    } else {
      await axiosClient.post('/tenants', form);
    }
    setForm({ name: '', tel: '', email: '' });
    await load();
  };

  const edit = (t: Tenant) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      tel: t.tel ?? '',
      email: t.email ?? '',
      identity_card_number: t.identity_card_number ?? ''
    });
  };

  const remove = async (id: number) => {
    if (!confirm('Xóa người thuê này?')) return;
    await axiosClient.delete(`/tenants/${id}`);
    await load();
  };

  // 👇 mở danh sách hợp đồng theo tenant
  const openContracts = (tenantId: number) => {
    navigate(`/contracts?tenant_id=${tenantId}`);
  };

  return (
    <div className="p-2 md:p-4">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">👥 Người thuê</h2>

      <div className="bg-white shadow-md rounded-lg p-4 md:p-6 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Tên" value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Điện thoại" value={form.tel || ''} onChange={(e) => setForm(f => ({ ...f, tel: e.target.value }))} />
          <input className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Email" value={form.email || ''} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <input className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="CCCD/CMND" value={form.identity_card_number || ''} onChange={(e) => setForm(f => ({ ...f, identity_card_number: e.target.value }))} />
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base shadow-md" onClick={submit}>
            {editingId ? 'Lưu' : 'Thêm'}
          </button>
          {editingId && (
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition text-sm md:text-base"
              onClick={() => { setEditingId(null); setForm({ name: '', tel: '', email: '' }); }}
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <input
          className="border border-gray-300 p-2 md:p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          placeholder="🔍 Tìm theo tên/điện thoại/email"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
        <table className="min-w-[600px] w-full bg-white">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">ID</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Tên</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden sm:table-cell">Điện thoại</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden md:table-cell">Email</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold w-40 md:w-56">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-4 md:p-6 text-gray-500">Không có dữ liệu</td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-2 md:p-3 text-sm">{t.id}</td>
                  <td className="p-2 md:p-3">
                    <button
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm md:text-base"
                      onClick={() => openContracts(t.id)}
                      title="Xem hợp đồng của người thuê này"
                    >
                      {t.name}
                    </button>
                  </td>
                  <td className="p-2 md:p-3 text-sm hidden sm:table-cell">{t.tel || '—'}</td>
                  <td className="p-2 md:p-3 text-sm hidden md:table-cell">{t.email || '—'}</td>
                  <td className="p-2 md:p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button className="text-blue-600 hover:text-blue-800 text-xs md:text-sm px-2 py-1 rounded hover:bg-blue-50 transition" onClick={() => edit(t)}>Sửa</button>
                      <button className="text-red-600 hover:text-red-800 text-xs md:text-sm px-2 py-1 rounded hover:bg-red-50 transition" onClick={() => remove(t.id)}>Xóa</button>
                      <button
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-xs md:text-sm transition"
                        onClick={() => openContracts(t.id)}
                      >
                        Hợp đồng
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 md:gap-3 mt-4 items-center flex-wrap justify-center md:justify-start">
        <button className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&lt; Trước</button>
        <span className="text-sm md:text-base px-2">Trang {page}/{Math.max(1, Math.ceil(total / take))}</span>
        <button className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition" disabled={page * take >= total} onClick={() => setPage(p => p + 1)}>Sau &gt;</button>
      </div>
    </div>
  );
}

export default Tenants;
