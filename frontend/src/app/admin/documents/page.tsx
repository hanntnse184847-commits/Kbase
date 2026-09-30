
"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AdminTabs } from "@/components/AdminTabs";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api, extractErrorMessage } from "@/lib/api";
import type { AdminDocumentResponse } from "@/lib/types";

export default function AdminDocumentsPage() {
    const { isAdmin, loading: authLoading } = useRequireAdmin();

    const [documents, setDocuments] =
        useState<AdminDocumentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDocuments() {
        setLoading(true);
        setError("");

        try {
            const response =
                await api.get<AdminDocumentResponse[]>(
                    "/api/admin/documents"
                );

            setDocuments(response.data);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (isAdmin) {
            loadDocuments();
        }
    }, [isAdmin]);

    function formatSize(bytes: number) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    if (authLoading || !isAdmin) {
        return (
            <main className="flex flex-1 items-center justify-center">
                <p className="text-sm text-blue-600">
                    Đang tải...
                </p>
            </main>
        );
    }

    return (
        <>
            <Navbar />

            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
                <h1 className="text-2xl font-bold text-slate-900">
                    Quản trị hệ thống
                </h1>

                <AdminTabs />

                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Quản lý tài liệu
                        </h2>
                        <p className="text-sm text-slate-500">
                            Tổng cộng {documents.length} tài liệu
                        </p>
                    </div>

                    <button
                        onClick={loadDocuments}
                        className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                        Làm mới
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
                    {loading ? (
                        <p className="p-5 text-sm text-blue-600">
                            Đang tải tài liệu...
                        </p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-blue-50 text-xs uppercase text-blue-700">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Tên tài liệu</th>
                                    <th className="px-4 py-3">Project</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3">Người tải lên</th>
                                    <th className="px-4 py-3">Dung lượng</th>
                                    <th className="px-4 py-3">Ngày tạo</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-blue-50">
                                {documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td className="px-4 py-3 text-slate-500">
                                            {doc.id}
                                        </td>

                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {doc.originalFileName}
                                        </td>

                                        <td className="px-4 py-3">
                                            <a
                                                href={`/admin/projects/${doc.projectId}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {doc.projectName}
                                            </a>
                                        </td>

                                        <td className="px-4 py-3 text-slate-600">
                                            {doc.ownerEmail}
                                        </td>

                                        <td className="px-4 py-3 text-slate-600">
                                            {doc.uploadedByName}
                                        </td>

                                        <td className="px-4 py-3 text-slate-500">
                                            {formatSize(doc.fileSize)}
                                        </td>

                                        <td className="px-4 py-3 text-slate-500">
                                            {new Date(
                                                doc.createdAt
                                            ).toLocaleDateString("vi-VN")}
                                        </td>
                                    </tr>
                                ))}

                                {documents.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-8 text-center text-slate-400"
                                        >
                                            Chưa có tài liệu nào.
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