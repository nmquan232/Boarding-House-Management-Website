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
    <div className="p-2 md:p-4">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">🏠 Phòng</h2>

      {/* Chọn tòa */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          value={apartmentId}
          onChange={(e) => setApartmentId(Number(e.target.value))}
        >
          {apartments.map(ap => (
            <option key={ap.id} value={ap.id}>{ap.name} (#{ap.id})</option>
          ))}
        </select>
        <input
          className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          placeholder="🔍 Tìm theo số phòng"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Form tạo/sửa */}
      <div className="bg-white shadow-md rounded-lg p-4 md:p-6 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Số phòng"
            value={form.room_number}
            onChange={(e) => setForm(f => ({ ...f, room_number: e.target.value }))}
          />
          <input
            className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Giá mặc định (VND)"
            value={form.default_price}
            onChange={(e) => setForm(f => ({ ...f, default_price: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            className="border border-gray-300 p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Số người tối đa"
            value={form.max_tenant}
            onChange={(e) => {
              const val = Number(e.target.value);
              setForm(f => ({ ...f, max_tenant: val > 0 ? val : 1 }));
            }}
          />
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base shadow-md flex-1" onClick={submit}>
              {editingId ? 'Lưu' : 'Thêm'}
            </button>
            {editingId && (
              <button className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm md:text-base" onClick={() => { setEditingId(null); setForm({ room_number: '', default_price: '0', max_tenant: 1 }); }}>
                Hủy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách phòng */}
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
        <table className="min-w-[500px] w-full bg-white">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">ID</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Số phòng</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Giá mặc định</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Tối đa</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold w-32 md:w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-4 md:p-6 text-gray-500">Không có dữ liệu</td>
              </tr>
            ) : (
              items.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-2 md:p-3 text-sm">{r.id}</td>
                  <td className="p-2 md:p-3 font-medium text-sm md:text-base">{r.room_number}</td>
                  <td className="p-2 md:p-3 text-sm">{String(r.default_price)}</td>
                  <td className="p-2 md:p-3 text-sm">{r.max_tenant ?? '—'}</td>
                  <td className="p-2 md:p-3">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800 text-xs md:text-sm px-2 py-1 rounded hover:bg-blue-50 transition" onClick={() => edit(r)}>Sửa</button>
                      <button className="text-red-600 hover:text-red-800 text-xs md:text-sm px-2 py-1 rounded hover:bg-red-50 transition" onClick={() => remove(r.id)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 md:gap-3 mt-4 items-center flex-wrap justify-center md:justify-start">
        <button className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          &lt; Trước
        </button>
        <span className="text-sm md:text-base px-2">Trang {page}/{pages}</span>
        <button className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
          Sau &gt;
        </button>
      </div>
    </div>
  );
}
