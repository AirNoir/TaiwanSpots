// Removes guest (anonymous) accounts nobody has used for a while. Every install
// creates one at first launch (docs/spec.md §5.1); it is deleted the moment the
// traveller binds Apple / Google, so what is left here are phones that
// uninstalled the app or never came back. Supabase has no automatic cleanup for
// anonymous users, so a schedule calls this (see docs/spec.md §5.4).
//
// Safe by default: mode is 'dry_run' (count only) unless the body says 'delete'.
// Protected by the x-cron-secret header; deploy with --no-verify-jwt because the
// scheduler has no user session.
import { createClient } from 'npm:@supabase/supabase-js@2';

const RETENTION_DAYS_DEFAULT = 30;
const BATCH_LIMIT_DEFAULT = 200;
const PAGE_SIZE = 200;
const MAX_PAGES = 100;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CLEANUP_CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const mode: 'dry_run' | 'delete' = body.mode === 'delete' ? 'delete' : 'dry_run';
  const retentionDays: number =
    typeof body.retention_days === 'number' && body.retention_days > 0 ? body.retention_days : RETENTION_DAYS_DEFAULT;
  const limit: number = typeof body.limit === 'number' && body.limit > 0 ? body.limit : BATCH_LIMIT_DEFAULT;

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const stale: string[] = [];
  let pagesScanned = 0;
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error) throw error;
      pagesScanned = page;
      const users = data?.users ?? [];
      for (const u of users) {
        if (u.is_anonymous !== true) continue;
        const lastActive = new Date(u.last_sign_in_at ?? u.created_at ?? 0).getTime();
        if (Number.isFinite(lastActive) && lastActive < cutoff) stale.push(u.id);
      }
      if (users.length < PAGE_SIZE) break;
    }
  } catch (e) {
    return json({ error: `listUsers failed: ${String(e).slice(0, 200)}` }, 500);
  }

  const batch = stale.slice(0, limit);
  if (mode !== 'delete') {
    return json({
      mode,
      retention_days: retentionDays,
      pages_scanned: pagesScanned,
      anonymous_stale_total: stale.length,
      would_delete_this_run: batch.length,
      sample_ids: batch.slice(0, 5),
    });
  }

  let deleted = 0;
  const failed: { id: string; error: string }[] = [];
  for (const id of batch) {
    try {
      // rows cascade with the user; delete them explicitly anyway
      await admin.from('collections').delete().eq('user_id', id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      deleted++;
    } catch (e) {
      failed.push({ id, error: String(e).slice(0, 200) });
    }
  }

  return json({
    mode,
    retention_days: retentionDays,
    anonymous_stale_total: stale.length,
    processed: batch.length,
    deleted,
    failed_count: failed.length,
    failed: failed.slice(0, 20),
  });
});
