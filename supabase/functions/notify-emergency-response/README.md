# Supabase Edge Function: notify-emergency-response
#
# Notifies the citizen who sent an SOS when a volunteer taps "I'm on my way".
#
# Deploy:
#   supabase functions deploy notify-emergency-response
#
# Required secrets (set in Supabase dashboard or CLI):
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   EXPO_ACCESS_TOKEN (optional but recommended for production push volume)
