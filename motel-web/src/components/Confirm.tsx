export default function Confirm({
  open, message, onOK, onCancel,
}: { open: boolean; message: string; onOK: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <p className="mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded border">Hủy</button>
          <button onClick={onOK} className="px-4 py-2 rounded bg-red-600 text-white">Xóa</button>
        </div>
      </div>
    </div>
  );
}
