// src/api/usagesApi.ts
import axiosClient from './axiosClient';

export type PreviewReading = {
    before: number;
    after: number;
    used: number; // sản lượng
};

export type PreviewResult = {
    period: { start: string | Date; end: string | Date };
    readings: {
        electricity: PreviewReading;
        water: PreviewReading;
    };
    prices: {
        room: string;        // BigInt string
        elec_price: string;  // BigInt string
        water_price: string; // BigInt string
        fixed_costs: string; // BigInt string
    };
    amounts: {
        elec_money: string;  // BigInt string
        water_money: string; // BigInt string
        total: string;       // BigInt string
    };
    contract: {
        id: number;
        tenant_id: number;
        room_id: number;
    };
};

export async function previewMonth(roomId: number, month: string) {
    const res = await axiosClient.get<PreviewResult>(`/usages/rooms/${roomId}/preview-month`, {
        params: { month },
    });
    return res.data;
}

export async function previewPeriod(roomId: number, start: string, end: string) {
    const res = await axiosClient.get<PreviewResult>(`/usages/rooms/${roomId}/preview-period`, {
        params: { start, end },
    });
    return res.data;
}

