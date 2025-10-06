import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateEmailRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: ValidateEmailRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid email format" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const domain = email.split("@")[1].toLowerCase();

    // Check if domain has valid format
    if (!domain || !domain.includes(".")) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Invalid email domain" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Perform DNS MX record lookup to validate domain
    try {
      const dnsQuery = await fetch(
        `https://dns.google/resolve?name=${domain}&type=MX`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      );

      const dnsResult = await dnsQuery.json();

      // Check if domain has MX records (mail servers)
      if (!dnsResult.Answer || dnsResult.Answer.length === 0) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "This email domain does not appear to accept emails" 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          valid: true,
          domain: domain
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (dnsError) {
      console.error("DNS lookup error:", dnsError);
      // If DNS check fails, allow the email through (fail open for better UX)
      return new Response(
        JSON.stringify({ 
          valid: true,
          domain: domain,
          note: "Domain validation could not be performed"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Validation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
