import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { isAdmin } from "@/lib/admin.functions";
import { LayoutDashboard, Package, Receipt, Settings as Cog, Download, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const fn = useServerFn(isAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["is-admin"], queryFn: () => fn() });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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
    { to: "/admin/import", label: "Import", icon: Download },
    { to: "/admin/orders", label: "Orders", icon: Receipt },
    { to: "/admin/settings", label: "Settings", icon: Cog },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-xl font-black text-orange sm:text-2xl">Admin</h1>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="rounded-md border border-border p-2 hover:bg-card lg:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileNavOpen && (
          <nav className="mb-6 flex flex-col gap-1 rounded-lg border border-border bg-card p-1">
            {tabs.map((t) => {
              const active = t.exact
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to as "/admin"}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-neon text-neon-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
        <div className="hidden mb-6 flex-row gap-1 rounded-lg border border-border bg-card p-1 lg:flex lg:overflow-x-auto">
          {tabs.map((t) => {
            const active = t.exact
              ? pathname === "/admin" || pathname === "/admin/"
              : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to as "/admin"}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-neon text-neon-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
