import axiosClient from './axiosClient';

export type Apartment = {
  id: number;
  name: string;
  address?: string | null;
  province_id?: string | null;
  district_id?: string | null;
  ward_id?: string | null;
  imagePath?: string | null; // nếu BE có cột lưu ảnh
};

export type PrefRow = {
  id: number;
  province_id: string | null;
  province_name: string | null;
  district_id: string | null;
  district_name: string | null;
  ward_id: string | null;
  ward_name: string | null;
};

export async function fetchApartments(params: { q?: string; page?: number; take?: number }) {
  const res = await axiosClient.get('/apartments', { params });
  const raw = res.data;
  const items: Apartment[] =
    raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  const total: number =
    raw?.total ?? raw?.count ?? raw?.meta?.total ?? items.length;
  return { items, total };
}

export async function createApartment(payload: Partial<Apartment>) {
  return axiosClient.post('/apartments', payload);
}

export async function updateApartment(id: number, payload: Partial<Apartment>) {
  return axiosClient.put(`/apartments/${id}`, payload);
}

export async function deleteApartment(id: number) {
  return axiosClient.delete(`/apartments/${id}`);
}

export async function fetchPrefectures(): Promise<PrefRow[]> {
  const res = await axiosClient.get('/prefectures');
  return res.data || [];
}

export async function uploadApartmentImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await axiosClient.post('/files/apartment-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { url: string };
}
