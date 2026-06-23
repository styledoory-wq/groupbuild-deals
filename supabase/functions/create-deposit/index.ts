import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDepositBody {
  deal_id?: string;
  interest_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "יש להתחבר כדי להצטרף" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized", message: "המשתמש אינו מחובר" }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as CreateDepositBody;
    if (!body?.deal_id) {
      return json({ error: "invalid_request", message: "מזהה עסקה חסר" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select("id,title,deposit_required,deposit_amount,status,is_deleted,supplier_id")
      .eq("id", body.deal_id)
      .eq("is_deleted", false)
      .maybeSingle();
    if (dealErr) throw dealErr;
    if (!deal) return json({ error: "deal_not_found", message: "העסקה לא נמצאה" }, 404);
    if (deal.status !== "active") return json({ error: "deal_not_active", message: "העסקה אינה פעילה" }, 409);
    if (!deal.deposit_required || Number(deal.deposit_amount ?? 0) <= 0) {
      return json({ error: "deposit_not_required", message: "לעסקה זו לא נדרש פיקדון" }, 409);
    }

    const depositAmount = Number(deal.deposit_amount);
    const JOINING_FEE = 15;
    const amount = depositAmount + JOINING_FEE;

    const { data: supplier } = await admin
      .from("suppliers")
      .select("business_name,bit_phone,bank_account_holder,bank_name,bank_branch,bank_account_number,payment_instructions_note")
      .eq("id", deal.supplier_id)
      .maybeSingle();

    const { data: existingDeposit } = await admin
      .from("deposits")
      .select("id,status")
      .eq("user_id", userId)
      .eq("deal_id", body.deal_id)
      .eq("is_deleted", false)
      .in("status", ["pending", "awaiting_confirmation", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDeposit?.status === "paid") {
      return json({ error: "already_paid", message: "כבר הצטרפת לעסקה זו", deposit_id: existingDeposit.id }, 409);
    }

    let depositId = existingDeposit?.id ?? null;
    if (!depositId) {
      const { data: inserted, error: insErr } = await admin
        .from("deposits")
        .insert({
          user_id: userId,
          deal_id: body.deal_id,
          supplier_id: deal.supplier_id,
          amount,
          gross_deposit_amount: depositAmount,
          net_deposit_amount: depositAmount,
          supplier_deduction_amount: depositAmount,
          supplier_deduction_basis: "gross",
          payment_fee_absorber: "groupbuild",
          payment_processing_fee_status: "unknown",
          currency: "ILS",
          payment_provider: "manual",
          status: "pending",
          metadata: {
            source: "create_deposit_function_manual",
            deal_title: deal.title ?? null,
            interest_id: body.interest_id ?? null,
            joining_fee: JOINING_FEE,
            deposit_only_amount: depositAmount,
            total_charged_amount: amount,
          },
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      depositId = inserted.id;
    }

    return json({
      ok: true,
      deposit_id: depositId,
      amount,
      supplier_payment_info: supplier
        ? {
            business_name: supplier.business_name,
            bit_phone: supplier.bit_phone,
            bank_account_holder: supplier.bank_account_holder,
            bank_name: supplier.bank_name,
            bank_branch: supplier.bank_branch,
            bank_account_number: supplier.bank_account_number,
            note: supplier.payment_instructions_note,
          }
        : null,
    });
  } catch (e) {
    console.error("[create-deposit] error", e);
    return json({ error: "internal_error", message: "אירעה שגיאה לא צפויה" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
