"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, extractErrorMessage } from "@/lib/api";
import type { ProjectResponse } from "@/lib/types";
import { Navbar } from "@/components/Navbar";

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadProjects() {
    setLoadingProjects(true);
    setListError(null);
    try {
      const response = await api.get<ProjectResponse[]>("/api/projects");
      setProjects(response.data);
    } catch (error) {
      setListError(extractErrorMessage(error));
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      await api.post("/api/projects", { name, description });
      setName("");
      setDescription("");
      await loadProjects();
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm font-medium text-blue-600">Đang tải...</p>
      </main>
    );
  }

  // A project's "role" is per-project, not the account's global role: an OWNER
  // account invited into someone else's project only has member rights there.
  // So we split strictly by ownerEmail === my email, and route into /owner/{id}
  // (full management) or /user/{id} (view/upload/download/search only)
  // accordingly.
  const ownedProjects = projects.filter((p) => p.ownerEmail === user.email);
  const memberProjects = projects.filter((p) => p.ownerEmail !== user.email);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Projects của bạn</h1>

        {user.role === "OWNER" && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40"
          >
            <h2 className="text-sm font-semibold text-blue-700">Tạo project mới</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <input
                required
                placeholder="Tên project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                placeholder="Mô tả (tuỳ chọn)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "Tạo project"}
              </button>
            </div>
            {formError && (
              <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
          </form>
        )}

        {loadingProjects && (
          <p className="mt-6 text-sm font-medium text-blue-600">Đang tải project...</p>
        )}
        {listError && (
          <p className="mt-6 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </p>
        )}

        {!loadingProjects && !listError && (
          <>
            {/* Owner section */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-blue-700">
                Project bạn sở hữu ({ownedProjects.length})
              </h2>
              {ownedProjects.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  {user.role === "OWNER"
                    ? "Bạn chưa tạo project nào."
                    : "Chỉ tài khoản role OWNER mới tạo được project."}
                </p>
              )}
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {ownedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/owner/${project.id}`}
                    className="block rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md hover:shadow-blue-200/50"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{project.name}</h3>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Owner
                      </span>
                    </div>
                    {project.description && (
                      <p className="mt-1 text-sm text-slate-500">{project.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>

            {/* Member section */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-blue-700">
                Project bạn tham gia ({memberProjects.length})
              </h2>
              {memberProjects.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  Chưa được mời vào project nào.
                </p>
              )}
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {memberProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/user/${project.id}`}
                    className="block rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md hover:shadow-blue-200/50"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{project.name}</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Member
                      </span>
                    </div>
                    {project.description && (
                      <p className="mt-1 text-sm text-slate-500">{project.description}</p>
                    )}
                    <p className="mt-3 text-xs font-medium text-blue-500">
                      Owner: {project.ownerEmail}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
