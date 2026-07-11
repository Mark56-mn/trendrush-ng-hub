import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSettings } from "@/lib/shop.functions";
import { importProductsFromRapidAPI } from "@/lib/admin.functions";
import { AlertCircle, CheckCircle2, Loader } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: AdminImport,
});

function AdminImport() {
  const qc = useQueryClient();
  const getSettingsFn = useServerFn(getSettings);
  const importFn = useServerFn(importProductsFromRapidAPI);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettingsFn() });
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  const search = useMutation({
    mutationFn: async () => {
      if (!settings?.rapidapi_key || !settings?.rapidapi_host) {
        throw new Error("Rapid API credentials not configured in settings");
      }
      if (!query.trim()) throw new Error("Please enter a search query");

      const response = await fetch(
        `https://${settings.rapidapi_host}/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            "X-RapidAPI-Key": settings.rapidapi_key,
            "X-RapidAPI-Host": settings.rapidapi_host,
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data.results || []);
      setError("");
    },
    onError: (err) => setError((err as Error).message),
  });

  const importProducts = useMutation({
    mutationFn: async () => {
      const selected = results.filter((_, i) => selectedProducts.has(i));
      if (!selected.length) throw new Error("Please select products to import");
      
      const importedIds = await Promise.all(
        selected.map((product) =>
          importFn({
            data: {
              title: product.title || product.name,
              description: product.description,
              price_naira: Math.ceil((product.price || 0) * 500),
              image_urls: [product.image || product.thumbnail].filter(Boolean),
              category_id: null,
              is_active: true,
              stock: 100,
              slug: (product.title || product.name || "product")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 200),
            },
          })
        )
      );
      
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setSelectedProducts(new Set());
      setQuery("");
      setResults([]);
      setError("");
      return importedIds;
    },
    onError: (err) => setError((err as Error).message),
  });

  const hasCredentials = settings?.rapidapi_key && settings?.rapidapi_host;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-4">Import Products from Rapid API</h2>
        
        {!hasCredentials && (
          <div className="mb-4 flex gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Rapid API credentials not configured</p>
              <p>Go to Settings and add your Rapid API key and host to use this feature.</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !search.isPending) {
                  search.mutate();
                }
              }}
              placeholder="Search products (e.g., 'wireless headphones')"
              disabled={!hasCredentials || search.isPending}
              className="flex-1 rounded-md border border-input bg-input px-3 py-2 text-sm disabled:opacity-50"
            />
            <button
              onClick={() => search.mutate()}
              disabled={!hasCredentials || search.isPending || !query.trim()}
              className="rounded-md bg-neon px-4 py-2 font-semibold text-neon-foreground disabled:opacity-50 transition-opacity"
            >
              {search.isPending ? <Loader className="h-4 w-4 animate-spin" /> : "Search"}
            </button>
          </div>

          {error && (
            <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Results ({results.length})
                  {selectedProducts.size > 0 && ` - ${selectedProducts.size} selected`}
                </h3>
                {selectedProducts.size > 0 && (
                  <button
                    onClick={() => setSelectedProducts(new Set())}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Deselect all
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((product, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      const next = new Set(selectedProducts);
                      next.has(idx) ? next.delete(idx) : next.add(idx);
                      setSelectedProducts(next);
                    }}
                    className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      selectedProducts.has(idx)
                        ? "border-neon bg-neon/5"
                        : "border-border hover:border-neon/50"
                    }`}
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt=""
                        className="mb-2 h-32 w-full rounded-md object-cover"
                      />
                    )}
                    <p className="font-semibold text-sm line-clamp-2">
                      {product.title || product.name}
                    </p>
                    {product.price && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ${product.price.toFixed(2)}
                      </p>
                    )}
                    {selectedProducts.has(idx) && (
                      <CheckCircle2 className="h-5 w-5 text-neon absolute right-3 top-3" />
                    )}
                  </div>
                ))}
              </div>

              {selectedProducts.size > 0 && (
                <button
                  onClick={() => importProducts.mutate()}
                  disabled={importProducts.isPending}
                  className="w-full rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {importProducts.isPending ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${selectedProducts.size} Product${selectedProducts.size !== 1 ? "s" : ""}`
                  )}
                </button>
              )}
            </div>
          )}

          {search.isSuccess && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              No products found. Try a different search query.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
