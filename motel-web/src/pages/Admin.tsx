import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchAdminOverview,
    fetchRentChart,
    fetchAdminUsers,
    resetUserPassword,
    deleteUserAccount,
    listMonthlyCostTemplates,
    createMonthlyCostTemplate,
    updateMonthlyCostTemplate,
    deleteMonthlyCostTemplate,
    type AdminUser,
    type MonthlyCostTemplate,
} from '../api/adminApi';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Legend,
} from 'recharts';

const Admin = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'fees'>('overview');

    const [overview, setOverview] = useState<null | Awaited<ReturnType<typeof fetchAdminOverview>>>(null);
    const [overviewLoading, setOverviewLoading] = useState(false);

    const [chartParams, setChartParams] = useState<{ from?: string; to?: string }>({});
    const [chartData, setChartData] = useState<{ month: string; total_price: string; total_debt: string }[]>([]);
    const [chartLoading, setChartLoading] = useState(false);

    const [usersData, setUsersData] = useState<{ items: AdminUser[]; page: number; take: number; total: number; pages: number }>({
        items: [],
        page: 1,
        take: 10,
        total: 0,
        pages: 0,
    });
    const [userSearch, setUserSearch] = useState('');
    const [usersLoading, setUsersLoading] = useState(false);

    const [feesData, setFeesData] = useState<{
        items: MonthlyCostTemplate[];
        page: number;
        take: number;
        total: number;
        pages: number;
    }>({
        items: [],
        page: 1,
        take: 10,
        total: 0,
        pages: 0,
    });
    const [feesLoading, setFeesLoading] = useState(false);
    const [feeForm, setFeeForm] = useState<{ id?: number; name: string }>({
        name: '',
    });

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (!isAdmin) return;
        loadOverview();
        loadChartData(chartParams);
    }, [isAdmin]);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers(usersData.page, usersData.take, userSearch);
        }
        if (activeTab === 'fees') {
            loadFees(feesData.page, feesData.take);
        }
    }, [activeTab]);

    const loadOverview = async () => {
        try {
            setOverviewLoading(true);
            const data = await fetchAdminOverview();
            setOverview(data);
        } catch (error) {
            console.error('Failed to load overview', error);
        } finally {
            setOverviewLoading(false);
        }
    };

    const loadChartData = async (params?: { from?: string; to?: string }) => {
        try {
            setChartLoading(true);
            const data = await fetchRentChart(params);
            setChartData(data.points);
        } catch (error) {
            console.error('Failed to load chart data', error);
        } finally {
            setChartLoading(false);
        }
    };

    const loadUsers = async (page = 1, take = 10, q?: string) => {
        try {
            setUsersLoading(true);
            const data = await fetchAdminUsers({ page, take, q });
            setUsersData(data);
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setUsersLoading(false);
        }
    };

    const loadFees = async (page = 1, take = 10, q?: string) => {
        try {
            setFeesLoading(true);
            const data = await listMonthlyCostTemplates({ page, take, q });
            setFeesData(data);
        } catch (error) {
            console.error('Failed to load fees', error);
        } finally {
            setFeesLoading(false);
        }
    };

    const handleResetPassword = async (target: AdminUser) => {
        if (!window.confirm(`Reset mật khẩu cho ${target.email}?`)) return;
        const customPass = window.prompt('Nhập mật khẩu mới (để trống để hệ thống tự sinh):') || undefined;
        try {
            const res = await resetUserPassword(target.id, customPass?.trim() ? customPass : undefined);
            alert(`Mật khẩu mới của ${target.email}: ${res.newPassword}`);
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Không thể reset mật khẩu');
        }
    };

    const handleDeleteUser = async (target: AdminUser) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa user ${target.email}? Hành động này không thể hoàn tác.`)) return;
        try {
            await deleteUserAccount(target.id);
            alert('Đã xóa user');
            loadUsers(usersData.page, usersData.take, userSearch);
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Không thể xóa user');
        }
    };

    const handleFeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feeForm.name.trim()) {
            alert('Tên phụ phí không được để trống');
            return;
        }
        try {
            if (feeForm.id) {
                await updateMonthlyCostTemplate(feeForm.id, { name: feeForm.name });
            } else {
                await createMonthlyCostTemplate({ name: feeForm.name });
            }
            setFeeForm({ id: undefined, name: '' });
            loadFees(feesData.page, feesData.take);
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Không thể lưu phụ phí');
        }
    };

    const handleDeleteFee = async (fee: MonthlyCostTemplate) => {
        if (!window.confirm(`Xóa phụ phí "${fee.name}"?`)) return;
        try {
            await deleteMonthlyCostTemplate(fee.id);
            loadFees(feesData.page, feesData.take);
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Không thể xóa phụ phí');
        }
    };

    const formattedChartData = useMemo(
        () =>
            chartData.map((item) => ({
                month: item.month,
                total: Number(item.total_price),
                debt: Number(item.total_debt),
            })),
        [chartData],
    );

    if (!isAdmin) return <Navigate to="/" replace />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
                {['overview', 'users', 'fees'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as typeof activeTab)}
                        className={`px-4 py-2 rounded-lg border transition ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                            }`}
                    >
                        {tab === 'overview' && 'Tổng quan'}
                        {tab === 'users' && 'Người dùng'}
                        {tab === 'fees' && 'Danh mục phụ phí'}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {overviewLoading && <p>Đang tải thống kê...</p>}
                        {!overviewLoading &&
                            overview && (
                                <>
                                    <div className="bg-white p-5 rounded-2xl shadow">
                                        <p className="text-sm text-gray-500">Người dùng</p>
                                        <p className="text-3xl font-bold text-blue-600">{overview.total_users}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow">
                                        <p className="text-sm text-gray-500">Tòa nhà</p>
                                        <p className="text-3xl font-bold text-blue-600">{overview.total_apartments}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow">
                                        <p className="text-sm text-gray-500">Phòng</p>
                                        <p className="text-3xl font-bold text-blue-600">{overview.total_rooms}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow">
                                        <p className="text-sm text-gray-500">Hợp đồng hoạt động</p>
                                        <p className="text-3xl font-bold text-blue-600">{overview.active_contracts}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow">
                                        <p className="text-sm text-gray-500">Tổng tiền trọ</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {Number(overview.total_rent || 0).toLocaleString('vi-VN')}₫
                                        </p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow">
                                        <p className="text-sm text-gray-500">Dư nợ</p>
                                        <p className="text-3xl font-bold text-red-600">
                                            {Number(overview.total_outstanding || 0).toLocaleString('vi-VN')}₫
                                        </p>
                                    </div>
                                </>
                            )}
                    </section>

                    <section className="bg-white rounded-2xl shadow p-5">
                        <div className="flex flex-wrap items-end gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-gray-600">Từ tháng</label>
                                <input
                                    type="month"
                                    value={chartParams.from || ''}
                                    onChange={(e) => setChartParams({ ...chartParams, from: e.target.value })}
                                    className="border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600">Đến tháng</label>
                                <input
                                    type="month"
                                    value={chartParams.to || ''}
                                    onChange={(e) => setChartParams({ ...chartParams, to: e.target.value })}
                                    className="border rounded px-3 py-2"
                                />
                            </div>
                            <button
                                onClick={() => loadChartData(chartParams)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                                disabled={chartLoading}
                            >
                                Xem biểu đồ
                            </button>
                        </div>
                        {chartLoading ? (
                            <p>Đang tải biểu đồ...</p>
                        ) : (
                            <div className="w-full h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formattedChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => value.toLocaleString('vi-VN') + '₫'} />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" name="Tổng tiền" stroke="#2563eb" />
                                        <Line type="monotone" dataKey="debt" name="Dư nợ" stroke="#dc2626" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activeTab === 'users' && (
                <section className="bg-white rounded-2xl shadow p-5 space-y-4">
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="border rounded px-3 py-2 flex-1 min-w-[200px]"
                        />
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={() => loadUsers(1, usersData.take, userSearch)}>
                            Tìm kiếm
                        </button>
                    </div>

                    {usersLoading ? (
                        <p>Đang tải danh sách user...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="p-3">Tên</th>
                                        <th className="p-3">Email</th>
                                        <th className="p-3">Tòa nhà</th>
                                        <th className="p-3">Phòng</th>
                                        <th className="p-3 text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersData.items.map((item) => (
                                        <tr key={item.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-medium">{item.name}</td>
                                            <td className="p-3">{item.email}</td>
                                            <td className="p-3">{item.apartments_count}</td>
                                            <td className="p-3">{item.rooms_count}</td>
                                            <td className="p-3 text-center space-x-2">
                                                <button className="text-blue-600" onClick={() => handleResetPassword(item)}>
                                                    Reset mật khẩu
                                                </button>
                                                <button className="text-red-600" onClick={() => handleDeleteUser(item)}>
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={usersData.page <= 1}
                            onClick={() => loadUsers(usersData.page - 1, usersData.take, userSearch)}
                        >
                            Trước
                        </button>
                        <span>
                            Trang {usersData.page}/{Math.max(1, usersData.pages)}
                        </span>
                        <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={usersData.page >= usersData.pages}
                            onClick={() => loadUsers(usersData.page + 1, usersData.take, userSearch)}
                        >
                            Sau
                        </button>
                    </div>
                </section>
            )}

            {activeTab === 'fees' && (
                <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                    <section className="bg-white rounded-2xl shadow p-5">
                        {feesLoading ? (
                            <p>Đang tải danh sách phụ phí...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-left">
                                            <th className="p-3">Tên</th>
                                            <th className="p-3 text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feesData.items.map((fee) => (
                                            <tr key={fee.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{fee.name}</td>
                                                <td className="p-3 text-center space-x-2">
                                                    <button
                                                        className="text-blue-600"
                                                        onClick={() =>
                                                            setFeeForm({
                                                                id: fee.id,
                                                                name: fee.name,
                                                            })
                                                        }
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button className="text-red-600" onClick={() => handleDeleteFee(fee)}>
                                                        Xóa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex items-center justify-between mt-4">
                            <button
                                className="px-3 py-1 border rounded disabled:opacity-50"
                                disabled={feesData.page <= 1}
                                onClick={() => loadFees(feesData.page - 1, feesData.take)}
                            >
                                Trước
                            </button>
                            <span>
                                Trang {feesData.page}/{Math.max(1, feesData.pages)}
                            </span>
                            <button
                                className="px-3 py-1 border rounded disabled:opacity-50"
                                disabled={feesData.page >= feesData.pages}
                                onClick={() => loadFees(feesData.page + 1, feesData.take)}
                            >
                                Sau
                            </button>
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl shadow p-5">
                        <h3 className="text-lg font-semibold mb-4">{feeForm.id ? 'Cập nhật phụ phí' : 'Thêm phụ phí mới'}</h3>
                        <form className="space-y-4" onSubmit={handleFeeSubmit}>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Tên</label>
                                <input
                                    className="w-full border rounded px-3 py-2"
                                    value={feeForm.name}
                                    onChange={(e) => setFeeForm((prev) => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                                    Lưu
                                </button>
                                {feeForm.id && (
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded-lg border"
                                        onClick={() => setFeeForm({ id: undefined, name: '' })}
                                    >
                                        Hủy
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
};

export default Admin;

