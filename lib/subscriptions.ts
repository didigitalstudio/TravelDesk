import { createClient } from '@/lib/supabase/server';

export async function getTenantFeatures(): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_tenant_features');
  return (data as Record<string, boolean>) ?? {};
}
