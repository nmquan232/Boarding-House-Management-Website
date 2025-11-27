import axiosClient from './axiosClient';

export type BillHistory = {
    id: number;
    paid_date: string; // ISO string
    price: string;     // BigInt as string
};

export type Bill = {
    id: number;
    tenant_contract_id: number;
    apartment_room_id: number;
    tenant_id: number;
    charge_date?: string | null;
    electricity_num_before?: number | null;
    electricity_num_after?: number | null;
    water_number_before?: number | null;
    water_number_after?: number | null;
    total_price?: string | null; // BigInt as string
    total_paid?: string | null;  // BigInt as string
    total_debt?: string | null;  // BigInt as string
    histories?: BillHistory[];
};

export async function generateCollection(payload: {
    contract_id: number;
    period: string; // YYYY-MM
    charge_date?: string; // optional ISO yyyy-mm-dd
    electricity_num_after?: number; // optional chỉ số điện kết thúc
    water_number_after?: number; // optional chỉ số nước kết thúc
}): Promise<Bill> {
    const res = await axiosClient.post('/collections/generate', payload);
    return res.data as Bill;
}

export async function getBillDetail(id: number): Promise<Bill> {
    const res = await axiosClient.get(`/collections/${id}`);
    return res.data as Bill;
}

export async function payBill(
    id: number,
    body: { amount: string; paid_date?: string }
): Promise<Bill> {
    const res = await axiosClient.post(`/collections/${id}/pay`, body);
    return res.data as Bill;
}

export type BillListItem = Bill & {
    tenant_contract?: {
        apartment_room?: {
            room_number: string;
            apartment?: { name: string };
        };
        tenant?: { name: string };
    };
};

export async function getBillsList(params?: {
    page?: number;
    take?: number;
    status?: 'paid' | 'unpaid' | 'all';
}): Promise<{
    items: BillListItem[];
    total: number;
    page: number;
    take: number;
    pages: number;
}> {
    const res = await axiosClient.get('/collections', { params });
    return res.data;
}

export async function deleteBill(id: number): Promise<{ ok: boolean; message: string }> {
    const res = await axiosClient.delete(`/collections/${id}`);
    return res.data;
}


