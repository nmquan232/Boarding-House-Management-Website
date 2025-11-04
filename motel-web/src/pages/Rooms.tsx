import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';

type Apartment = { id: number; name: string };
type Room = {
  id: number;
  apartment_id: number;
  room_number: string;
  default_price: string | number | bigint; // server có thể trả BigInt->string
  max_tenant?: number | null;
};

export default function Rooms() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [apartmentId, setApartmentId] = useState<number | ''>('');
  const [items, setItems] = useState<Room[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [take] = useState(10);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    room_number: '',
    default_price: '',
    max_tenant: 1,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / take)), [total, take]);

  const loadApartments = async () => {
    const res = await axiosClient.get('/apartments', { params: { page: 1, take: 1000 } });
    setApartments(res.data.items || []);
    if (!apartmentId && res.data.items?.length) setApartmentId(res.data.items[0].id);
  };

  const loadRooms = async () => {
    if (!apartmentId) return;
    const res = await axiosClient.get(`/apartments/${apartmentId}/rooms`, {
      params: { q, page, take },
    });
    const safeItems: Room[] = (res.data.items || []).map((r: any) => ({
      ...r,
      default_price: String(r.default_price),
    }));
    setItems(safeItems);
    setTotal(res.data.total || 0);
  };

  useEffect(() => { loadApartments(); }, []);
  useEffect(() => { setPage(1); }, [apartmentId, q]);     // reset trang khi đổi tòa / search
  useEffect(() => { loadRooms(); /* eslint-disable-next-line */ }, [apartmentId, page, q]);

  const submit = async () => {
    if (!apartmentId) return alert('Chọn tòa nhà');
    if (!form.room_number) return alert('Nhập số phòng');
    if (editingId) {
      await axiosClient.put(`/rooms/${editingId}`, {
        room_number: form.room_number,
        default_price: form.default_price,
        max_tenant: form.max_tenant,
      });
      setEditingId(null);
    } else {
      await axiosClient.post(`/apartments/${apartmentId}/rooms`, {
        room_number: form.room_number,
        default_price: form.default_price,
        max_tenant: form.max_tenant,
      });
    }
    setForm({ room_number: '', default_price: '0', max_tenant: 1 });
    await loadRooms();
  };

  const edit = (r: Room) => {
    setEditingId(r.id);
    setForm({
      room_number: r.room_number,
      default_price: String(r.default_price ?? '0'),
      max_tenant: r.max_tenant ?? 1,
    });
  };

  const remove = async (id: number) => {
    if (!confirm('Xóa phòng này?')) return;
    await axiosClient.delete(`/rooms/${id}`);
    await loadRooms();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Phòng</h2>

      {/* Chọn tòa */}
      <div className="flex gap-2 mb-3">
        <select
          className="border p-2 rounded"
          value={apartmentId}
          onChange={(e) => setApartmentId(Number(e.target.value))}
        >
          {apartments.map(ap => (
            <option key={ap.id} value={ap.id}>{ap.name} (#{ap.id})</option>
          ))}
        </select>
        <input
          className="border p-2 rounded w-64"
          placeholder="Tìm theo số phòng"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Form tạo/sửa */}
      <div className="bg-white shadow p-4 rounded mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          className="border p-2 rounded"
          placeholder="Số phòng"
          value={form.room_number}
          onChange={(e) => setForm(f => ({ ...f, room_number: e.target.value }))}
        />
        <input
          className="border p-2 rounded"
          placeholder="Giá mặc định (VND)"
          value={form.default_price}
          onChange={(e) => setForm(f => ({ ...f, default_price: e.target.value }))}
        />
        <input
          type="number"
          className="border p-2 rounded"
          placeholder="Số người tối đa"
          value={form.max_tenant}
          onChange={(e) => setForm(f => ({ ...f, max_tenant: Number(e.target.value) }))}
        />
        <div>
          <button className="bg-blue-600 text-white px-4 rounded mr-2" onClick={submit}>
            {editingId ? 'Lưu' : 'Thêm'}
          </button>
          {editingId && (
            <button className="border px-4 rounded" onClick={() => { setEditingId(null); setForm({ room_number: '', default_price: '0', max_tenant: 1 }); }}>
              Hủy
            </button>
          )}
        </div>
      </div>

      {/* Danh sách phòng */}
      <table className="w-full bg-white shadow rounded overflow-hidden">
        <thead className="bg-gray-200 text-left">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Số phòng</th>
            <th className="p-2">Giá mặc định</th>
            <th className="p-2">Tối đa</th>
            <th className="p-2 w-40">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.id}</td>
              <td className="p-2">{r.room_number}</td>
              <td className="p-2">{String(r.default_price)}</td>
              <td className="p-2">{r.max_tenant ?? '-'}</td>
              <td className="p-2">
                <button className="text-blue-600 mr-3" onClick={() => edit(r)}>Sửa</button>
                <button className="text-red-600" onClick={() => remove(r.id)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex gap-2 mt-3">
        <button className="border px-3 py-1 rounded" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          &lt; Trước
        </button>
        <span className="px-2 py-1">Trang {page}/{pages}</span>
        <button className="border px-3 py-1 rounded" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
          Sau &gt;
        </button>
      </div>
    </div>
  );
}
