import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily initialised so module evaluation at build-time doesn't throw
// when env vars haven't been injected yet (e.g. during `next build`).
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    return getClient()[prop as keyof SupabaseClient];
  },
});
