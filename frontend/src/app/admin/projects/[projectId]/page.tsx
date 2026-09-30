"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api, extractErrorMessage } from "@/lib/api";
import type { ProjectDetailResponse } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { AdminTabs } from "@/components/AdminTabs";

export default function AdminProjectDetailPage() {
    const { isAdmin, loading: authLoading } = useRequireAdmin();
    const params = useParams<{ projectId: string }>();
    const router = useRouter();

    const [detail, setDetail] = useState<ProjectDetailResponse | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Edit
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    async function loadDetail() {
        setLoadingDetail(true);
        setError(null);
        try {
            const response = await api.get<ProjectDetailResponse>(
                `/api/admin/projects/${params.projectId}`,
            );
            setDetail(response.data);
            setEditName(response.data.project.name);
            setEditDescription(response.data.project.description ?? "");
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoadingDetail(false);
        }
    }

    useEffect(() => {
        if (!isAdmin) return;
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, params.projectId]);

    async function handleSaveEdit(e: FormEvent) {
        e.preventDefault();
        setEditError(null);
        setSaving(true);
        try {
            await api.put(`/api/admin/projects/${params.projectId}`, {
                name: editName,
                description: editDescription || null,
            });
            setEditing(false);
            await loadDetail();
        } catch (err) {
            setEditError(extractErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (
            !confirm(
                "Xóa project này? Toàn bộ tài liệu, thành viên sẽ bị xóa vĩnh viễn.",
            )
        )
            return;
        setDeleting(true);
        try {
            await api.delete(`/api/admin/projects/${params.projectId}`);
            router.push("/admin/projects");
        } catch (err) {
            setError(extractErrorMessage(err));
            setDeleting(false);
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

                {loadingDetail && (
                    <p className="text-sm font-medium text-blue-600">Đang tải project...</p>
                )}
                {error && (
                    <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </p>
                )}

                {!loadingDetail && detail && (
                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {detail.project.name}
                                </h2>
                                {detail.project.description && (
                                    <p className="mt-1 text-sm text-slate-500">
                                        {detail.project.description}
                                    </p>
                                )}
                                <p className="mt-2 text-xs font-medium text-blue-500">
                                    Owner: {detail.project.ownerEmail} · Tạo lúc{" "}
                                    {new Date(detail.project.createdAt).toLocaleString("vi-VN")}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing((v) => !v);
                                        setEditError(null);
                                        setEditName(detail.project.name);
                                        setEditDescription(detail.project.description ?? "");
                                    }}
                                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                    {editing ? "Hủy sửa" : "Sửa project"}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                    {deleting ? "Đang xóa..." : "Xóa project"}
                                </button>
                            </div>
                        </div>

                        {editing && (
                            <form
                                onSubmit={handleSaveEdit}
                                className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-[1fr_2fr_auto]"
                            >
                                <input
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Tên project"
                                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <input
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Mô tả"
                                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? "Đang lưu..." : "Lưu"}
                                </button>
                                {editError && (
                                    <p className="sm:col-span-3 text-sm text-red-600">{editError}</p>
                                )}
                            </form>
                        )}

                        <h3 className="mt-6 text-sm font-semibold text-blue-700">
                            Thành viên ({detail.members.length})
                        </h3>
                        <ul className="mt-2 divide-y divide-blue-50">
                            {detail.members.map((m) => (
                                <li
                                    key={m.userId}
                                    className="flex items-center justify-between py-2 text-sm"
                                >
                                    <span className="text-slate-800">
                                        {m.name}{" "}
                                        <span className="text-slate-400">({m.email})</span>
                                    </span>
                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                        {m.role}
                                    </span>
                                </li>
                            ))}
                            {detail.members.length === 0 && (
                                <li className="py-2 text-sm text-slate-400">
                                    Chưa có thành viên nào.
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </main>
        </>
    );
}