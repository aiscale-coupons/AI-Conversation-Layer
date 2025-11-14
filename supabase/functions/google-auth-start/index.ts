import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { corsHeaders } from "../_shared/cors.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");

// The main logic of the function
async function handler(req: Request): Promise<Response> {
  // This is needed to invoke the function as a user
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return new Response(
      JSON.stringify({ error: "Google OAuth credentials are not configured." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = req.headers.get('Authorization')!;
  const jwt = authHeader.replace('Bearer ', '');
  const state = jwt; // Use user's JWT as state to prevent CSRF

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Serve the handler with a CORS wrapper
serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Handle the actual request
    const response = await handler(req);
    // Add CORS headers to the response
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  } catch (e) {
    // Add CORS headers to the error response
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
