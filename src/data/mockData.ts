// All real data lives in Supabase. This file only exposes a tiny demo-user fixture
// used by the legacy "demo login" buttons in src/pages/Auth.tsx.
// Do NOT add new mock arrays here.

import type { User } from "@/types";

export const demoUsers: Record<string, User> = {
  resident: { id: "u_demo_resident", role: "resident", name: "נועה כהן",  phone: "050-1234567", email: "noa@demo.co",   projectId: undefined, apartment: "ב/14" },
  supplier: { id: "u_demo_supplier", role: "supplier", name: "אבי לוי",   phone: "052-7654321", email: "avi@royal.co",  projectId: undefined },
  admin:    { id: "u_demo_admin",    role: "admin",    name: "מנהל מערכת", phone: "054-0000000", email: "admin@groupbuild.co" },
};
