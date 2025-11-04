import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Modal from '../components/Modal';

type Contract = {
  id: number;
  apartment_room_id: number;
  tenant_id: number;
  price: string | number;
  start_date: string;
  end_date?: string | null;

  // nếu backend include thêm:
  tenant?: { id: number; name: string } | null;
  apartment_room?: {
    id: number;
    room_number: string;
    apartment?: { id: number; name: string } | null;
  } | null;
};

function Contracts() {
  const [sp] = useSearchParams();
  const tenantIdFromQuery = sp.get('tenant_id'); // "5" | null
  const tenantIdNumber = tenantIdFromQuery ? Number(tenantIdFromQuery) : undefined;

  const [items, setItems] = useState<Contract[]>([]);
  const [page, setPage] = useState(1);
  const [take] = useState(10);
  const [total, setTotal] = useState(0);


  // Modal + form
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    apartment_room_id: '',
    tenant_id: '',
    price: '2500000',
    electricity_price: '3500',
    water_price: '15000',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '' as string | '',
  });

  const pages = useMemo(() => Math.max(1, Math.ceil(total / take)), [total, take]);

  const load = async () => {
    const res = await axiosClient.get('/contracts', {
      params: {
        page,
        take,
        tenant_id: tenantIdNumber // <-- lọc theo tenant nếu có
      },
    });

    const safeItems = (res.data.items || []).map((x: any) => ({
      ...x,
      price: String(x.price),
    })) as Contract[];

    setItems(safeItems);
    setTotal(res.data.total || 0);
  };

  useEffect(() => {
    // Nếu đang xem theo tenant cụ thể, reset về trang 1 khi tenant_id thay đổi
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantIdNumber]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tenantIdNumber]);

  const resetForm = () =>
    setForm({
      apartment_room_id: '',
      tenant_id: tenantIdNumber ? String(tenantIdNumber) : '', // auto fill nếu có tenant_id
      price: '2500000',
      electricity_price: '3500',
      water_price: '15000',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
    });

  const openCreate = () => {
    resetForm();
    setOpenModal(true);
  };

  const submit = async () => {
    if (saving) return;

    if (!form.apartment_room_id.trim() || !(form.tenant_id || '').trim()) {
      alert('Vui lòng nhập Room ID và Tenant ID');
      return;
    }
    if (!form.start_date) {
      alert('Vui lòng chọn ngày bắt đầu');
      return;
    }

    try {
      setSaving(true);
      await axiosClient.post('/contracts', {
        apartment_room_id: Number(form.apartment_room_id),
        tenant_id: Number(form.tenant_id),
        price: form.price,
        electricity_price: form.electricity_price,
        water_price: form.water_price,
        start_date: form.start_date,
        end_date: form.end_date || null,
      });
      setOpenModal(false);
      await load();
    } catch (e: any) {
      console.error('Create contract error:', e?.response?.data || e);
      alert(e?.response?.data?.message || 'Tạo hợp đồng thất bại');
    } finally {
      setSaving(false);
    }
  };

  // helper hiển thị đẹp: tên tòa, phòng, tenant
  const displayTenant = (c: Contract) => c.tenant?.name ?? `#${c.tenant_id}`;
  const displayApartment = (c: Contract) => c.apartment_room?.apartment?.name ?? '';
  const displayRoom = (c: Contract) => c.apartment_room?.room_number ?? `#${c.apartment_room_id}`;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Hợp đồng {tenantIdNumber ? `(Người thuê #${tenantIdNumber})` : ''}
        </h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:opacity-90"
          onClick={openCreate}
        >
          ➕ Thêm hợp đồng
        </button>
      </div>

      {/* Bảng danh sách */}
      <table className="w-full bg-white shadow rounded overflow-hidden">
        <thead className="bg-gray-200 text-left">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Người thuê</th>
            <th className="p-2">Tòa</th>
            <th className="p-2">Phòng</th>
            <th className="p-2">Giá</th>
            <th className="p-2">Bắt đầu</th>
            <th className="p-2">Kết thúc</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="p-2">{c.id}</td>
              <td className="p-2">{displayTenant(c)}</td>
              <td className="p-2">{displayApartment(c) || '—'}</td>
              <td className="p-2">{displayRoom(c)}</td>
              <td className="p-2">{String(c.price)}</td>
              <td className="p-2">
                {c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}
              </td>
              <td className="p-2">
                {c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="p-3 text-center text-gray-500" colSpan={7}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Phân trang */}
      <div className="flex gap-2 mt-3 items-center">
        <button
          className="border px-3 py-1 rounded disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          &lt; Trước
        </button>
        <span className="px-2 py-1">
          Trang {page}/{pages}
        </span>
        <button
          className="border px-3 py-1 rounded disabled:opacity-50"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau &gt;
        </button>
      </div>

      {/* Modal tạo hợp đồng */}
      <Modal
        open={openModal}
        title="Tạo hợp đồng"
        onClose={() => setOpenModal(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div>
            <label className="text-sm">Room ID</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="Room ID"
              value={form.apartment_room_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, apartment_room_id: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Tenant ID</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="Tenant ID"
              value={form.tenant_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, tenant_id: e.target.value }))
              }
              disabled={!!tenantIdNumber} // nếu đang lọc theo tenant → khoá để khỏi nhầm
            />
          </div>
          <div>
            <label className="text-sm">Giá phòng (VNĐ)</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="Giá phòng"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm">Giá điện (đ/kWh)</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="Giá điện"
              value={form.electricity_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, electricity_price: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Giá nước (đ/m³)</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="Giá nước"
              value={form.water_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, water_price: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Ngày bắt đầu</label>
            <input
              className="border p-2 rounded w-full"
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_date: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Ngày kết thúc (tùy chọn)</label>
            <input
              className="border p-2 rounded w-full"
              type="date"
              value={form.end_date || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, end_date: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => setOpenModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {saving ? 'Đang tạo...' : 'Tạo hợp đồng'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Contracts;
