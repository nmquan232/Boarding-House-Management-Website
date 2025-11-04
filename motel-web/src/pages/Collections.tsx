// src/pages/Collections.tsx
import { useMemo, useState } from 'react';
import Modal from '../components/Modal';
import {
  generateCollection,
  getBillDetail,
  payBill,
  type Bill,
} from '../api/collectionsApi';
import { previewMonth, type PreviewResult } from '../api/usagesApi.js';

function formatVND(s?: string | null) {
  if (!s) return '0';
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return new Intl.NumberFormat('vi-VN').format(n);
}

export default function Collections() {
  // Bill hiện tại (sau khi tạo / xem chi tiết / thanh toán)
  const [bill, setBill] = useState<Bill | null>(null);

  // Modal states
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openPay, setOpenPay] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);

  // Loading cho từng hành động
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [creatingFromPreview, setCreatingFromPreview] = useState(false);

  // Form: Tạo hóa đơn
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [createForm, setCreateForm] = useState({
    contract_id: '',
    period: defaultPeriod, // YYYY-MM
    charge_date: '', // optional ISO yyyy-mm-dd
  });

  // Form: Xem hóa đơn
  const [viewForm, setViewForm] = useState({ bill_id: '' });

  // Form: Ghi thanh toán
  const [payForm, setPayForm] = useState({
    bill_id: '',
    amount: '1000000',
    paid_date: '',
  });

  // Form: Preview usages
  const [previewForm, setPreviewForm] = useState({
    room_id: '',
    month: defaultPeriod, // YYYY-MM
    charge_date: '', // optional yyyy-mm-dd
  });
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Tính còn lại = total_price - total_paid
  const remain = useMemo(() => {
    if (!bill) return '0';
    const tp = Number(bill.total_price || 0);
    const pd = Number(bill.total_paid || 0);
    const r = Math.max(0, tp - pd);
    return String(r);
  }, [bill]);

  // ====== Actions: Collections ======
  const doCreate = async () => {
    if (creating) return;
    const { contract_id, period, charge_date } = createForm;
    if (!contract_id.trim() || !period.trim()) {
      alert('Vui lòng nhập Hợp đồng và Kỳ (YYYY-MM)');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(period.trim())) {
      alert('Kỳ (period) phải có dạng YYYY-MM (ví dụ 2025-10)');
      return;
    }
    try {
      setCreating(true);
      const data = await generateCollection({
        contract_id: Number(contract_id),
        period: period.trim(),
        ...(charge_date ? { charge_date } : {}),
      });
      setBill(data);
      setOpenCreate(false);
      alert('Đã tạo/xuất hóa đơn thành công!');
    } catch (e: any) {
      console.error('Generate error:', e?.response?.data || e);
      alert(e?.response?.data?.message || 'Lỗi tạo hóa đơn');
    } finally {
      setCreating(false);
    }
  };

  const doView = async () => {
    if (viewing) return;
    const id = Number(viewForm.bill_id);
    if (!id) {
      alert('Vui lòng nhập Bill ID hợp lệ');
      return;
    }
    try {
      setViewing(true);
      const data = await getBillDetail(id);
      setBill(data);
      setOpenView(false);
    } catch (e: any) {
      console.error('View error:', e?.response?.data || e);
      alert(e?.response?.data?.message || 'Không tìm thấy hóa đơn');
    } finally {
      setViewing(false);
    }
  };

  const doPay = async () => {
    if (paying) return;
    const id = Number(payForm.bill_id);
    const amountNum = Number(payForm.amount);
    if (!id || !Number.isFinite(amountNum) || amountNum <= 0) {
      alert('Vui lòng nhập Bill ID và Số tiền hợp lệ');
      return;
    }
    try {
      setPaying(true);
      const data = await payBill(id, {
        amount: String(amountNum), // BE nhận string BigInt
        ...(payForm.paid_date ? { paid_date: payForm.paid_date } : {}),
      });
      setBill(data);
      setOpenPay(false);
      alert('Ghi thanh toán thành công');
    } catch (e: any) {
      console.error('Pay error:', e?.response?.data || e);
      alert(e?.response?.data?.message || 'Lỗi thanh toán');
    } finally {
      setPaying(false);
    }
  };

  // ====== Actions: Usages Preview ======
  const doPreview = async () => {
    if (previewing) return;
    setPreviewError(null);
    setPreviewData(null);

    const { room_id, month } = previewForm;
    if (!room_id.trim() || !month.trim()) {
      alert('Vui lòng nhập Room ID và Kỳ (YYYY-MM)');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(month.trim())) {
      alert('Kỳ (month) phải có dạng YYYY-MM (ví dụ 2025-10)');
      return;
    }

    try {
      setPreviewing(true);
      const data = await previewMonth(Number(room_id), month.trim());
      setPreviewData(data);
    } catch (e: any) {
      console.error('Preview error:', e?.response?.data || e);
      setPreviewError(e?.response?.data?.message || 'Lỗi tính thử chi phí');
    } finally {
      setPreviewing(false);
    }
  };

  const doCreateFromPreview = async () => {
    if (!previewData) return;
    if (creatingFromPreview) return;

    try {
      setCreatingFromPreview(true);
      const billData = await generateCollection({
        contract_id: previewData.contract.id,
        period: previewForm.month.trim(),
        ...(previewForm.charge_date ? { charge_date: previewForm.charge_date } : {}),
      });
      setBill(billData);
      setOpenPreview(false);
      alert('Đã tạo hóa đơn từ preview thành công!');
    } catch (e: any) {
      console.error('Create-from-preview error:', e?.response?.data || e);
      alert(e?.response?.data?.message || 'Lỗi tạo hóa đơn từ preview');
    } finally {
      setCreatingFromPreview(false);
    }
  };

  return (
    <div className="p-4">
      {/* Header + actions */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">💳 Hóa đơn (Thuê + Điện/Nước + Phí)</h2>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:opacity-90"
            onClick={() => setOpenCreate(true)}
          >
            ➕ Tạo hóa đơn
          </button>
          <button
            className="border px-4 py-2 rounded hover:bg-gray-50"
            onClick={() => setOpenView(true)}
          >
            🔎 Xem hóa đơn
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:opacity-90"
            onClick={() => {
              // nếu đang có bill, tự điền bill_id và số còn lại
              setPayForm((f) => ({
                ...f,
                bill_id: bill ? String(bill.id) : '',
                amount: bill ? remain : '1000000',
              }));
              setOpenPay(true);
            }}
          >
            🧾 Ghi thanh toán
          </button>
          <button
            className="border px-4 py-2 rounded hover:bg-gray-50"
            onClick={() => {
              setPreviewForm({
                room_id: '',
                month: defaultPeriod,
                charge_date: '',
              });
              setPreviewData(null);
              setPreviewError(null);
              setOpenPreview(true);
            }}
          >
            ⚡ Tính thử theo phòng
          </button>
        </div>
      </div>

      {/* Hiển thị bill hiện tại */}
      {bill ? (
        <div className="bg-white shadow p-4 rounded">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Chi tiết hóa đơn #{bill.id}</h3>
            <div className="text-sm text-gray-500">
              Ngày chốt: <b>{bill.charge_date ? new Date(bill.charge_date).toLocaleDateString() : '-'}</b>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <div>Hợp đồng: <b>{bill.tenant_contract_id}</b></div>
            <div>Phòng: <b>{bill.apartment_room_id}</b></div>
            <div>Người thuê: <b>{bill.tenant_id}</b></div>

            <div>Tổng tiền: <b>{formatVND(bill.total_price)} ₫</b></div>
            <div>Đã trả: <b>{formatVND(bill.total_paid)} ₫</b></div>
            <div>Còn lại: <b>{formatVND(remain)} ₫</b></div>

            <div>
              Điện: <b>{bill.electricity_num_before ?? '-'} → {bill.electricity_num_after ?? '-'}</b>
            </div>
            <div>
              Nước: <b>{bill.water_number_before ?? '-'} → {bill.water_number_after ?? '-'}</b>
            </div>
          </div>

          {/* Lịch sử thanh toán */}
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Lịch sử thanh toán</h4>
            {bill.histories && bill.histories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[520px] w-full bg-white border rounded">
                  <thead className="bg-gray-100 text-left">
                    <tr>
                      <th className="p-2">Ngày</th>
                      <th className="p-2">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.histories.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="p-2">{new Date(h.paid_date).toLocaleString()}</td>
                        <td className="p-2">{formatVND(h.price)} ₫</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Chưa có lịch sử thanh toán.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-500">Chưa có hóa đơn nào được chọn/khởi tạo.</div>
      )}

      {/* ================= Modal: Tạo hóa đơn ================= */}
      <Modal open={openCreate} title="Tạo hóa đơn" onClose={() => setOpenCreate(false)}>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            doCreate();
          }}
        >
          <div>
            <label className="text-sm">Contract ID</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="VD: 12"
              value={createForm.contract_id}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, contract_id: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Kỳ (YYYY-MM)</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="2025-10"
              value={createForm.period}
              onChange={(e) => setCreateForm((f) => ({ ...f, period: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Ngày chốt (tùy chọn)</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={createForm.charge_date}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, charge_date: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => setOpenCreate(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
            >
              {creating ? 'Đang tạo...' : 'Tạo hóa đơn'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= Modal: Xem hóa đơn ================= */}
      <Modal open={openView} title="Xem hóa đơn" onClose={() => setOpenView(false)}>
        <form
          className="grid grid-cols-1 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            doView();
          }}
        >
          <div>
            <label className="text-sm">Bill ID</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="VD: 101"
              value={viewForm.bill_id}
              onChange={(e) => setViewForm((f) => ({ ...f, bill_id: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => setOpenView(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={viewing}
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-60"
            >
              {viewing ? 'Đang tải...' : 'Xem chi tiết'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= Modal: Ghi thanh toán ================= */}
      <Modal open={openPay} title="Ghi thanh toán" onClose={() => setOpenPay(false)}>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            doPay();
          }}
        >
          <div>
            <label className="text-sm">Bill ID</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="VD: 101"
              value={payForm.bill_id}
              onChange={(e) => setPayForm((f) => ({ ...f, bill_id: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm">Số tiền (VND)</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="1000000"
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Ngày thanh toán (tùy chọn)</label>
            <input
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={payForm.paid_date}
              onChange={(e) =>
                setPayForm((f) => ({ ...f, paid_date: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => setOpenPay(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={paying}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {paying ? 'Đang ghi...' : 'Thanh toán'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= Modal: Tính thử theo phòng (Usages preview) ================= */}
      <Modal open={openPreview} title="⚡ Tính thử chi phí theo phòng" onClose={() => setOpenPreview(false)}>
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            doPreview();
          }}
        >
          <div>
            <label className="text-sm">Room ID</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="VD: 305"
              value={previewForm.room_id}
              onChange={(e) =>
                setPreviewForm((f) => ({ ...f, room_id: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Kỳ (YYYY-MM)</label>
            <input
              className="border p-2 rounded w-full"
              placeholder="2025-10"
              value={previewForm.month}
              onChange={(e) =>
                setPreviewForm((f) => ({ ...f, month: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Ngày chốt (tùy chọn)</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={previewForm.charge_date}
              onChange={(e) =>
                setPreviewForm((f) => ({ ...f, charge_date: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-3 flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded border" onClick={() => setOpenPreview(false)}>
              Đóng
            </button>
            <button type="submit" disabled={previewing} className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-60">
              {previewing ? 'Đang tính…' : 'Tính thử'}
            </button>
          </div>
        </form>

        {/* kết quả preview */}
        {previewError && (
          <div className="text-red-600 mt-3">{previewError}</div>
        )}

        {previewData && !previewError && (
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>Hợp đồng: <b>{previewData.contract.id}</b></div>
              <div>Phòng: <b>{previewData.contract.room_id}</b></div>
              <div>Người thuê: <b>{previewData.contract.tenant_id}</b></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border rounded p-3">
                <h4 className="font-semibold mb-2">Điện</h4>
                <div>Chỉ số: <b>{previewData.readings.electricity.before}</b> → <b>{previewData.readings.electricity.after}</b></div>
                <div>Tiêu thụ (kWh): <b>{previewData.readings.electricity.used}</b></div>
                <div>Đơn giá: <b>{formatVND(previewData.prices.elec_price)} ₫</b></div>
                <div>Tiền điện: <b>{formatVND(previewData.amounts.elec_money)} ₫</b></div>
              </div>
              <div className="border rounded p-3">
                <h4 className="font-semibold mb-2">Nước</h4>
                <div>Chỉ số: <b>{previewData.readings.water.before}</b> → <b>{previewData.readings.water.after}</b></div>
                <div>Tiêu thụ (m³): <b>{previewData.readings.water.used}</b></div>
                <div>Đơn giá: <b>{formatVND(previewData.prices.water_price)} ₫</b></div>
                <div>Tiền nước: <b>{formatVND(previewData.amounts.water_money)} ₫</b></div>
              </div>
            </div>

            <div className="border rounded p-3">
              <h4 className="font-semibold mb-2">Khác</h4>
              <div>Tiền phòng: <b>{formatVND(previewData.prices.room)} ₫</b></div>
              <div>Phí cố định: <b>{formatVND(previewData.prices.fixed_costs)} ₫</b></div>
            </div>

            <div className="text-right text-lg">
              Tổng cộng: <b>{formatVND(previewData.amounts.total)} ₫</b>
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setOpenPreview(false)}>Đóng</button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                onClick={doCreateFromPreview}
                disabled={creatingFromPreview}
              >
                {creatingFromPreview ? 'Đang tạo hóa đơn…' : 'Tạo hóa đơn từ preview'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
