import axiosClient from './axiosClient';

export type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    is_admin: boolean;
    apartments_count: number;
    rooms_count: number;
};

export async function fetchAdminUsers(params?: { page?: number; take?: number; q?: string }) {
    const res = await axiosClient.get('/admin/users', { params });
    return res.data as {
        items: AdminUser[];
        total: number;
        page: number;
        take: number;
        pages: number;
    };
}

export async function resetUserPassword(id: number, newPassword?: string) {
    const res = await axiosClient.post(`/admin/users/${id}/reset-password`, newPassword ? { newPassword } : {});
    return res.data as { userId: number; newPassword: string };
}

export async function deleteUserAccount(id: number) {
    const res = await axiosClient.delete(`/admin/users/${id}`);
    return res.data as { ok: boolean };
}

export async function updateUserAdminRole(id: number, isAdmin: boolean) {
    const res = await axiosClient.put(`/admin/users/${id}/admin`, { isAdmin });
    return res.data as { id: number; is_admin: boolean; message: string };
}

export type MonthlyCostTemplate = {
    id: number;
    name: string;
};

export async function listMonthlyCostTemplates(params?: { page?: number; take?: number; q?: string }) {
    const res = await axiosClient.get('/admin/monthly-costs', { params });
    return res.data as {
        items: MonthlyCostTemplate[];
        total: number;
        page: number;
        take: number;
        pages: number;
    };
}

export async function createMonthlyCostTemplate(payload: { name: string }) {
    const res = await axiosClient.post('/admin/monthly-costs', payload);
    return res.data as MonthlyCostTemplate;
}

export async function updateMonthlyCostTemplate(id: number, payload: { name: string }) {
    const res = await axiosClient.put(`/admin/monthly-costs/${id}`, payload);
    return res.data as MonthlyCostTemplate;
}

export async function deleteMonthlyCostTemplate(id: number) {
    const res = await axiosClient.delete(`/admin/monthly-costs/${id}`);
    return res.data as { ok: boolean };
}

export async function fetchAdminOverview() {
    const res = await axiosClient.get('/admin/overview');
    return res.data as {
        total_users: number;
        total_apartments: number;
        total_rooms: number;
        active_contracts: number;
        total_rent: string;
        total_outstanding: string;
    };
}

export async function fetchRentChart(params?: { from?: string; to?: string }) {
    const res = await axiosClient.get('/admin/rent-chart', { params });
    return res.data as {
        from: string;
        to: string;
        points: { month: string; total_price: string; total_debt: string }[];
    };
}

