import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has a pro_gift role - if so, skip Stripe check
    const { data: existingRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (existingRole?.role === 'pro_gift') {
      logStep("User has pro_gift role, skipping Stripe check");
      return new Response(JSON.stringify({ 
        subscribed: true,
        role: 'pro_gift',
        is_gifted: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user is free tier");
      
      // Update user role to free if not already
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseClient
        .from('user_roles')
        .insert({ user_id: user.id, role: 'free' });
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        role: 'free'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      logStep("Active subscription found", { subscriptionId: subscription.id, productId, endDate: subscriptionEnd });
      
      // Update user role to pro
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseClient
        .from('user_roles')
        .insert({ user_id: user.id, role: 'pro' });
      
      logStep("Updated user role to pro");
    } else {
      logStep("No active subscription found, downgrading to free");
      
      // Update user role to free
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseClient
        .from('user_roles')
        .insert({ user_id: user.id, role: 'free' });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      role: hasActiveSub ? 'pro' : 'free'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
