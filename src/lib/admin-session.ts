import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export type AdminSession = {
  userId: string;
  email: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    brand_color: string;
    accent_color: string | null;
    font: string;
    theme_mode: string;
    logo_path: string | null;
  };
  role: "admin" | "leader";
};

export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase
    .from("tenant_users")
    .select("role, tenants(id, slug, name, brand_color, accent_color, font, theme_mode, logo_path)")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();

  const tenant = data?.tenants as unknown as AdminSession["tenant"] | null;
  if (!data || !tenant) redirect("/login?error=sin-acceso");

  return {
    userId: auth.user.id,
    email: auth.user.email ?? "",
    tenant,
    role: data.role as AdminSession["role"],
  };
});
