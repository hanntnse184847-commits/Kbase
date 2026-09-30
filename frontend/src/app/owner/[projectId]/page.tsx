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

export default function OwnerProjectPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const params = useParams<{ projectId: string }>();
    const router = useRouter();
    const projectId = params.projectId;

    const [project, setProject] = useState<ProjectResponse | null>(null);
    const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
    const [documents, setDocuments] = useState<DocumentResponse[]>([]);
    const [pageError, setPageError] = useState<string | null>(null);
    const [loadingPage, setLoadingPage] = useState(true);

    // Edit project
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    // Delete project
    const [deletingProject, setDeletingProject] = useState(false);
    const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);

    // Members
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);
    const [removingUserId, setRemovingUserId] = useState<number | null>(null);

    // Documents
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
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

            if (user && projectRes.data.ownerEmail !== user.email) {
                router.replace(`/user/${projectId}`);
                return;
            }

            setProject(projectRes.data);
            setEditName(projectRes.data.name);
            setEditDescription(projectRes.data.description ?? "");
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

    // Debounce search
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

    async function handleSaveEdit(event: FormEvent) {
        event.preventDefault();
        setEditError(null);
        setSavingEdit(true);
        try {
            const res = await api.put<ProjectResponse>(`/api/projects/${projectId}`, {
                name: editName,
                description: editDescription || null,
            });
            setProject(res.data);
            setEditing(false);
        } catch (error) {
            setEditError(extractErrorMessage(error));
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleDeleteProject() {
        if (
            !confirm(
                `Xóa project "${project?.name}"?\nTất cả thành viên và tài liệu sẽ bị xóa vĩnh viễn.`,
            )
        ) {
            return;
        }
        setDeleteProjectError(null);
        setDeletingProject(true);
        try {
            await api.delete(`/api/projects/${projectId}`);
            router.replace("/dashboard");
        } catch (error) {
            setDeleteProjectError(extractErrorMessage(error));
            setDeletingProject(false);
        }
    }

    async function handleInvite(event: FormEvent) {
        event.preventDefault();
        setInviteError(null);
        setInviting(true);
        try {
            await api.post(`/api/projects/${projectId}/members`, { email: inviteEmail });
            setInviteEmail("");
            await loadAll();
        } catch (error) {
            setInviteError(extractErrorMessage(error));
        } finally {
            setInviting(false);
        }
    }

    async function handleRemoveMember(memberUserId: number, memberName: string) {
        if (!confirm(`Xóa "${memberName}" khỏi project này?`)) return;
        setRemoveError(null);
        setRemovingUserId(memberUserId);
        try {
            await api.delete(`/api/projects/${projectId}/members/${memberUserId}`);
            await loadAll();
        } catch (error) {
            setRemoveError(extractErrorMessage(error));
        } finally {
            setRemovingUserId(null);
        }
    }

    async function handleUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const fileInput = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
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

    async function handleDeleteDocument(doc: DocumentResponse) {
        if (!confirm(`Xóa tài liệu "${doc.originalFileName}"?`)) return;
        setDeleteError(null);
        setDeletingDocId(doc.id);
        try {
            await api.delete(`/api/projects/${projectId}/documents/${doc.id}`);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (error) {
            setDeleteError(extractErrorMessage(error));
        } finally {
            setDeletingDocId(null);
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
                        {/* Header + actions */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        {project?.name ?? `Project #${projectId}`}
                                    </h1>
                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                        Bạn là Owner
                                    </span>
                                </div>
                                {project?.description && (
                                    <p className="mt-1 text-slate-500">{project.description}</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing((v) => !v);
                                        setEditError(null);
                                        if (project) {
                                            setEditName(project.name);
                                            setEditDescription(project.description ?? "");
                                        }
                                    }}
                                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                >
                                    {editing ? "Hủy sửa" : "Sửa project"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteProject}
                                    disabled={deletingProject}
                                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                    {deletingProject ? "Đang xóa..." : "Xóa project"}
                                </button>
                            </div>
                        </div>

                        {deleteProjectError && (
                            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {deleteProjectError}
                            </p>
                        )}

                        {/* Form sửa project */}
                        {editing && (
                            <form
                                onSubmit={handleSaveEdit}
                                className="mt-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40"
                            >
                                <h2 className="text-sm font-semibold text-blue-700">Sửa thông tin project</h2>
                                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                                    <input
                                        required
                                        placeholder="Tên project"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <input
                                        placeholder="Mô tả (tuỳ chọn)"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={savingEdit}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {savingEdit ? "Đang lưu..." : "Lưu"}
                                    </button>
                                </div>
                                {editError && (
                                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {editError}
                                    </p>
                                )}
                            </form>
                        )}

                        <div className="mt-8 grid gap-6 lg:grid-cols-2">
                            {/* Members */}
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
                                            <div className="flex shrink-0 items-center gap-2">
                                                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                                    {member.role}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveMember(member.userId, member.name)}
                                                    disabled={removingUserId === member.userId}
                                                    className="rounded-lg border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    {removingUserId === member.userId ? "Đang xóa..." : "Xóa"}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                    {members.length === 0 && (
                                        <li className="py-2 text-sm text-slate-400">Chưa có thành viên nào.</li>
                                    )}
                                </ul>
                                {removeError && (
                                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {removeError}
                                    </p>
                                )}

                                <form onSubmit={handleInvite} className="mt-4 flex gap-2">
                                    <input
                                        type="email"
                                        required
                                        placeholder="Email người cần mời"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {inviting ? "Đang mời..." : "Mời"}
                                    </button>
                                </form>
                                {inviteError && (
                                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {inviteError}
                                    </p>
                                )}
                            </section>

                            {/* Documents */}
                            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-blue-700">Tài liệu</h2>
                                    {searching && <span className="text-xs text-blue-400">Đang tìm...</span>}
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
                                {deleteError && (
                                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {deleteError}
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
                                            <div className="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(doc)}
                                                    className="rounded-lg border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                                                >
                                                    Tải
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDocument(doc)}
                                                    disabled={deletingDocId === doc.id}
                                                    className="rounded-lg border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    {deletingDocId === doc.id ? "..." : "Xóa"}
                                                </button>
                                            </div>
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
                                    Hỗ trợ: PDF, Word, Excel, PowerPoint, Markdown, TXT, ảnh, video
                                </p>
                            </section>
                        </div>
                    </>
                )}
            </main>
        </>
    );
}