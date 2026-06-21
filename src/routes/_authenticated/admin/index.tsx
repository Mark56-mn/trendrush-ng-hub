import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminDashboardStats } from "@/lib/admin.functions";
import { formatNaira } from "@/lib/format";
import {
  Package,
  ShoppingBag,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fn = useServerFn(adminDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fn(),
  });

  if (isLoading || !data) {
    return <div className="py-16 text-center text-muted-foreground">Loading dashboard…</div>;
  }

  const { products, orders } = data;

  // Build sparkline from last 30d revenue, bucketed per day
  const buckets = new Array(30).fill(0);
  const now = Date.now();
  for (const r of orders.paid30dSeries) {
    const day = Math.floor((now - new Date(r.paid_at).getTime()) / 86_400_000);
    if (day >= 0 && day < 30) buckets[29 - day] += r.base_amount ?? 0;
  }
  const max = Math.max(1, ...buckets);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={formatNaira(orders.revenueToday)}
          icon={TrendingUp}
          tone="neon"
        />
        <StatCard
          label="Pending orders"
          value={orders.pending.toString()}
          icon={Clock}
          tone="orange"
          to="/admin/orders"
        />
        <StatCard
          label="Paid orders"
          value={orders.paidTotal.toString()}
          icon={CheckCircle2}
          tone="neon"
        />
        <StatCard
          label="Live products"
          value={`${products.active} / ${products.total}`}
          icon={Package}
          tone="default"
          to="/admin/products"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Revenue · last 30 days
              </div>
              <div className="font-display text-2xl font-black text-neon">
                {formatNaira(orders.revenue30d)}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              All-time
              <div className="text-sm font-semibold text-foreground">
                {formatNaira(orders.revenueAllTime)}
              </div>
            </div>
          </div>
          <div className="flex h-32 items-end gap-1">
            {buckets.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-neon/70 transition-all hover:bg-neon"
                style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? "4px" : "2px" }}
                title={formatNaira(v)}
              />
            ))}
          </div>
        </div>

        {/* Low stock */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wide">Low stock</h3>
          </div>
          {products.lowStock.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              All stock levels healthy.
            </div>
          ) : (
            <ul className="space-y-2">
              {products.lowStock.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.title}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      p.stock === 0
                        ? "bg-destructive/20 text-destructive"
                        : "bg-orange/20 text-orange"
                    }`}
                  >
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/products"
            className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-neon"
          >
            Manage products <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-neon" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wide">
              Recent orders
            </h3>
          </div>
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 text-xs font-semibold text-neon"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Sender</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              )}
              {orders.recent.map((o: any) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{o.products?.title ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{o.sender_name ?? "—"}</td>
                  <td className="px-3 py-2">{formatNaira(o.base_amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        o.status === "paid"
                          ? "bg-neon/20 text-neon"
                          : o.status === "pending"
                            ? "bg-orange/20 text-orange"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: string;
  icon: any;
  tone: "neon" | "orange" | "default";
  to?: string;
}) {
  const toneCls =
    tone === "neon" ? "text-neon" : tone === "orange" ? "text-orange" : "text-foreground";
  const inner = (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-neon/50">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <div className={`mt-2 font-display text-2xl font-black ${toneCls}`}>{value}</div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
