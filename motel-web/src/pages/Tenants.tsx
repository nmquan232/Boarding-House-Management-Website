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
    <div>
      <h2 className="text-xl font-bold mb-4">Người thuê</h2>

      <div className="bg-white shadow p-4 rounded mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border p-2 rounded" placeholder="Tên" value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="border p-2 rounded" placeholder="Điện thoại" value={form.tel || ''} onChange={(e) => setForm(f => ({ ...f, tel: e.target.value }))} />
          <input className="border p-2 rounded" placeholder="Email" value={form.email || ''} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <input className="border p-2 rounded" placeholder="CCCD/CMND" value={form.identity_card_number || ''} onChange={(e) => setForm(f => ({ ...f, identity_card_number: e.target.value }))} />
        </div>
        <div className="mt-2 flex gap-2">
          <button className="bg-blue-600 text-white px-4 rounded" onClick={submit}>
            {editingId ? 'Lưu' : 'Thêm'}
          </button>
          {editingId && (
            <button
              className="px-3 rounded border"
              onClick={() => { setEditingId(null); setForm({ name: '', tel: '', email: '' }); }}
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          className="border p-2 rounded w-80"
          placeholder="Tìm theo tên/điện thoại/email"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      <table className="w-full bg-white shadow rounded overflow-hidden">
        <thead className="bg-gray-200 text-left">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Tên</th>
            <th className="p-2">Điện thoại</th>
            <th className="p-2">Email</th>
            <th className="p-2 w-56">Thao tác</th> {/* tăng rộng để thêm nút Hợp đồng */}
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="p-2">{t.id}</td>

              {/* 👇 Biến tên thành link để xem hợp đồng */}
              <td className="p-2">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => openContracts(t.id)}
                  title="Xem hợp đồng của người thuê này"
                >
                  {t.name}
                </button>
              </td>

              <td className="p-2">{t.tel}</td>
              <td className="p-2">{t.email}</td>
              <td className="p-2 flex items-center gap-3">
                <button className="text-blue-600" onClick={() => edit(t)}>Sửa</button>
                <button className="text-red-600" onClick={() => remove(t.id)}>Xóa</button>
                {/* 👇 nút phụ để xem hợp đồng */}
                <button
                  className="px-2 py-1 border rounded hover:bg-gray-50"
                  onClick={() => openContracts(t.id)}
                >
                  Hợp đồng
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2 mt-3">
        <button className="border px-3 py-1 rounded" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&lt; Trước</button>
        <span className="px-2 py-1">Trang {page}/{Math.max(1, Math.ceil(total / take))}</span>
        <button className="border px-3 py-1 rounded" disabled={page * take >= total} onClick={() => setPage(p => p + 1)}>Sau &gt;</button>
      </div>
    </div>
  );
}

export default Tenants;
