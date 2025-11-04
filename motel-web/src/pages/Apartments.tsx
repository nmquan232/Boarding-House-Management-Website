import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import Confirm from '../components/Confirm';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import type { Apartment, PrefRow } from '../api/apartmentsApi';
import {
  fetchApartments,
  createApartment,
  updateApartment,
  deleteApartment,
  fetchPrefectures,
} from '../api/apartmentsApi';


type Option = { id: string; name: string };

export default function Apartments() {
  // ==== Biến trạng thái cho danh sách tòa nhà ====
  const [items, setItems] = useState<Apartment[]>([]);      // danh sách tòa nhà
  const [q, setQ] = useState('');                           // chuỗi tìm kiếm
  const [page, setPage] = useState(1);                      // trang hiện tại
  const [take] = useState(10);                              // số lượng hiển thị mỗi trang
  const [total, setTotal] = useState(0);                    // tổng số tòa nhà
  const pages = Math.max(1, Math.ceil(total / take));        // tổng số trang
  const [loading, setLoading] = useState(false);             // trạng thái đang tải
  const navigate = useNavigate();
  

  // ==== Danh sách địa phương (từ bảng Prefecture, chỉ gọi 1 lần) ====
  //  const [prefData, setPrefData] = useState<PrefRow[]>([]);

  // ==== Quản lý modal thêm/sửa tòa nhà ====
  const [openModal, setOpenModal] = useState(false);         // bật/tắt modal
  const [editingId, setEditingId] = useState<number | null>(null); // id đang sửa
  const [form, setForm] = useState<Partial<Apartment>>({});  // dữ liệu form nhập

  // ==== Quản lý hộp xác nhận khi xóa ====
  const [openConfirm, setOpenConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ==== Lấy danh sách tỉnh / quận / phường từ dữ liệu Prefecture (lọc trên FE) ====

  // Danh sách tỉnh/thành phố (unique)
  // const provinces: Option[] = useMemo(() => {
  //   const map = new Map<string, string>();
  //   for (const r of prefData)
  //     if (r.province_id && r.province_name && !map.has(r.province_id))
  //       map.set(r.province_id, r.province_name);
  //   return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  // }, [prefData]);

  // Danh sách quận/huyện theo tỉnh đã chọn
  // const districts: Option[] = useMemo(() => {
  //   if (!form.province_id) return [];
  //   const map = new Map<string, string>();
  //   for (const r of prefData) {
  //     if (r.province_id === form.province_id && r.district_id && r.district_name && !map.has(r.district_id))
  //       map.set(r.district_id, r.district_name);
  //   }
  //   return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  // }, [prefData, form.province_id]);

  // // Danh sách xã/phường theo quận đã chọn
  // const wards: Option[] = useMemo(() => {
  //   if (!form.district_id) return [];
  //   const map = new Map<string, string>();
  //   for (const r of prefData) {
  //     if (r.district_id === form.district_id && r.ward_id && r.ward_name && !map.has(r.ward_id))
  //       map.set(r.ward_id, r.ward_name);
  //   }
  //   return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  // }, [prefData, form.district_id]);

  // Hàm lấy tên hiển thị (ví dụ từ id → tên tỉnh)
  // const nameOf = (id: string | null | undefined, list: Option[]) =>
  //   (id && list.find(x => x.id === id)?.name) || '';

  // ==== Gọi API lấy danh sách tòa nhà ====
  const loadList = async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchApartments({ q, page, take });
      setItems(items);
      setTotal(total);
    } catch (e: any) {
      console.error(e);
      toast.error('Không thể tải danh sách tòa nhà');
    } finally {
      setLoading(false);
    }
  };

  // Gọi API mỗi khi thay đổi trang hoặc từ khóa tìm kiếm
  useEffect(() => {
    loadList();
  }, [q, page]);

  // Lấy danh sách địa phương 1 lần duy nhất
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const data = await fetchPrefectures();
  //       setPrefData(data);
  //     } catch {
  //       toast.error('Không tải được danh sách địa phương');
  //     }
  //   })();
  // }, []);

  // ==== Các hành động CRUD ====

  // Mở modal tạo mới
  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpenModal(true);
  };

  // Mở modal chỉnh sửa
  const openEdit = (ap: Apartment) => {
    setEditingId(ap.id);
    setForm({
      id: ap.id,
      name: ap.name,
      address: ap.address ?? '',
      province_id: ap.province_id ?? '',
      district_id: ap.district_id ?? '',
      ward_id: ap.ward_id ?? '',
      imagePath: ap.imagePath ?? null,
    });
    setOpenModal(true);
  };

  // Lưu (tạo mới hoặc cập nhật)
  const save = async () => {
    if (!form.name || !form.name.trim()) {
      toast.error('Vui lòng nhập tên tòa nhà');
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address?.toString().trim() || null,
      province_id: form.province_id || null,
      district_id: form.district_id || null,
      ward_id: form.ward_id || null,
      imagePath: form.imagePath || null,
    };
    try {
      if (editingId) {
        await updateApartment(editingId, payload);
        toast.success('Cập nhật thành công');
      } else {
        await createApartment(payload);
        toast.success('Thêm tòa nhà mới thành công');
      }
      setOpenModal(false);
      setPage(1);
      await loadList();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Lưu thất bại');
    }
  };

  // Hiển thị xác nhận xóa
  const askDelete = (id: number) => {
    setDeleteId(id);
    setOpenConfirm(true);
  };

  // Thực hiện xóa
  const doDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteApartment(deleteId);
      toast.success('Đã xóa thành công');
      setOpenConfirm(false);
      setDeleteId(null);

      // Kiểm tra nếu trang hiện tại hết dữ liệu thì quay lại trang trước
      const newCount = total - 1;
      const maxPage = Math.max(1, Math.ceil(newCount / take));
      if (page > maxPage) setPage(maxPage);

      await loadList();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Xóa thất bại');
    }
  };

  // ==== Xử lý chọn tỉnh / quận / phường trong form ====
  // const onProvince = (val: string) =>
  //   setForm(f => ({ ...f, province_id: val || null, district_id: null, ward_id: null }));
  // const onDistrict = (val: string) =>
  //   setForm(f => ({ ...f, district_id: val || null, ward_id: null }));
  // const onWard = (val: string) =>
  //   setForm(f => ({ ...f, ward_id: val || null }));

  // ==== Xuất file CSV (chức năng phụ) ====
  const exportCsv = () => {
    const headers = ['id', 'name', 'address', 'province_id', 'district_id', 'ward_id'];
    const lines = [headers.join(',')].concat(
      items.map(i => [
        i.id,
        `"${(i.name || '').replace(/"/g, '""')}"`,
        `"${(i.address || '').replace(/"/g, '""')}"`,
        i.province_id || '',
        i.district_id || '',
        i.ward_id || '',
      ].join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apartments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==== Giao diện ====
  return (
    <div className="p-4">
      {/* Tiêu đề + nút chức năng */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">🏢 Quản lý Tòa nhà</h2>
        <div className="flex gap-2">
          <button onClick={openCreate} className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-green-700">➕ Thêm</button>
          <button onClick={exportCsv} className="bg-green-800 border px-4 py-2 rounded">⬇️ Xuất CSV</button>
        </div>
      </div>

      {/* Ô tìm kiếm */}
      <div className="flex items-center gap-2 mb-4">
        <input
          className="border p-2 rounded w-full md:w-96 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          placeholder="🔍 Tìm theo tên hoặc địa chỉ..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      {/* Bảng danh sách tòa nhà */}
      <div className="overflow-x-auto">
        <table className="min-w-[800px] w-full bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
          <thead className="bg-blue-50 text-gray-700">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Tên</th>
              <th className="p-3 text-left">Địa chỉ</th>
              <th className="p-3 text-left">Tỉnh</th>
              <th className="p-3 text-left">Quận/Huyện</th>
              <th className="p-3 text-left">Xã/Phường</th>
              <th className="p-3 text-left">Ảnh</th>
              <th className="p-3 text-center w-40">Thao tác</th>
            </tr>
          </thead>
          {/* <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center p-4 text-gray-500">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center p-4 text-gray-500">Không có dữ liệu</td></tr>
            ) : (
              items.map((ap, i) => (
                <tr key={ap.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                  <td className="p-3">{ap.id}</td>
                  <td className="p-3 font-medium text-gray-800">{ap.name}</td>
                  <td className="p-3 text-gray-600">{ap.address}</td>
                  <td className="p-3 text-gray-600">{ap.province_id}</td>
                  <td className="p-3 text-gray-600">{ap.district_id}</td>
                  <td className="p-3 text-gray-600">{ap.ward_id}</td>
                  <td className="p-3">
                    {ap.imagePath ? <img src={ap.imagePath} className="h-10 rounded" /> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="p-3 text-center">
                    <button className="text-blue-600 hover:underline mr-3" onClick={() => openEdit(ap)}>Sửa</button>
                    <button className="text-red-600 hover:underline" onClick={() => askDelete(ap.id)}>Xóa</button>
                  </td>
                </tr>
              ))
            )}
          </tbody> */}
          <tbody>
            {items.map((ap, i) => (
              <tr
                key={ap.id}
                className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition cursor-pointer`}
                onClick={() => navigate(`/apartments/${ap.id}/rooms`)} // 👈 thêm dòng này
              >
                <td className="p-3">{ap.id}</td>
                <td className="p-3 font-medium text-blue-700 hover:underline">
                  {ap.name}
                </td>
                <td className="p-3 text-gray-600">{ap.address}</td>
                <td className="p-3 text-gray-600">{ap.province_id}</td>
                <td className="p-3 text-gray-600">{ap.district_id}</td>
                <td className="p-3 text-gray-600">{ap.ward_id}</td>
                <td className="p-3">
                  {ap.imagePath ? (
                    <img src={ap.imagePath} className="h-10 rounded" alt="Apartment" />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <button
                    className="text-blue-600 hover:underline mr-3"
                    onClick={(e) => {
                      e.stopPropagation(); // 👈 chặn click vào row
                      openEdit(ap);
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation(); // 👈 chặn click vào row
                      askDelete(ap.id);
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* Phân trang */}
      <div className="flex gap-3 mt-5 items-center flex-wrap">
        <button className="border px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&lt; Trang trước</button>
        <span>Trang <b>{page}</b> / {pages}</span>
        <button className="border px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Trang sau &gt;</button>
      </div>

      {/* Modal thêm / sửa tòa nhà */}
      <Modal open={openModal} title={editingId ? 'Sửa tòa nhà' : 'Thêm tòa nhà'} onClose={() => setOpenModal(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm">Tên tòa nhà</label>
            <input className="border p-2 rounded w-full" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm">Địa chỉ</label>
            <input className="border p-2 rounded w-full" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm">Tỉnh/Thành phố</label>
            <input className="border p-2 rounded w-full" value={form.province_id || ''} onChange={e => setForm(f => ({ ...f, province_id: e.target.value }))} />
            {/* <option value="">-- Chọn --</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} */}

          </div>
          <div>
            <label className="text-sm">Quận/Huyện</label>
            <input className="border p-2 rounded w-full" value={form.district_id || ''} onChange={e => setForm(f => ({ ...f, district_id: e.target.value }))} />
            {/* <option value="">-- Chọn --</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)} */}

          </div>
          <div>
            <label className="text-sm">Xã/Phường</label>
            <input className="border p-2 rounded w-full" value={form.ward_id || ''} onChange={e => setForm(f => ({ ...f, ward_id: e.target.value }))} />
            {/* <option value="">-- Chọn --</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)} */}

          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="text-sm">Ảnh tòa nhà</label>
            <ImageUploader value={form.imagePath || null} onChange={(url) => setForm(f => ({ ...f, imagePath: url }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setOpenModal(false)} className="px-4 py-2 rounded border">Hủy</button>
          <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">{editingId ? 'Lưu' : 'Tạo mới'}</button>
        </div>
      </Modal>

      {/* Hộp xác nhận khi xóa */}
      <Confirm
        open={openConfirm}
        message="Bạn có chắc chắn muốn xóa tòa nhà này?"
        onOK={doDelete}
        onCancel={() => { setOpenConfirm(false); setDeleteId(null); }}
      />
    </div>
  );
}
