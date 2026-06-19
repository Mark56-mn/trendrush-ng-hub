import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListOrders, markOrderPaid } from "@/lib/admin.functions";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListOrders);
  const markFn = useServerFn(markOrderPaid);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "orders"], queryFn: () => listFn() });
  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-surface text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Order</th>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Amount</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Created</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}
          {(data ?? []).map((o: any) => (
            <tr key={o.id} className="border-t border-border">
              <td className="px-3 py-2">
                <div className="font-semibold">{o.products?.title ?? "—"}</div>
                <div className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}…</div>
              </td>
              <td className="px-3 py-2 text-xs">
                <div>{o.guest_name ?? (o.user_id ? "Account user" : "—")}</div>
                <div className="text-muted-foreground">{o.guest_phone}</div>
                <div className="text-muted-foreground">{o.guest_email}</div>
              </td>
              <td className="px-3 py-2 font-mono">{formatNaira(o.unique_amount)}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    o.status === "paid"
                      ? "bg-neon/20 text-neon"
                      : o.status === "cancelled"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-orange/20 text-orange"
                  }`}
                >
                  {o.status}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                {o.status === "pending" && (
                  <button
                    onClick={() => mark.mutate(o.id)}
                    className="rounded bg-neon px-2 py-1 text-xs font-bold text-neon-foreground"
                  >
                    Mark paid
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!isLoading && (data ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
