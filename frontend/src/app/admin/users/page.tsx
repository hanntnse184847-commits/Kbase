"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api, extractErrorMessage } from "@/lib/api";
import type { Role, UserResponse } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { AdminTabs } from "@/components/AdminTabs";

const ROLES: Role[] = ["USER", "OWNER", "ADMIN"];

interface EditState {
    name: string;
    email: string;
    role: Role;
    password: string;
}

export default function AdminUsersPage() {
    const { isAdmin, loading: authLoading } = useRequireAdmin();

    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [listError, setListError] = useState<string | null>(null);

    // Create form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<Role>("USER");
    const [createError, setCreateError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Inline edit
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editState, setEditState] = useState<EditState | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    async function loadUsers() {
        setLoadingUsers(true);
        setListError(null);
        try {
            const response = await api.get<UserResponse[]>("/api/admin/users");
            setUsers(response.data);
        } catch (error) {
            setListError(extractErrorMessage(error));
        } finally {
            setLoadingUsers(false);
        }
    }

    useEffect(() => {
        if (!isAdmin) return;
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    async function handleCreate(event: FormEvent) {
        event.preventDefault();
        setCreateError(null);
        setCreating(true);
        try {
            await api.post("/api/admin/users", { name, email, password, role });
            setName("");
            setEmail("");
            setPassword("");
            setRole("USER");
            await loadUsers();
        } catch (error) {
            setCreateError(extractErrorMessage(error));
        } finally {
            setCreating(false);
        }
    }

    function startEdit(user: UserResponse) {
        setEditingId(user.id);
        setEditError(null);
        setEditState({
            name: user.name,
            email: user.email,
            role: user.role,
            password: "",
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditState(null);
        setEditError(null);
    }

    async function handleSaveEdit(userId: number) {
        if (!editState) return;
        setEditError(null);
        setSaving(true);
        try {
            const payload: Record<string, string> = {
                name: editState.name,
                email: editState.email,
                role: editState.role,
            };
            if (editState.password.trim()) {
                payload.password = editState.password;
            }
            await api.put(`/api/admin/users/${userId}`, payload);
            cancelEdit();
            await loadUsers();
        } catch (error) {
            setEditError(extractErrorMessage(error));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(userId: number) {
        if (!confirm("Xoá user này? Hành động không thể hoàn tác.")) return;
        setDeleteError(null);
        setDeletingId(userId);
        try {
            await api.delete(`/api/admin/users/${userId}`);
            await loadUsers();
        } catch (error) {
            setDeleteError(extractErrorMessage(error));
        } finally {
            setDeletingId(null);
        }
    }

    async function handleToggleStatus(user: UserResponse) {
        const action = user.enabled ? "khóa" : "mở";
        if (!confirm(`Bạn có chắc muốn ${action} tài khoản ${user.email}?`)) {
            return;
        }
        try {
            await api.patch(`/api/admin/users/${user.id}/status`, null, {
                params: { enabled: !user.enabled },
            });
            await loadUsers();
        } catch (error) {
            alert(extractErrorMessage(error));
        }
    }

    if (authLoading || !isAdmin) {
        return (
            <main className="flex flex-1 items-center justify-center">
                <p className="text-sm font-medium text-blue-600">Đang tải...</p>
            </main>
        );
    }

    return (
        <>
            <Navbar />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
                <h1 className="text-2xl font-bold text-slate-900">Quản trị hệ thống</h1>
                <AdminTabs />

                {/* Form tạo user */}
                <form
                    onSubmit={handleCreate}
                    className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40"
                >
                    <h2 className="text-sm font-semibold text-blue-700">Tạo user mới</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-5">
                        <input
                            required
                            placeholder="Họ tên"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                            required
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                            required
                            type="password"
                            minLength={6}
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Role)}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {ROLES.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={creating}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {creating ? "Đang tạo..." : "Tạo user"}
                        </button>
                    </div>
                    {createError && (
                        <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {createError}
                        </p>
                    )}
                </form>

                {/* Bảng user */}
                <div className="mt-6 overflow-x-auto rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-100/40">
                    {loadingUsers && (
                        <p className="p-4 text-sm font-medium text-blue-600">
                            Đang tải danh sách user...
                        </p>
                    )}
                    {listError && (
                        <p className="m-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {listError}
                        </p>
                    )}
                    {deleteError && (
                        <p className="m-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {deleteError}
                        </p>
                    )}

                    {!loadingUsers && !listError && (
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-blue-100 bg-blue-50/60 text-xs uppercase tracking-wide text-blue-700">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Họ tên</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {users.map((u) => {
                                    const isEditing = editingId === u.id;
                                    return (
                                        <tr key={u.id}>
                                            <td className="px-4 py-3 text-slate-500">{u.id}</td>

                                            {isEditing && editState ? (
                                                <>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            value={editState.name}
                                                            onChange={(e) =>
                                                                setEditState({
                                                                    ...editState,
                                                                    name: e.target.value,
                                                                })
                                                            }
                                                            className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            value={editState.email}
                                                            onChange={(e) =>
                                                                setEditState({
                                                                    ...editState,
                                                                    email: e.target.value,
                                                                })
                                                            }
                                                            className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            value={editState.role}
                                                            onChange={(e) =>
                                                                setEditState({
                                                                    ...editState,
                                                                    role: e.target.value as Role,
                                                                })
                                                            }
                                                            className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        >
                                                            {ROLES.map((r) => (
                                                                <option key={r} value={r}>
                                                                    {r}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {u.enabled ? (
                                                            <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                                                                Hoạt động
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                                Đã khóa
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <input
                                                                type="password"
                                                                placeholder="Mật khẩu mới (bỏ trống nếu giữ nguyên)"
                                                                value={editState.password}
                                                                onChange={(e) =>
                                                                    setEditState({
                                                                        ...editState,
                                                                        password: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveEdit(u.id)}
                                                                    disabled={saving}
                                                                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                                                >
                                                                    {saving ? "Đang lưu..." : "Lưu"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelEdit}
                                                                    className="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                                                >
                                                                    Huỷ
                                                                </button>
                                                            </div>
                                                            {editError && (
                                                                <p className="text-right text-xs text-red-600">
                                                                    {editError}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 font-medium text-slate-800">
                                                        {u.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {u.enabled ? (
                                                            <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                                                                Hoạt động
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                                Đã khóa
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEdit(u)}
                                                                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                                                            >
                                                                Sửa
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(u.id)}
                                                                disabled={deletingId === u.id}
                                                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                            >
                                                                {deletingId === u.id ? "Đang xoá..." : "Xoá"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleStatus(u)}
                                                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${u.enabled
                                                                        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                                                        : "border-green-200 text-green-700 hover:bg-green-50"
                                                                    }`}
                                                            >
                                                                {u.enabled ? "Khóa" : "Mở khóa"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                                {users.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-6 text-center text-slate-400"
                                        >
                                            Chưa có user nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </>
    );
}