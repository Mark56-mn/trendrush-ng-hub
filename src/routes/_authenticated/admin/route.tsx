import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { isAdmin } from "@/lib/admin.functions";
import { LayoutDashboard, Package, Receipt, Settings as Cog, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const fn = useServerFn(isAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["is-admin"], queryFn: () => fn() });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Checking access…</div>;
  if (!data)
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only admins can access this area.</p>
        <Link to="/" className="mt-4 inline-block text-neon underline">
          Back home
        </Link>
      </div>
    );

  const tabs: { to: string; label: string; icon: typeof Package; exact?: boolean }[] = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/wap-container", label: "WAP Container", icon: Download },
    { to: "/admin/orders", label: "Orders", icon: Receipt },
    { to: "/admin/settings", label: "Settings", icon: Cog },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-black text-orange">Admin</h1>
      </div>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to as "/admin"}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold ${
                active ? "bg-neon text-neon-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
