"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
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

export default function ProjectDetailPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

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

  // Debounced search: re-queries /documents/search 350ms after the user stops
  // typing, instead of firing a request on every keystroke. An empty query
  // just returns the full list again (same behavior as the backend endpoint).
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
    if (!confirm(`Xoá "${memberName}" khỏi project này?`)) return;
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

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm font-medium text-blue-600">Đang tải...</p>
      </main>
    );
  }

  const isOwner = project?.ownerEmail === user.email;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {loadingPage && (
          <p className="text-sm font-medium text-blue-600">Đang tải project...</p>
        )}
        {pageError && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {pageError}
          </p>
        )}

        {!loadingPage && !pageError && (
          <>
            <h1 className="text-2xl font-bold text-slate-900">
              {project?.name ?? `Project #${projectId}`}
            </h1>
            {project?.description && (
              <p className="mt-1 text-slate-500">{project.description}</p>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* Members */}
              <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40">
                <h2 className="font-semibold text-blue-700">Thành viên</h2>

                <ul className="mt-3 divide-y divide-blue-50">
                  {members.map((member) => (
                    <li key={member.userId} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-800">
                        {member.name} <span className="text-slate-400">({member.email})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {member.role}
                        </span>
                        {isOwner && (
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.name)}
                            disabled={removingUserId === member.userId}
                            className="rounded-lg border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {removingUserId === member.userId ? "Đang xoá..." : "Xoá"}
                          </button>
                        )}
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

                {isOwner && (
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
                )}
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

                <ul className="mt-3 divide-y divide-blue-50">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{doc.originalFileName}</p>
                        <p className="text-xs text-slate-400">
                          {doc.fileCategory} · {formatBytes(doc.fileSize)} · bởi{" "}
                          <span className="text-blue-600">{doc.uploadedByName}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        Tải xuống
                      </button>
                    </li>
                  ))}
                  {documents.length === 0 && (
                    <li className="py-2 text-sm text-slate-400">
                      {searchQuery ? "Không tìm thấy tài liệu nào khớp." : "Chưa có tài liệu nào."}
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
                  Hỗ trợ: PDF, Word, Excel, PowerPoint, Markdown, TXT, ảnh (JPG/PNG/GIF/SVG/BMP), video (MP4/MOV/AVI)
                </p>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
