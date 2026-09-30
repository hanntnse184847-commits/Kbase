"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api, extractErrorMessage } from "@/lib/api";
import type { ProjectResponse } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { AdminTabs } from "@/components/AdminTabs";

export default function AdminProjectsPage() {
    const { isAdmin, loading: authLoading } = useRequireAdmin();

    const [projects, setProjects] = useState<ProjectResponse[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    async function loadProjects() {
        setLoadingProjects(true);
        setListError(null);
        try {
            const response = await api.get<ProjectResponse[]>("/api/admin/projects");
            setProjects(response.data);
        } catch (error) {
            setListError(extractErrorMessage(error));
        } finally {
            setLoadingProjects(false);
        }
    }

    useEffect(() => {
        if (!isAdmin) return;
        loadProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    async function handleDelete(projectId: number, name: string) {
        if (
            !confirm(
                `Xóa project "${name}"?\nToàn bộ tài liệu và thành viên sẽ bị xóa vĩnh viễn.`,
            )
        )
            return;
        setDeleteError(null);
        setDeletingId(projectId);
        try {
            await api.delete(`/api/admin/projects/${projectId}`);
            await loadProjects();
        } catch (error) {
            setDeleteError(extractErrorMessage(error));
        } finally {
            setDeletingId(null);
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

                {deleteError && (
                    <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {deleteError}
                    </p>
                )}

                <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-100/40">
                    {loadingProjects && (
                        <p className="p-4 text-sm font-medium text-blue-600">
                            Đang tải danh sách project...
                        </p>
                    )}
                    {listError && (
                        <p className="m-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {listError}
                        </p>
                    )}

                    {!loadingProjects && !listError && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-blue-50 text-xs uppercase text-blue-700">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Tên</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3">Ngày tạo</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {projects.map((p) => (
                                    <tr key={p.id} className="hover:bg-blue-50/40">
                                        <td className="px-4 py-3 text-slate-500">{p.id}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            <Link
                                                href={`/admin/projects/${p.id}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {p.name}
                                            </Link>
                                            {p.description && (
                                                <p className="text-xs font-normal text-slate-400">
                                                    {p.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{p.ownerEmail}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/admin/projects/${p.id}`}
                                                className="mr-2 rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                            >
                                                Chi tiết
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(p.id, p.name)}
                                                disabled={deletingId === p.id}
                                                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                {deletingId === p.id ? "..." : "Xóa"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {projects.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-8 text-center text-slate-400"
                                        >
                                            Chưa có project nào.
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