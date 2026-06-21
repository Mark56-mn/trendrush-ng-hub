import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { isAdmin } from "@/lib/admin.functions";
import { Archive, LayoutDashboard, Package, Receipt, Settings as Cog } from "lucide-react";

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
    { to: "/admin/product-container", label: "Container", icon: Archive },
    { to: "/admin/orders", label: "Orders", icon: Receipt },
    { to: "/admin/settings", label: "Settings", icon: Cog },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-4 sm:py-6">
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h1 className="font-display text-2xl font-black text-orange">Admin</h1>
      </div>
      <nav className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-2xl backdrop-blur sm:static sm:inset-auto sm:mb-6 sm:flex sm:overflow-x-auto sm:rounded-lg sm:bg-card sm:shadow-none">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to as "/admin"}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-[10px] font-semibold sm:min-w-[86px] sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${
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
