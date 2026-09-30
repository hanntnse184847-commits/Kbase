"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-blue-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-lg font-bold text-transparent"
        >
          KBase
        </Link>

        {user && (
          <div className="flex items-center gap-4 text-sm">
            {user.role === "ADMIN" && (
              <Link
                href="/admin/users"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Quản trị
              </Link>
            )}
            <span className="text-slate-600">
              {user.email}{" "}
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {user.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-blue-200 px-3 py-1.5 font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}