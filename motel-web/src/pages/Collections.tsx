// src/pages/Collections.tsx
import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import {
  generateCollection,
  getBillDetail,
  payBill,
  getBillsList,
  type Bill,
  type BillListItem,
} from '../api/collectionsApi';
import { previewMonth, type PreviewResult } from '../api/usagesApi.js';

function formatVND(s?: string | null) {
  if (!s) return '0';
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return new Intl.NumberFormat('vi-VN').format(n);
}

export default function Collections() {
  // Danh sách hóa đơn
  const [bills, setBills] = useState<BillListItem[]>([]);
  const [billsPage, setBillsPage] = useState(1);
  const [billsTotal, setBillsTotal] = useState(0);
  const [billsStatus, setBillsStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [loadingBills, setLoadingBills] = useState(false);
  const billsTake = 10;
  const billsPages = Math.ceil(billsTotal / billsTake);

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
    electricity_num_after: '', // optional chỉ số điện kết thúc
    water_number_after: '', // optional chỉ số nước kết thúc
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

  // Load danh sách hóa đơn
  const loadBills = async () => {
    setLoadingBills(true);
    try {
      const res = await getBillsList({
        page: billsPage,
        take: billsTake,
        status: billsStatus,
      });
      setBills(res.items);
      setBillsTotal(res.total);
    } catch (e: any) {
      console.error('Load bills error:', e?.response?.data || e);
      alert('Không thể tải danh sách hóa đơn');
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billsPage, billsStatus]);

  // Tính còn lại = total_price - total_paid
  const remain = useMemo(() => {
    if (!bill) return '0';
    const tp = Number(bill.total_price || 0);
    const pd = Number(bill.total_paid || 0);
    const r = Math.max(0, tp - pd);
    return String(r);
  }, [bill]);

  // Tính trạng thái thanh toán của một bill
  const getBillStatus = (b: BillListItem) => {
    const totalPrice = Number(b.total_price || 0);
    const totalPaid = Number(b.total_paid || 0);
    if (totalPaid >= totalPrice && totalPrice > 0) return 'paid';
    return 'unpaid';
  };

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
        ...(createForm.electricity_num_after ? { electricity_num_after: Number(createForm.electricity_num_after) } : {}),
        ...(createForm.water_number_after ? { water_number_after: Number(createForm.water_number_after) } : {}),
      });
      setBill(data);
      setOpenCreate(false);
      alert('Đã tạo/xuất hóa đơn thành công!');
      await loadBills(); // Reload danh sách
    } catch (e: any) {
      console.error('Generate error:', e);
      console.error('Error response:', e?.response);
      console.error('Error data:', e?.response?.data);
      const errorMsg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Lỗi tạo hóa đơn';
      const status = e?.response?.status;
      console.error(`Status: ${status}, Message: ${errorMsg}`);
      alert(`Lỗi tạo hóa đơn (${status || 'N/A'}): ${errorMsg}\n\nVui lòng kiểm tra console để xem chi tiết.`);
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
      await loadBills(); // Reload để cập nhật danh sách
    } catch (e: any) {
      console.error('View error:', e?.response?.data || e);
      const errorMsg = e?.response?.data?.message || e?.message || 'Không tìm thấy hóa đơn';
      if (e?.response?.status === 404) {
        alert(`Hóa đơn #${id} không tồn tại hoặc không thuộc quyền của bạn`);
      } else {
        alert(`Lỗi: ${errorMsg}`);
      }
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
      await loadBills(); // Reload danh sách
    } catch (e: any) {
      console.error('Pay error:', e?.response?.data || e);
      const errorMsg = e?.response?.data?.message || e?.message || 'Lỗi thanh toán';
      if (e?.response?.status === 404) {
        alert(`Hóa đơn #${id} không tồn tại hoặc không thuộc quyền của bạn`);
      } else {
        alert(`Lỗi thanh toán: ${errorMsg}`);
      }
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
      await loadBills(); // Reload danh sách
    } catch (e: any) {
      console.error('Create-from-preview error:', e?.response?.data || e);
      alert(e?.response?.data?.message || 'Lỗi tạo hóa đơn từ preview');
    } finally {
      setCreatingFromPreview(false);
    }
  };

  return (
    <div className="p-2 md:p-4">
      {/* Header + actions */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">💳 Hóa đơn (Thuê + Điện/Nước + Phí)</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm md:text-base shadow-md"
            onClick={() => setOpenCreate(true)}
          >
            ➕ Tạo hóa đơn
          </button>
          <button
            className="border border-gray-300 px-3 md:px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm md:text-base"
            onClick={() => setOpenView(true)}
          >
            🔎 Xem hóa đơn
          </button>
          <button
            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm md:text-base shadow-md"
            onClick={() => {
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
            className="border border-gray-300 px-3 md:px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm md:text-base"
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
            ⚡ Tính thử
          </button>
        </div>
      </div>

      {/* Filter và danh sách hóa đơn */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Danh sách hóa đơn</h3>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm transition ${billsStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              onClick={() => {
                setBillsStatus('all');
                setBillsPage(1);
              }}
            >
              Tất cả
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm transition ${billsStatus === 'paid'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              onClick={() => {
                setBillsStatus('paid');
                setBillsPage(1);
              }}
            >
              Đã thanh toán
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm transition ${billsStatus === 'unpaid'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              onClick={() => {
                setBillsStatus('unpaid');
                setBillsPage(1);
              }}
            >
              Chưa thanh toán
            </button>
          </div>
        </div>

        {loadingBills ? (
          <div className="text-center p-8 text-gray-500">Đang tải...</div>
        ) : (
          <>
            <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 mb-4">
              <table className="min-w-[800px] w-full bg-white">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">ID</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Tòa nhà</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Phòng</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden md:table-cell">Người thuê</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Tổng tiền</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Đã trả</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Còn lại</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold hidden sm:table-cell">Ngày chốt</th>
                    <th className="p-2 md:p-3 text-xs md:text-sm font-semibold">Trạng thái</th>
                    <th className="p-2 md:p-3 text-center text-xs md:text-sm font-semibold w-32">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center p-4 md:p-6 text-gray-500">
                        Không có hóa đơn nào
                      </td>
                    </tr>
                  ) : (
                    bills.map((b) => {
                      const totalPrice = Number(b.total_price || 0);
                      const totalPaid = Number(b.total_paid || 0);
                      const remainAmount = Math.max(0, totalPrice - totalPaid);
                      const status = getBillStatus(b);
                      return (
                        <tr
                          key={b.id}
                          className="border-b hover:bg-gray-50 transition cursor-pointer"
                          onClick={async () => {
                            try {
                              const detail = await getBillDetail(b.id);
                              setBill(detail);
                            } catch (e: any) {
                              console.error('View bill detail error:', e?.response?.data || e);
                              const errorMsg = e?.response?.data?.message || e?.message || 'Không thể tải chi tiết hóa đơn';
                              if (e?.response?.status === 404) {
                                alert(`Hóa đơn #${b.id} không tồn tại hoặc không thuộc quyền của bạn`);
                              } else {
                                alert(`Lỗi: ${errorMsg}`);
                              }
                            }
                          }}
                        >
                          <td className="p-2 md:p-3 text-sm">{b.id}</td>
                          <td className="p-2 md:p-3 text-sm">
                            {b.tenant_contract?.apartment_room?.apartment?.name || '—'}
                          </td>
                          <td className="p-2 md:p-3 text-sm font-medium">
                            {b.tenant_contract?.apartment_room?.room_number || `#${b.apartment_room_id}`}
                          </td>
                          <td className="p-2 md:p-3 text-sm hidden md:table-cell">
                            {b.tenant_contract?.tenant?.name || `#${b.tenant_id}`}
                          </td>
                          <td className="p-2 md:p-3 text-sm font-medium">{formatVND(b.total_price)} ₫</td>
                          <td className="p-2 md:p-3 text-sm">{formatVND(b.total_paid)} ₫</td>
                          <td className="p-2 md:p-3 text-sm font-medium text-red-600">
                            {formatVND(String(remainAmount))} ₫
                          </td>
                          <td className="p-2 md:p-3 text-xs md:text-sm hidden sm:table-cell">
                            {b.charge_date ? new Date(b.charge_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-2 md:p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {status === 'paid' ? '✓ Đã trả' : '⚠ Chưa trả'}
                            </span>
                          </td>
                          <td className="p-2 md:p-3 text-center">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-xs md:text-sm px-2 py-1 rounded hover:bg-blue-50 transition"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const detail = await getBillDetail(b.id);
                                  setBill(detail);
                                } catch (err: any) {
                                  console.error('View bill detail error:', err?.response?.data || err);
                                  const errorMsg = err?.response?.data?.message || err?.message || 'Không thể tải chi tiết hóa đơn';
                                  if (err?.response?.status === 404) {
                                    alert(`Hóa đơn #${b.id} không tồn tại hoặc không thuộc quyền của bạn`);
                                  } else {
                                    alert(`Lỗi: ${errorMsg}`);
                                  }
                                }
                              }}
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {billsPages > 1 && (
              <div className="flex gap-2 md:gap-3 items-center flex-wrap justify-center md:justify-start mb-4">
                <button
                  className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition"
                  disabled={billsPage <= 1}
                  onClick={() => setBillsPage((p) => p - 1)}
                >
                  &lt; Trước
                </button>
                <span className="text-sm md:text-base px-2">
                  Trang {billsPage}/{billsPages}
                </span>
                <button
                  className="border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition"
                  disabled={billsPage >= billsPages}
                  onClick={() => setBillsPage((p) => p + 1)}
                >
                  Sau &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hiển thị bill hiện tại */}
      {bill ? (
        <div className="bg-white shadow-md rounded-lg p-4 md:p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800">Chi tiết hóa đơn #{bill.id}</h3>
            <div className="text-sm text-gray-500">
              Ngày chốt: <b>{bill.charge_date ? new Date(bill.charge_date).toLocaleDateString() : '-'}</b>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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
          <div>
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
          <div>
            <label className="text-sm">Chỉ số điện kết thúc (kWh) - tùy chọn</label>
            <input
              type="number"
              min="0"
              className="border p-2 rounded w-full"
              placeholder="Để trống nếu lấy từ usages"
              value={createForm.electricity_num_after}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, electricity_num_after: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm">Chỉ số nước kết thúc (m³) - tùy chọn</label>
            <input
              type="number"
              min="0"
              className="border p-2 rounded w-full"
              placeholder="Để trống nếu lấy từ usages"
              value={createForm.water_number_after}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, water_number_after: e.target.value }))
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
