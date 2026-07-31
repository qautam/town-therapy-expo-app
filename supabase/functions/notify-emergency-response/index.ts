import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type ExpoPushMessage = {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: Record<string, string>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (!messages.length) return { sent: 0 };

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };

  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: ${text}`);
  }

  return response.json();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const { alert_id: alertId } = await request.json();
    if (!alertId) {
      return new Response(JSON.stringify({ error: 'alert_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: alert, error: alertError } = await supabase
      .from('emergency_alerts')
      .select('id, guest_id, responded_by_name, status')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      throw alertError ?? new Error('Emergency alert not found');
    }

    if (alert.status !== 'responding') {
      return new Response(JSON.stringify({ sent: 0, reason: 'not_responding' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('guest_id', alert.guest_id);

    if (tokenError) throw tokenError;

    const uniqueTokens = [...new Set((tokens ?? []).map((row) => row.expo_push_token).filter(Boolean))];
    if (!uniqueTokens.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responderName = alert.responded_by_name || 'A volunteer';
    const messages: ExpoPushMessage[] = uniqueTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: 'Help is on the way',
      body: `${responderName} saw your SOS and is heading to you.`,
      channelId: 'emergency',
      priority: 'high',
      data: {
        type: 'emergency_help_on_way',
        alertId: alert.id,
        screen: 'sos',
        alertId: alert.id,
      },
    }));

    const result = await sendExpoPush(messages);

    return new Response(JSON.stringify({ sent: uniqueTokens.length, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
