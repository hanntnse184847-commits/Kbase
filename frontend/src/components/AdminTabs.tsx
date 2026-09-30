"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
    { href: "/admin/users", label: "Người dùng" },
    { href: "/admin/projects", label: "Project" },
    { href: "/admin/documents", label: "Tài liệu" },
];

export function AdminTabs() {
    const pathname = usePathname();

    return (
        <div className="mb-6 flex gap-2 border-b border-blue-100">
            {TABS.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${active
                            ? "border-blue-600 text-blue-700"
                            : "border-transparent text-slate-500 hover:text-blue-600"
                            }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
