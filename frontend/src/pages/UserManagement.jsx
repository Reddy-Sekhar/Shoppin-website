import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { adminFetchUsers, adminUpdateUser, adminDeleteUser } from '../api';
import {
    AlertTriangle,
    Clock3,
    Loader2,
    PencilLine,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldX,
    Trash2,
    X,
} from 'lucide-react';

const roleOptions = [
    { label: 'All Roles', value: 'ALL' },
    { label: 'Seller', value: 'SELLER' },
    { label: 'Buyer', value: 'BUYER' },
    { label: 'Designer', value: 'DESIGNER' },
];

const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
];

const emptyEditState = {
    first_name: '',
    last_name: '',
    phone: '',
    company: '',
    role: 'BUYER',
    is_active: true,
    approval_status: 'APPROVED',
    approval_notes: '',
};

const getInitials = (user) => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return (user.email || '?').slice(0, 2).toUpperCase();
};

const formatDate = (value) => {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (err) {
        return value;
    }
};

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedUser, setSelectedUser] = useState(null);
    const [editForm, setEditForm] = useState(emptyEditState);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [formError, setFormError] = useState('');
    const [pendingActionId, setPendingActionId] = useState(null);
    const [rejectionTarget, setRejectionTarget] = useState(null);
    const [rejectionNotes, setRejectionNotes] = useState('');
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute('data-theme') === 'dark'
    );
    const currentUser = useSelector((state) => state.auth.user);

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (search.trim()) params.search = search.trim();
            if (roleFilter !== 'ALL') params.role = roleFilter;
            if (statusFilter !== 'ALL') params.status = statusFilter;
            const res = await adminFetchUsers(params);
            const payload = res.data?.results || res.data || [];
            setUsers(Array.isArray(payload) ? payload : []);
        } catch (err) {
            console.error('Failed to load users', err);
            const msg = err?.response?.data?.detail || err?.message || 'Unable to load users';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [search, roleFilter, statusFilter]);

    const filteredUsers = useMemo(() => users, [users]);
    const pendingUsers = useMemo(
        () => users.filter((user) => user.approval_status === 'PENDING'),
        [users]
    );

    const statusStyles = {
        PENDING: {
            icon: Clock3,
            label: 'Pending review',
            light: {
                text: 'text-amber-700',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
            },
            dark: {
                text: 'text-amber-200',
                bg: 'bg-amber-500/10',
                border: 'border-amber-400/40',
            },
        },
        APPROVED: {
            icon: ShieldCheck,
            label: 'Approved',
            light: {
                text: 'text-emerald-700',
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
            },
            dark: {
                text: 'text-emerald-200',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-400/40',
            },
        },
        REJECTED: {
            icon: ShieldX,
            label: 'Rejected',
            light: {
                text: 'text-rose-700',
                bg: 'bg-rose-50',
                border: 'border-rose-200',
            },
            dark: {
                text: 'text-rose-200',
                bg: 'bg-rose-500/10',
                border: 'border-rose-400/40',
            },
        },
    };

    const renderStatusBadge = (status, fallbackLabel) => {
        if (!status) return '—';
        const meta = statusStyles[status] || {};
        const palette = isDark ? meta.dark || {} : meta.light || {};
        const Icon = meta.icon;
        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${palette.text || 'text-gray-600'} ${palette.border || 'border-gray-200'} ${palette.bg || 'bg-gray-100'}`}
            >
                {Icon && <Icon size={12} />}
                {fallbackLabel || status}
            </span>
        );
    };

    const openEdit = (user) => {
        setSelectedUser(user);
        setEditForm({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            phone: user.phone || '',
            company: user.company || '',
            role: user.role || 'BUYER',
            is_active: user.is_active ?? true,
            approval_status: user.approval_status || 'PENDING',
            approval_notes: user.approval_notes || '',
        });
        setFormError('');
    };

    const closeEdit = () => {
        setSelectedUser(null);
        setEditForm(emptyEditState);
        setFormError('');
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        setSaving(true);
        setFormError('');
        try {
            const res = await adminUpdateUser(selectedUser.id, editForm);
            const updated = res.data;
            setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
            closeEdit();
        } catch (err) {
            console.error('Failed to update user', err);
            const msg = err?.response?.data || err?.message || 'Update failed';
            setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Delete ${user.first_name || user.email}? This cannot be undone.`)) return;
        setDeleteId(user.id);
        try {
            await adminDeleteUser(user.id);
            setUsers((prev) => prev.filter((item) => item.id !== user.id));
        } catch (err) {
            console.error('Failed to delete user', err);
            const msg = err?.response?.data?.detail || err?.message || 'Delete failed';
            alert(msg);
        } finally {
            setDeleteId(null);
        }
    };

    const handleQuickApprove = async (user) => {
        setPendingActionId(user.id);
        try {
            const res = await adminUpdateUser(user.id, { approval_status: 'APPROVED', approval_notes: '' });
            const updated = res.data;
            setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        } catch (err) {
            console.error('Failed to approve user', err);
            const msg = err?.response?.data?.detail || err?.message || 'Unable to approve user';
            alert(msg);
        } finally {
            setPendingActionId(null);
        }
    };

    const openRejectionDialog = (user) => {
        setRejectionTarget(user);
        setRejectionNotes('');
    };

    const closeRejectionDialog = () => {
        setRejectionTarget(null);
        setRejectionNotes('');
    };

    const submitRejection = async (e) => {
        e?.preventDefault?.();
        if (!rejectionTarget) return;
        setPendingActionId(rejectionTarget.id);
        try {
            const payload = {
                approval_status: 'REJECTED',
                approval_notes: rejectionNotes.trim() || 'No additional notes provided.',
            };
            const res = await adminUpdateUser(rejectionTarget.id, payload);
            const updated = res.data;
            setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            closeRejectionDialog();
        } catch (err) {
            console.error('Failed to reject user', err);
            const msg = err?.response?.data?.detail || err?.message || 'Unable to reject user';
            alert(msg);
        } finally {
            setPendingActionId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-sm text-gray-500">Review pending seller/designer accounts, update details, or deactivate users.</p>
                </div>
                <button
                    type="button"
                    onClick={loadUsers}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or company"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-accent focus:outline-none"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm md:w-52"
                >
                    {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm md:w-52"
                >
                    {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Approval Queue</h2>
                        <p className="text-sm text-gray-500">
                            {pendingUsers.length ? `${pendingUsers.length} account${pendingUsers.length === 1 ? '' : 's'} awaiting review` : 'No pending seller or designer accounts right now.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                        <Clock3 size={16} />
                        SLA: respond within 2 business days
                    </div>
                </div>
                {pendingUsers.length > 0 && (
                    <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                        {pendingUsers.map((user) => (
                            <div key={user.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-semibold">
                                        {getInitials(user)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user.email}
                                        </p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2 text-sm text-gray-600">
                                    <p><span className="font-semibold text-gray-800">Role:</span> {user.role_label || user.role}</p>
                                    <p><span className="font-semibold text-gray-800">Company:</span> {user.company || '—'}</p>
                                    <p><span className="font-semibold text-gray-800">Submitted:</span> {formatDate(user.created_at)}</p>
                                    {user.approval_notes && (
                                        <p className="rounded-lg bg-white/70 px-3 py-2 text-xs text-gray-600 border border-amber-100">
                                            Latest notes: {user.approval_notes}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleQuickApprove(user)}
                                        disabled={pendingActionId === user.id}
                                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow disabled:opacity-70"
                                    >
                                        {pendingActionId === user.id ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" /> Approving...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck size={14} /> Approve
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openRejectionDialog(user)}
                                        disabled={pendingActionId === user.id}
                                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-70"
                                    >
                                        <ShieldX size={14} /> Reject
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openEdit(user)}
                                        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
                                    >
                                        <PencilLine size={14} /> Review details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Company</th>
                                <th className="px-4 py-3">Phone</th>
                                <th className="px-4 py-3">Joined</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2 text-sm font-medium">
                                            <Loader2 className="animate-spin" size={18} /> Loading users...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        No users match your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar ? (
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.first_name || user.email}
                                                        className="h-10 w-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div
                                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-semibold text-white"
                                                    >
                                                        {getInitials(user)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900">{user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user.email}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold">
                                                {user.role_label || user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {renderStatusBadge(user.approval_status, user.approval_status_label)}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700">{user.company || '—'}</td>
                                        <td className="px-4 py-4 text-gray-700">{user.phone || '—'}</td>
                                        <td className="px-4 py-4 text-gray-500">{formatDate(user.created_at)}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(user)}
                                                        disabled={currentUser?.id === user.id}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-accent disabled:opacity-60"
                                                    >
                                                        <PencilLine size={14} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(user)}
                                                        disabled={deleteId === user.id || currentUser?.id === user.id}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-70"
                                                    >
                                                        <Trash2 size={14} /> {deleteId === user.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div
                        className="w-full max-w-xl rounded-2xl border p-6"
                        style={{
                            backgroundColor: isDark ? '#101a33' : '#ffffff',
                            color: isDark ? '#f8fafc' : '#0f172a',
                            borderColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)',
                            boxShadow: isDark
                                ? '0 30px 60px rgba(3,7,18,0.85)'
                                : '0 25px 45px rgba(15,23,42,0.18)',
                        }}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Edit User</h2>
                                <p className="text-xs text-gray-500">{selectedUser.email}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={submitEdit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">First Name</label>
                                    <input
                                        name="first_name"
                                        value={editForm.first_name}
                                        onChange={handleEditChange}
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Last Name</label>
                                    <input
                                        name="last_name"
                                        value={editForm.last_name}
                                        onChange={handleEditChange}
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Phone</label>
                                    <input
                                        name="phone"
                                        value={editForm.phone}
                                        onChange={handleEditChange}
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Company</label>
                                    <input
                                        name="company"
                                        value={editForm.company}
                                        onChange={handleEditChange}
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Role</label>
                                    <select
                                        name="role"
                                        value={editForm.role}
                                        onChange={handleEditChange}
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm"
                                    >
                                        {roleOptions
                                            .filter((option) => option.value !== 'ALL')
                                            .map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        name="is_active"
                                        checked={!!editForm.is_active}
                                        onChange={handleEditChange}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium">
                                        Active account
                                    </label>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-slate-50/60 p-4">
                                <p className="text-xs font-semibold text-gray-500">Approval status</p>
                                <div className="mt-2 grid gap-4 md:grid-cols-2">
                                    <select
                                        name="approval_status"
                                        value={editForm.approval_status}
                                        onChange={handleEditChange}
                                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                                    >
                                        {statusOptions
                                            .filter((option) => option.value !== 'ALL')
                                            .map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                    </select>
                                    <textarea
                                        name="approval_notes"
                                        value={editForm.approval_notes}
                                        onChange={handleEditChange}
                                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                                        rows={3}
                                        placeholder="Internal notes or rejection reason"
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                                    {formError}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeEdit}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-70"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" size={16} /> Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {rejectionTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div
                        className="w-full max-w-lg rounded-2xl border p-6"
                        style={{
                            backgroundColor: isDark ? '#1b253f' : '#ffffff',
                            color: isDark ? '#f8fafc' : '#0f172a',
                            borderColor: isDark ? 'rgba(248,250,252,0.1)' : 'rgba(15,23,42,0.08)',
                        }}
                    >
                        <div className="mb-4 flex items-center gap-2 text-rose-600">
                            <AlertTriangle size={18} />
                            <div>
                                <h3 className="text-lg font-semibold">Reject {rejectionTarget.email}</h3>
                                <p className="text-xs text-gray-500">A short note helps the applicant understand what to fix.</p>
                            </div>
                        </div>
                        <form onSubmit={submitRejection} className="space-y-4">
                            <textarea
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                                rows={4}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                placeholder="Example: Missing GST details; please re-submit documents."
                                required
                            />
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeRejectionDialog}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={pendingActionId === rejectionTarget.id}
                                    className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-70"
                                >
                                    {pendingActionId === rejectionTarget.id ? (
                                        <>
                                            <Loader2 className="mr-2 animate-spin" size={16} /> Sending...
                                        </>
                                    ) : (
                                        'Send rejection'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
