import { useRef, useState } from 'react';
import { uploadApartmentImage } from '../api/apartmentsApi';

export default function ImageUploader({
  value, onChange,
}: { value?: string | null; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const select = () => ref.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const { url } = await uploadApartmentImage(f);
      onChange(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={select} className="border px-3 py-2 rounded bg-white hover:bg-gray-50">
        {loading ? 'Đang tải...' : 'Chọn ảnh'}
      </button>
      <input ref={ref} className="hidden" type="file" accept="image/*" onChange={onFile} />
      {value ? <img src={value} alt="ap" className="h-12 rounded" /> : <span className="text-sm text-gray-500">Chưa có ảnh</span>}
    </div>
  );
}
