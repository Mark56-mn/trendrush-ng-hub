import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getOrderById } from "@/lib/orders.functions";
import { getSettings } from "@/lib/shop.functions";
import { formatNaira } from "@/lib/format";
import { Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/checkout/$orderId")({
  head: () => ({
    meta: [
      { title: "Checkout — TrendRush NG" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["order", params.orderId],
        queryFn: () => getOrderById({ data: { id: params.orderId } }),
      }),
      context.queryClient.ensureQueryData({ queryKey: ["settings"], queryFn: () => getSettings() }),
    ]);
  },
  component: Checkout,
});

function Checkout() {
  const { orderId } = Route.useParams();
  const router = useRouter();
  const { data: order } = useSuspenseQuery(
    queryOptions({
      queryKey: ["order", orderId],
      queryFn: () => getOrderById({ data: { id: orderId } }),
    }),
  );
  const { data: settings } = useSuspenseQuery(
    queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() }),
  );
  const [copied, setCopied] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Order not found</h1>
        <Link to="/" className="text-neon underline">
          Back home
        </Link>
      </div>
    );
  }

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="text-xs uppercase text-muted-foreground">Order</div>
        <div className="font-mono text-xs">{order.id}</div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
        <div className="mt-1 flex items-center gap-2">
          {order.status === "paid" ? (
            <span className="rounded-full bg-neon/20 px-3 py-1 text-sm font-bold text-neon">
              ✓ Paid — we'll be in touch
            </span>
          ) : (
            <span className="rounded-full bg-orange/20 px-3 py-1 text-sm font-bold text-orange">
              ⏳ Awaiting transfer
            </span>
          )}
        </div>

        {order.status === "pending" && (
          <>
            <div className="mt-5 rounded-lg border border-orange/40 bg-orange/5 p-4">
              <p className="text-sm font-semibold text-orange">
                Transfer the EXACT amount below so we can auto-confirm your payment.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <Field
                label="Amount to send"
                value={formatNaira(order.unique_amount)}
                copyValue={String(order.unique_amount)}
                onCopy={copy}
                copied={copied}
                accent
              />
              <Field
                label="Bank"
                value={settings?.bank_name || "— set in admin —"}
                onCopy={copy}
                copied={copied}
              />
              <Field
                label="Account number"
                value={settings?.account_number || "— set in admin —"}
                onCopy={copy}
                copied={copied}
              />
              <Field
                label="Account name"
                value={settings?.account_name || "— set in admin —"}
                onCopy={copy}
                copied={copied}
              />
            </div>

            <button
              onClick={() => router.invalidate()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground shadow-neon"
            >
              <Loader2 className="h-4 w-4" /> I've paid — check status
            </button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Auto-verified via Moniepoint within seconds of your transfer landing.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  copyValue,
  onCopy,
  copied,
  accent,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy: (l: string, v: string) => void;
  copied: string | null;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`mt-0.5 font-mono text-base ${accent ? "font-black text-neon" : "text-foreground"}`}
        >
          {value}
        </div>
      </div>
      <button
        onClick={() => onCopy(label, copyValue ?? value)}
        className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        {copied === label ? <Check className="h-4 w-4 text-neon" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
