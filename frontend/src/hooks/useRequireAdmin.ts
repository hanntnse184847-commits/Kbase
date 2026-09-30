"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Same idea as useRequireAuth, but also kicks non-admins back to /dashboard.
// A logged-in non-admin never even sees a flash of the admin UI: the redirect
// fires in the same effect that would otherwise render the page.
export function useRequireAdmin() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        if (user.role !== "ADMIN") {
            router.replace("/dashboard");
        }
    }, [loading, user, router]);

    const isAdmin = !loading && !!user && user.role === "ADMIN";
    return { user, loading, isAdmin };
}
