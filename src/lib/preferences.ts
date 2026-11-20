import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN_RE } from "@/lib/consents";

export type PreferencesData = {
  first_name: string;
  tenant_slug: string;
  tenant_name: string;
  locale: string;
  consents: Record<string, boolean>;
};

export async function getPreferences(token: string): Promise<PreferencesData | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await createAdminClient().rpc("get_preferences", {
    p_token: token,
  });
  if (error || !data) return null;
  return data as PreferencesData;
}
