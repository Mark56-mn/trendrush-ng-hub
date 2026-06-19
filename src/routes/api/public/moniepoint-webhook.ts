import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/moniepoint-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MONIEPOINT_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 500 });

        const rawBody = await request.text();
        const signature =
          request.headers.get("x-moniepoint-signature") ??
          request.headers.get("x-webhook-signature") ??
          request.headers.get("signature") ??
          "";

        const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature, "utf8");
        const expBuf = Buffer.from(expected, "utf8");
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Best-effort field extraction: Moniepoint sends amount in naira or kobo.
        const rawAmount =
          payload.amount ??
          payload.data?.amount ??
          payload.transaction?.amount ??
          payload.transactionAmount;
        const reference =
          payload.reference ??
          payload.data?.reference ??
          payload.transactionReference ??
          payload.transaction?.reference ??
          null;
        if (rawAmount == null) return new Response("Missing amount", { status: 400 });

        const amountNum = Number(rawAmount);
        if (!Number.isFinite(amountNum)) return new Response("Bad amount", { status: 400 });
        // Treat values above 1,000,000 as kobo to be safe.
        const amountInNaira = amountNum > 1_000_000 ? Math.round(amountNum / 100) : Math.round(amountNum);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Match the most recent pending order with this exact unique amount.
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("status", "pending")
          .eq("unique_amount", amountInNaira)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabaseAdmin.from("payments").insert({
          order_id: order?.id ?? null,
          amount: amountInNaira,
          reference,
          raw_payload: payload,
        });

        if (order) {
          await supabaseAdmin
            .from("orders")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", order.id);
          return Response.json({ ok: true, matched: true, orderId: order.id });
        }
        return Response.json({ ok: true, matched: false });
      },
    },
  },
});
