import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Smart upsell rules: category-based combo suggestions
const UPSELL_RULES: Record<string, { categories: string[]; message: string }> = {
  Popcorn: {
    categories: ["Beverages"],
    message: "Add a drink to go with your popcorn!",
  },
  Snacks: {
    categories: ["Beverages"],
    message: "Pair your snack with a refreshing drink!",
  },
  Beverages: {
    categories: ["Popcorn", "Snacks"],
    message: "Grab some popcorn or snacks with your drink!",
  },
  Combos: {
    categories: ["Premium"],
    message: "Upgrade your experience with a premium treat!",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { cart_items } = await req.json();

    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], message: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get cart categories
    const cartCategories = [...new Set(cart_items.map((i: any) => i.category))];
    const cartItemIds = cart_items.map((i: any) => i.id);

    // Determine which categories to suggest
    const suggestCategories = new Set<string>();
    let upsellMessage = "";

    for (const cat of cartCategories) {
      const rule = UPSELL_RULES[cat];
      if (rule) {
        rule.categories.forEach((c) => suggestCategories.add(c));
        if (!upsellMessage) upsellMessage = rule.message;
      }
    }

    // Remove categories already in cart
    cartCategories.forEach((c) => suggestCategories.delete(c));

    if (suggestCategories.size === 0) {
      // If all categories covered, suggest combos or premium
      suggestCategories.add("Combos");
      upsellMessage = "Complete your experience with a combo deal!";
    }

    // Fetch available items from suggested categories, excluding items already in cart
    const { data: items, error } = await supabase
      .from("menu_items")
      .select("id, name, price, category, description, image_url")
      .eq("available", true)
      .in("category", Array.from(suggestCategories))
      .limit(3);

    if (error) throw error;

    // Filter out items already in cart
    const suggestions = (items || [])
      .filter((item: any) => !cartItemIds.includes(item.id))
      .slice(0, 3);

    return new Response(
      JSON.stringify({ suggestions, message: upsellMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
