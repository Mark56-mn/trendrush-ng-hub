import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyOrders } from "@/lib/orders.functions";
import { formatNaira } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — TrendRush NG" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyOrders,
});

function MyOrders() {
  const fn = useServerFn(getMyOrders);
  const { data, isLoading } = useQuery({ queryKey: ["my-orders"], queryFn: () => fn() });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">My orders</h1>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="text-sm text-muted-foreground hover:text-destructive"
        >
          Sign out
        </button>
      </div>

      {isLoading && <div className="mt-6 text-muted-foreground">Loading...</div>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          You haven't placed any orders yet.{" "}
          <Link to="/" className="text-neon underline">
            Start shopping
          </Link>
        </div>
      )}
      <div className="mt-6 space-y-3">
        {data?.map((o: any) => (
          <Link
            key={o.id}
            to="/checkout/$orderId"
            params={{ orderId: o.id }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-neon/60"
          >
            <div className="h-16 w-16 overflow-hidden rounded-md bg-surface">
              {o.product_image && (
                <img src={o.product_image} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{o.products?.title ?? "Product"}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString()} · {formatNaira(o.unique_amount)}
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                o.status === "paid"
                  ? "bg-neon/20 text-neon"
                  : o.status === "cancelled"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-orange/20 text-orange"
              }`}
            >
              {o.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
