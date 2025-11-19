import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";

type Contract = {
  id: number;
  apartment_room_id: number;
  tenant_id: number;
  price: string | number;
  start_date: string;
  end_date?: string | null;
  electricity_price?: string | number | null;
  electricity_num_start?: number | null;
  water_price?: string | number | null;
  water_number_start?: number | null;
  number_of_tenant_current?: number | null;
  note?: string | null;

  tenant?: { id: number; name: string } | null;
  apartment_room?: {
    id: number;
    room_number: string;
    apartment?: { id: number; name: string } | null;
  } | null;
};

function Contracts() {
  const [sp] = useSearchParams();
  const tenantIdFromQuery = sp.get("tenant_id");
  const tenantIdNumber = tenantIdFromQuery ? Number(tenantIdFromQuery) : undefined;

  const [items, setItems] = useState<Contract[]>([]);
  const [page, setPage] = useState(1);
  const [take] = useState(10);
  const [total, setTotal] = useState(0);

  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "detail">("create");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: 0,
    apartment_room_id: "",
    tenant_id: "",
    // giá phòng sẽ tự fill từ /rooms/:id, trường này chỉ để hiển thị
    price: "",
    electricity_price: "3500",
    electricity_num_start: "" as string | "",
    water_price: "15000",
    water_number_start: "" as string | "",
    number_of_tenant_current: 1,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "" as string | "",
  });

  const pages = useMemo(() => Math.max(1, Math.ceil(total / take)), [total, take]);

  const load = async () => {
    const res = await axiosClient.get("/contracts", {
      params: { page, take, tenant_id: tenantIdNumber },
    });

    const safeItems = (res.data.items || []).map((x: any) => ({
      ...x,
      price: String(x.price),
    })) as Contract[];

    setItems(safeItems);
    setTotal(res.data.total || 0);
  };

  useEffect(() => {
    setPage(1);
  }, [tenantIdNumber]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tenantIdNumber]);

  const resetForm = () =>
    setForm({
      id: 0,
      apartment_room_id: "",
      tenant_id: tenantIdNumber ? String(tenantIdNumber) : "",
      price: "",
      electricity_price: "3500",
      electricity_num_start: "",
      water_price: "15000",
      water_number_start: "",
      number_of_tenant_current: 1,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: "",
    });

  /** ========================= FETCH ROOM PRICE WHEN ROOM CHANGES ========================= */
  useEffect(() => {
    if (!openModal) return; // chỉ fetch khi đang mở modal
    const roomIdRaw = form.apartment_room_id;
    if (!roomIdRaw || !String(roomIdRaw).trim()) {
      setForm((f) => ({ ...f, price: "" }));
      return;
    }
    const roomId = Number(roomIdRaw);
    if (!Number.isFinite(roomId) || roomId <= 0) {
      setForm((f) => ({ ...f, price: "" }));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // giả định API /rooms/:id trả { id, room_number, price, ... }
        const res = await axiosClient.get(`/rooms/${roomId}`);
        const price = res.data?.price != null ? String(res.data.price) : "";
        if (!cancelled) {
          setForm((f) => ({ ...f, price }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setForm((f) => ({ ...f, price: "" }));
          // hiển thị cảnh báo nhẹ, tránh làm phiền
          console.warn(e?.response?.data?.message || "Không tìm thấy phòng hoặc lỗi khi lấy giá phòng");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.apartment_room_id, openModal]);

  /** ========================= CRUD FUNCTIONS ========================= */

  const openCreate = () => {
    resetForm();
    setModalMode("create");
    setOpenModal(true);
  };

  const openEdit = async (id: number) => {
    try {
      const res = await axiosClient.get(`/contracts/${id}`);
      const c = res.data;
      setForm({
        id: c.id,
        apartment_room_id: String(c.apartment_room_id),
        tenant_id: String(c.tenant_id),
        price: String(c.price), // hiển thị giá hiện tại của HĐ; nếu user đổi phòng, effect trên sẽ autofill lại
        electricity_price: String(c.electricity_price ?? ""),
        electricity_num_start: String(c.electricity_num_start ?? ""),
        water_price: String(c.water_price ?? ""),
        water_number_start: String(c.water_number_start ?? ""),
        number_of_tenant_current: c.number_of_tenant_current ?? 1,
        start_date: c.start_date?.slice(0, 10) ?? "",
        end_date: c.end_date?.slice(0, 10) ?? "",
      });
      setModalMode("edit");
      setOpenModal(true);
    } catch (err) {
      console.error(err);
      alert("Không thể tải thông tin hợp đồng");
    }
  };

  const openDetail = async (id: number) => {
    try {
      const res = await axiosClient.get(`/contracts/${id}`);
      const c = res.data;
      setForm({
        id: c.id,
        apartment_room_id: String(c.apartment_room_id),
        tenant_id: String(c.tenant_id),
        price: String(c.price),
        electricity_price: String(c.electricity_price ?? ""),
        electricity_num_start: String(c.electricity_num_start ?? ""),
        water_price: String(c.water_price ?? ""),
        water_number_start: String(c.water_number_start ?? ""),
        number_of_tenant_current: c.number_of_tenant_current ?? 1,
        start_date: c.start_date?.slice(0, 10) ?? "",
        end_date: c.end_date?.slice(0, 10) ?? "",
      });
      setModalMode("detail");
      setOpenModal(true);
    } catch (err) {
      console.error(err);
      alert("Không thể xem chi tiết hợp đồng");
    }
  };

  const submit = async () => {
    if (saving) return;
    if (!form.apartment_room_id.trim() || !(form.tenant_id || "").trim()) {
      alert("Vui lòng nhập Room ID và Tenant ID");
      return;
    }
    if (!form.start_date) {
      alert("Vui lòng chọn ngày bắt đầu");
      return;
    }

    try {
      setSaving(true);

      if (modalMode === "create") {
        // KHÔNG gửi price - BE tự lấy giá từ phòng
        await axiosClient.post("/contracts", {
          apartment_room_id: Number(form.apartment_room_id),
          tenant_id: Number(form.tenant_id),
          // price: form.price,            // 🚫 bỏ
          electricity_price: form.electricity_price || null,
          electricity_num_start: form.electricity_num_start ? Number(form.electricity_num_start) : null,
          water_price: form.water_price || null,
          water_number_start: form.water_number_start ? Number(form.water_number_start) : null,
          number_of_tenant_current: form.number_of_tenant_current || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
        });
      } else if (modalMode === "edit") {
        // KHÔNG gửi price trong update; nếu đổi phòng, BE sẽ auto cập nhật theo phòng mới
        await axiosClient.put(`/contracts/${form.id}`, {
          apartment_room_id: Number(form.apartment_room_id),
          tenant_id: Number(form.tenant_id),
          // price: form.price,            // 🚫 bỏ
          electricity_price: form.electricity_price || null,
          electricity_num_start: form.electricity_num_start ? Number(form.electricity_num_start) : null,
          water_price: form.water_price || null,
          water_number_start: form.water_number_start ? Number(form.water_number_start) : null,
          number_of_tenant_current: form.number_of_tenant_current || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
        });
      }

      setOpenModal(false);
      await load();
    } catch (e: any) {
      console.error(e?.response?.data || e);
      alert(e?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa hợp đồng này không?")) return;
    try {
      await axiosClient.delete(`/contracts/${id}`);
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Xóa hợp đồng thất bại");
    }
  };

  /** ========================= UI HELPERS ========================= */
  const displayTenant = (c: Contract) => c.tenant?.name ?? `#${c.tenant_id}`;
  const displayApartment = (c: Contract) => c.apartment_room?.apartment?.name ?? "";
  const displayRoom = (c: Contract) => c.apartment_room?.room_number ?? `#${c.apartment_room_id}`;

  return (
    <div className="p-2 md:p-4">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          📄 Hợp đồng {tenantIdNumber ? `(Người thuê #${tenantIdNumber})` : ""}
        </h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base shadow-md"
          onClick={openCreate}
        >
          ➕ Thêm hợp đồng
        </button>
      </div>

      {/* Danh sách hợp đồng */}
      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
        <table className="min-w-[800px] w-full bg-white">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">ID</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Người thuê</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden md:table-cell">Tòa</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Phòng</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden lg:table-cell">Giá</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden sm:table-cell">Bắt đầu</th>
              <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden lg:table-cell">Kết thúc</th>
              <th className="p-2 md:p-3 text-center text-xs md:text-sm font-semibold w-32 md:w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 md:p-6 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-2 md:p-3 text-sm">{c.id}</td>
                  <td className="p-2 md:p-3 text-sm md:text-base font-medium">{displayTenant(c)}</td>
                  <td className="p-2 md:p-3 text-sm hidden md:table-cell">{displayApartment(c) || "—"}</td>
                  <td className="p-2 md:p-3 text-sm md:text-base">{displayRoom(c)}</td>
                  <td className="p-2 md:p-3 text-sm hidden lg:table-cell">{String(c.price)}</td>
                  <td className="p-2 md:p-3 text-xs md:text-sm hidden sm:table-cell">{c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}</td>
                  <td className="p-2 md:p-3 text-xs md:text-sm hidden lg:table-cell">{c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}</td>
                  <td className="p-2 md:p-3 text-center">
                    <div className="flex gap-1 md:gap-2 justify-center">
                      <button className="text-blue-600 hover:text-blue-800 text-xs md:text-sm px-1 md:px-2 py-1 rounded hover:bg-blue-50 transition" onClick={() => openDetail(c.id)} title="Chi tiết">ℹ️</button>
                      <button className="text-green-600 hover:text-green-800 text-xs md:text-sm px-1 md:px-2 py-1 rounded hover:bg-green-50 transition" onClick={() => openEdit(c.id)} title="Sửa">✏️</button>
                      <button className="text-red-600 hover:text-red-800 text-xs md:text-sm px-1 md:px-2 py-1 rounded hover:bg-red-50 transition" onClick={() => remove(c.id)} title="Xóa">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      <div className="flex gap-2 md:gap-3 mt-4 items-center flex-wrap justify-center md:justify-start">
        <button
          className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          &lt; Trước
        </button>
        <span className="text-sm md:text-base px-2">
          Trang {page}/{pages}
        </span>
        <button
          className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau &gt;
        </button>
      </div>

      {/* Modal thêm/sửa/xem chi tiết */}
      <Modal
        open={openModal}
        title={
          modalMode === "create"
            ? "Tạo hợp đồng"
            : modalMode === "edit"
              ? "Cập nhật hợp đồng"
              : "Chi tiết hợp đồng"
        }
        onClose={() => setOpenModal(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (modalMode !== "detail") submit();
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
        >
          {[
            ["Room ID", "apartment_room_id"],
            ["Tenant ID", "tenant_id"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-sm">{label}</label>
              <input
                className="border p-2 rounded w-full"
                value={(form as any)[key]}
                disabled={modalMode === "detail" || (key === "tenant_id" && !!tenantIdNumber)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </div>
          ))}

          {/* Giá phòng: chỉ hiển thị, tự fill, không cho sửa */}
          <div>
            <label className="text-sm">Giá phòng (VNĐ)</label>
            <input
              className="border p-2 rounded w-full bg-gray-50"
              value={form.price}
              placeholder="Tự điền theo Room"
              readOnly
              disabled
            />
          </div>

          <div>
            <label className="text-sm">Giá điện (đ/kWh)</label>
            <input
              className="border p-2 rounded w-full"
              value={form.electricity_price}
              disabled={modalMode === "detail"}
              onChange={(e) => setForm((f) => ({ ...f, electricity_price: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm">Chỉ số điện ban đầu (kWh)</label>
            <input
              type="number"
              min="0"
              className="border p-2 rounded w-full"
              value={form.electricity_num_start}
              disabled={modalMode === "detail"}
              onChange={(e) => setForm((f) => ({ ...f, electricity_num_start: e.target.value }))}
              placeholder="Nhập chỉ số điện khi bắt đầu"
            />
          </div>

          <div>
            <label className="text-sm">Giá nước (đ/m³)</label>
            <input
              className="border p-2 rounded w-full"
              value={form.water_price}
              disabled={modalMode === "detail"}
              onChange={(e) => setForm((f) => ({ ...f, water_price: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm">Chỉ số nước ban đầu (m³)</label>
            <input
              type="number"
              min="0"
              className="border p-2 rounded w-full"
              value={form.water_number_start}
              disabled={modalMode === "detail"}
              onChange={(e) => setForm((f) => ({ ...f, water_number_start: e.target.value }))}
              placeholder="Nhập chỉ số nước khi bắt đầu"
            />
          </div>

          <div>
            <label className="text-sm">Số người ở phòng</label>
            <input
              type="number"
              min="1"
              className="border p-2 rounded w-full"
              value={form.number_of_tenant_current}
              disabled={modalMode === "detail"}
              onChange={(e) => {
                const val = Number(e.target.value);
                setForm((f) => ({ ...f, number_of_tenant_current: val > 0 ? val : 1 }));
              }}
            />
          </div>

          <div>
            <label className="text-sm">Ngày bắt đầu</label>
            <input
              className="border p-2 rounded w-full"
              type="date"
              value={form.start_date}
              disabled={modalMode === "detail"}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm">Ngày kết thúc</label>
            <input
              className="border p-2 rounded w-full"
              type="date"
              value={form.end_date || ""}
              disabled={modalMode === "detail"}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 mt-2">
            <button type="button" className="px-4 py-2 rounded border" onClick={() => setOpenModal(false)}>
              Đóng
            </button>
            {modalMode !== "detail" && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : modalMode === "create" ? "Tạo hợp đồng" : "Cập nhật"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Contracts;
