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
    updateUserAdminRole,
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

    const buttonBase =
        'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';
    const primaryButton = `${buttonBase} px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`;
    const outlineButton = `${buttonBase} px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-300`;
    const ghostButton = `${buttonBase} px-3 py-1 border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 focus:ring-gray-200`;
    const actionButton = `${buttonBase} px-3 py-1 text-xs rounded-full focus:ring-offset-1`;
    const actionBlue = `${actionButton} bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-200`;
    const actionPurple = `${actionButton} bg-purple-50 text-purple-700 hover:bg-purple-100 focus:ring-purple-200`;
    const actionRed = `${actionButton} bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-200`;
    const tabButton = `${buttonBase} px-4 py-2 border font-semibold`;
    const tabActive = `${tabButton} bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 focus:ring-blue-500`;
    const tabInactive = `${tabButton} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 focus:ring-gray-200`;

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

    const handleToggleAdmin = async (target: AdminUser) => {
        const nextState = !target.is_admin;
        const actionText = nextState ? 'cấp quyền admin cho' : 'gỡ quyền admin của';
        if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} ${target.email}?`)) return;
        try {
            const res = await updateUserAdminRole(target.id, nextState);
            alert(res.message || 'Cập nhật quyền thành công');
            loadUsers(usersData.page, usersData.take, userSearch);
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Không thể cập nhật quyền');
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

    const formattedChartData = useMemo(() => {
        let cumulativeDebt = 0;
        return chartData.map((item) => {
            const total = Number(item.total_price);
            const monthlyDebt = Number(item.total_debt);
            cumulativeDebt += monthlyDebt;
            return {
                month: item.month,
                total,
                debt: cumulativeDebt,
                monthlyDebt,
            };
        });
    }, [chartData]);

    const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
        if (!active || !payload || payload.length === 0) return null;
        return (
            <div className="rounded-xl border border-gray-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">{payload[0].payload.month}</p>
                {payload.map((entry) => {
                    const isDebt = entry.dataKey === 'debt';
                    return (
                        <div key={entry.dataKey} className="mt-1 flex flex-col gap-0.5 text-sm font-medium text-gray-700">
                            <div className="flex items-center gap-2">
                                <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                {isDebt ? 'Dư nợ tích lũy:' : 'Tổng tiền:'}
                                <span className="text-gray-900">
                                    {Number(entry.value).toLocaleString('vi-VN')}
                                    <span className="text-xs text-gray-500 ml-1">₫</span>
                                </span>
                            </div>
                            {isDebt && (
                                <span className="text-xs font-normal text-gray-500">
                                    +{Number(entry.payload.monthlyDebt ?? 0).toLocaleString('vi-VN')}₫ trong tháng
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!isAdmin) return <Navigate to="/" replace />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
                {['overview', 'users', 'fees'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as typeof activeTab)}
                        className={activeTab === tab ? tabActive : tabInactive}
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

                    <section className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-blue-50 to-white p-5 shadow-xl shadow-blue-100/50">
                        <div className="mb-5 flex flex-wrap items-center gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-blue-600">Biểu đồ doanh thu</p>
                                <h3 className="text-2xl font-bold text-gray-900">Tổng quan thu và dư nợ</h3>
                            </div>
                            <div className="flex flex-wrap gap-3 ml-auto">
                                <div>
                                    <label className="block text-sm text-gray-600">Từ tháng</label>
                                    <input
                                        type="month"
                                        value={chartParams.from || ''}
                                        onChange={(e) => setChartParams({ ...chartParams, from: e.target.value })}
                                        className="rounded-xl border border-gray-200 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600">Đến tháng</label>
                                    <input
                                        type="month"
                                        value={chartParams.to || ''}
                                        onChange={(e) => setChartParams({ ...chartParams, to: e.target.value })}
                                        className="rounded-xl border border-gray-200 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                </div>
                                <button
                                    onClick={() => loadChartData(chartParams)}
                                    className={primaryButton}
                                    disabled={chartLoading}
                                >
                                    {chartLoading ? 'Đang tải...' : 'Áp dụng'}
                                </button>
                            </div>
                        </div>
                        {chartLoading ? (
                            <div className="flex h-64 items-center justify-center text-gray-500">Đang tải biểu đồ...</div>
                        ) : (
                            <div className="w-full h-80 rounded-2xl bg-white/70 p-3 shadow-inner shadow-blue-100">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formattedChartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                                        <defs>
                                            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#e2e8f0' }}
                                        />
                                        <YAxis
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            tickFormatter={(value) => `${(value / 1_000_000).toFixed(0)}tr`}
                                            tickLine={false}
                                            axisLine={{ stroke: '#e2e8f0' }}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            formatter={(value) => (value === 'total' ? 'Tổng tiền' : 'Dư nợ')}
                                            wrapperStyle={{ paddingTop: 10 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#2563eb' }}
                                            activeDot={{ r: 6, fill: '#1d4ed8' }}
                                            name="total"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="debt"
                                            stroke="#dc2626"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#dc2626' }}
                                            activeDot={{ r: 6, fill: '#b91c1c' }}
                                            name="debt"
                                        />
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
                        <button className={primaryButton} onClick={() => loadUsers(1, usersData.take, userSearch)}>
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
                                        <th className="p-3">Quyền</th>
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
                                            <td className="p-3">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${item.is_admin
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                >
                                                    {item.is_admin ? 'ADMIN' : 'USER'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center flex flex-wrap gap-2 justify-center">
                                                <button className={actionBlue} onClick={() => handleResetPassword(item)}>
                                                    Reset mật khẩu
                                                </button>
                                                <button
                                                    className={actionPurple}
                                                    onClick={() => handleToggleAdmin(item)}
                                                >
                                                    {item.is_admin ? 'Gỡ quyền admin' : 'Cấp quyền admin'}
                                                </button>
                                                <button className={actionRed} onClick={() => handleDeleteUser(item)}>
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
                            className={ghostButton}
                            disabled={usersData.page <= 1}
                            onClick={() => loadUsers(usersData.page - 1, usersData.take, userSearch)}
                        >
                            Trước
                        </button>
                        <span>
                            Trang {usersData.page}/{Math.max(1, usersData.pages)}
                        </span>
                        <button
                            className={ghostButton}
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
                                                <td className="p-3 text-center flex flex-wrap gap-2 justify-center">
                                                    <button
                                                        className={actionBlue}
                                                        onClick={() =>
                                                            setFeeForm({
                                                                id: fee.id,
                                                                name: fee.name,
                                                            })
                                                        }
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button className={actionRed} onClick={() => handleDeleteFee(fee)}>
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
                                className={ghostButton}
                                disabled={feesData.page <= 1}
                                onClick={() => loadFees(feesData.page - 1, feesData.take)}
                            >
                                Trước
                            </button>
                            <span>
                                Trang {feesData.page}/{Math.max(1, feesData.pages)}
                            </span>
                            <button
                                className={ghostButton}
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
                                <button type="submit" className={`${primaryButton} flex-1`}>
                                    Lưu
                                </button>
                                {feeForm.id && (
                                    <button
                                        type="button"
                                        className={`${outlineButton} flex-1`}
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

