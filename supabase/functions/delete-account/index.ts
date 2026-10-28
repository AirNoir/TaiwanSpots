// Deletes the calling user's account (App Store Guideline 5.1.1(v): an app with
// account creation must offer account deletion). The user id always comes from
// the JWT, so a caller can only delete itself. The app also calls this with the
// old anonymous session right after that guest is bound to Apple / Google, so
// no guest account is left behind. Collection rows go with the user
// (on delete cascade, see migrations/20261028000000_collections.sql).
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !data?.user) return json({ error: 'Unauthorized' }, 401);
    const userId = data.user.id;

    // Explicit first, so a missing cascade can never leave rows behind.
    const { error: rowsError } = await admin.from('collections').delete().eq('user_id', userId);
    if (rowsError) throw rowsError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    console.log('Account deleted:', userId, data.user.is_anonymous ? '(anonymous)' : '');
    return json({ success: true });
  } catch (e) {
    console.error('delete-account error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
