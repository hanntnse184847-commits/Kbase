"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, extractErrorMessage } from "@/lib/api";
import type {
    DocumentResponse,
    ProjectMemberResponse,
    ProjectResponse,
} from "@/lib/types";
import { Navbar } from "@/components/Navbar";

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Trang Member (User):
 * - Xem project, thành viên
 * - Xem / tìm / upload / download tài liệu
 * - KHÔNG: sửa/xóa project, mời/xóa member, xóa tài liệu
 * Nếu user là owner của project → redirect sang /owner/{id}
 */
export default function UserProjectPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const params = useParams<{ projectId: string }>();
    const router = useRouter();
    const projectId = params.projectId;

    const [project, setProject] = useState<ProjectResponse | null>(null);
    const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
    const [documents, setDocuments] = useState<DocumentResponse[]>([]);
    const [pageError, setPageError] = useState<string | null>(null);
    const [loadingPage, setLoadingPage] = useState(true);

    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    async function loadAll() {
        setLoadingPage(true);
        setPageError(null);
        try {
            const [projectRes, membersRes, documentsRes] = await Promise.all([
                api.get<ProjectResponse>(`/api/projects/${projectId}`),
                api.get<ProjectMemberResponse[]>(`/api/projects/${projectId}/members`),
                api.get<DocumentResponse[]>(`/api/projects/${projectId}/documents`),
            ]);

            // Owner phải dùng trang quản lý
            if (user && projectRes.data.ownerEmail === user.email) {
                router.replace(`/owner/${projectId}`);
                return;
            }

            setProject(projectRes.data);
            setMembers(membersRes.data);
            setDocuments(documentsRes.data);
        } catch (error) {
            setPageError(extractErrorMessage(error));
        } finally {
            setLoadingPage(false);
        }
    }

    useEffect(() => {
        if (!user) return;
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, projectId]);

    // Tìm kiếm tài liệu (debounce 350ms)
    useEffect(() => {
        if (!user || loadingPage) return;

        const timeoutId = setTimeout(async () => {
            setSearching(true);
            setSearchError(null);
            try {
                const response = await api.get<DocumentResponse[]>(
                    `/api/projects/${projectId}/documents/search`,
                    { params: { query: searchQuery || undefined } },
                );
                setDocuments(response.data);
            } catch (error) {
                setSearchError(extractErrorMessage(error));
            } finally {
                setSearching(false);
            }
        }, 350);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    async function handleUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const fileInput = event.currentTarget.elements.namedItem(
            "file",
        ) as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) return;

        setUploadError(null);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            await api.post(`/api/projects/${projectId}/documents`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            fileInput.value = "";
            setSearchQuery("");
            await loadAll();
        } catch (error) {
            setUploadError(extractErrorMessage(error));
        } finally {
            setUploading(false);
        }
    }

    async function handleDownload(doc: DocumentResponse) {
        try {
            const response = await api.get(
                `/api/projects/${projectId}/documents/${doc.id}/download`,
                { responseType: "blob" },
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = doc.originalFileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(extractErrorMessage(error));
        }
    }

    if (authLoading || !user || loadingPage) {
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
                {pageError && (
                    <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {pageError}
                    </p>
                )}

                {!pageError && (
                    <>
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {project?.name ?? `Project #${projectId}`}
                            </h1>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                Bạn là Member
                            </span>
                        </div>
                        {project?.description && (
                            <p className="mt-1 text-slate-500">{project.description}</p>
                        )}
                        <p className="mt-1 text-xs font-medium text-blue-500">
                            Owner: {project?.ownerEmail}
                        </p>

                        <div className="mt-8 grid gap-6 lg:grid-cols-2">
                            {/* Thành viên — chỉ xem */}
                            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40">
                                <h2 className="font-semibold text-blue-700">Thành viên</h2>

                                <ul className="mt-3 divide-y divide-blue-50">
                                    {members.map((member) => (
                                        <li
                                            key={member.userId}
                                            className="flex items-center justify-between gap-2 py-2 text-sm"
                                        >
                                            <span className="text-slate-800">
                                                {member.name}{" "}
                                                <span className="text-slate-400">({member.email})</span>
                                            </span>
                                            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                                {member.role}
                                            </span>
                                        </li>
                                    ))}
                                    {members.length === 0 && (
                                        <li className="py-2 text-sm text-slate-400">
                                            Chưa có thành viên nào.
                                        </li>
                                    )}
                                </ul>
                                <p className="mt-3 text-xs text-slate-400">
                                    Chỉ Owner mới được mời / xóa thành viên.
                                </p>
                            </section>

                            {/* Tài liệu — xem, tìm, upload, download (không xóa) */}
                            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-blue-700">Tài liệu</h2>
                                    {searching && (
                                        <span className="text-xs text-blue-400">Đang tìm...</span>
                                    )}
                                </div>

                                <input
                                    type="search"
                                    placeholder="Tìm tài liệu theo tên file..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="mt-3 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {searchError && (
                                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {searchError}
                                    </p>
                                )}

                                <ul className="mt-3 max-h-72 divide-y divide-blue-50 overflow-y-auto">
                                    {documents.map((doc) => (
                                        <li
                                            key={doc.id}
                                            className="flex items-center justify-between gap-2 py-2 text-sm"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-slate-800">
                                                    {doc.originalFileName}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {formatBytes(doc.fileSize)} · {doc.fileCategory} ·{" "}
                                                    {doc.uploadedByName}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(doc)}
                                                className="shrink-0 rounded-lg border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                                            >
                                                Tải
                                            </button>
                                        </li>
                                    ))}
                                    {documents.length === 0 && (
                                        <li className="py-2 text-sm text-slate-400">
                                            {searchQuery
                                                ? "Không tìm thấy tài liệu nào khớp."
                                                : "Chưa có tài liệu nào."}
                                        </li>
                                    )}
                                </ul>

                                <form onSubmit={handleUpload} className="mt-4 flex gap-2">
                                    <input
                                        type="file"
                                        name="file"
                                        required
                                        className="flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {uploading ? "Đang tải lên..." : "Upload"}
                                    </button>
                                </form>
                                {uploadError && (
                                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {uploadError}
                                    </p>
                                )}
                                <p className="mt-2 text-xs text-slate-400">
                                    Hỗ trợ: PDF, Word, Excel, PowerPoint, Markdown, TXT, ảnh, video.
                                    Chỉ Owner mới được xóa tài liệu.
                                </p>
                            </section>
                        </div>
                    </>
                )}
            </main>
        </>
    );
}