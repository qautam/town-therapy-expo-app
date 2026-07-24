import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type ExpoPushMessage = {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: Record<string, string>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatEventWhen(startsAt: string) {
  const date = new Date(startsAt);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${date.getDate()} ${months[date.getMonth()]} at ${hour12}:${minutes} ${ampm}`;
}

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

    const { event_id: eventId } = await request.json();
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'event_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, starts_at, location_label')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw eventError ?? new Error('Event not found');
    }

    const { data: subscribers, error: subscriberError } = await supabase
      .from('newsletter_subscribers')
      .select('guest_id')
      .eq('event_updates', true);

    if (subscriberError) throw subscriberError;

    const eligibleGuestIds = (subscribers ?? []).map((row) => row.guest_id).filter(Boolean);
    if (!eligibleGuestIds.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_subscribers' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('event_updates', true)
      .in('guest_id', eligibleGuestIds);

    if (tokenError) throw tokenError;

    const uniqueTokens = [...new Set((tokens ?? []).map((row) => row.expo_push_token))];
    const body = `${event.title} · ${formatEventWhen(event.starts_at)} · ${event.location_label}`;

    const messages: ExpoPushMessage[] = uniqueTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: 'New Town Therapy event',
      body,
      data: {
        type: 'new_event',
        eventId: event.id,
        screen: 'events',
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
