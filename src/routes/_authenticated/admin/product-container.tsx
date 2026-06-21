import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addProductImportToStore,
  adminListProductImports,
  deleteProductImport,
  importProductToContainer,
  updateProductImport,
} from "@/lib/admin.functions";
import { listCategories } from "@/lib/shop.functions";
import { formatNaira } from "@/lib/format";
import { ExternalLink, PackagePlus, Trash2, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/product-container")({
  component: ProductContainer,
});

type Draft = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_urls: string[];
  video_urls: string[];
  detected_price: number | null;
  detected_currency: string | null;
  exchange_rate_naira: number | null;
  product_cost_naira: number | null;
  selling_price_naira: number;
  shipping_fee_naira: number;
  tax_percentage: number;
  category_id: string | null;
  stock: number;
  is_trending: boolean;
  import_notes: string | null;
  source_url: string;
  status: string;
  product_id: string | null;
  categories?: { name?: string | null } | null;
};

function ProductContainer() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListProductImports);
  const importFn = useServerFn(importProductToContainer);
  const updateFn = useServerFn(updateProductImport);
  const deleteFn = useServerFn(deleteProductImport);
  const publishFn = useServerFn(addProductImportToStore);

  const { data: drafts } = useQuery({ queryKey: ["admin", "product-imports"], queryFn: () => listFn() });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const [url, setUrl] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1600");
  const [editing, setEditing] = useState<Record<string, Draft>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "product-imports"] });

  const importDraft = useMutation({
    mutationFn: () => importFn({ data: { url, exchange_rate_naira: Number(exchangeRate) || 0 } }),
    onSuccess: () => {
      setUrl("");
      refresh();
    },
  });

  const saveDraft = useMutation({
    mutationFn: (draft: Draft) => updateFn({ data: normalizeDraft(draft) }),
    onSuccess: refresh,
  });

  const deleteDraft = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: refresh,
  });

  const publishDraft = useMutation({
    mutationFn: (id: string) => publishFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  function current(draft: Draft) {
    return editing[draft.id] ?? draft;
  }

  function updateLocal(id: string, patch: Partial<Draft>) {
    const original = (drafts as Draft[] | undefined)?.find((draft) => draft.id === id);
    if (!original) return;
    setEditing((state) => ({ ...state, [id]: { ...current(original), ...patch } }));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
          <Wand2 className="h-5 w-5 text-neon" /> Product container
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Paste a supplier link from AliExpress, Amazon, Temu, Jumia, or another product page. Imported items stay here
          as editable drafts and are not visible in the store until you click Add to store.
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.aliexpress.com/item/..."
            className="min-w-0 rounded-md border border-input bg-input px-3 py-2 text-sm"
          />
          <input
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="₦ exchange rate"
            className="rounded-md border border-input bg-input px-3 py-2 text-sm"
          />
          <button
            disabled={!url || importDraft.isPending}
            onClick={() => importDraft.mutate()}
            className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {importDraft.isPending ? "Importing…" : "Import to container"}
          </button>
        </div>
        {importDraft.error && <div className="mt-2 text-sm text-destructive">{(importDraft.error as Error).message}</div>}
      </section>

      <div className="grid gap-4">
        {((drafts as Draft[] | undefined) ?? []).map((draft) => {
          const item = current(draft);
          const estimatedTotal = Math.round(
            item.selling_price_naira + item.shipping_fee_naira + (item.selling_price_naira * item.tax_percentage) / 100,
          );
          return (
            <article key={draft.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                <div>
                  <div className="aspect-square overflow-hidden rounded-lg bg-surface">
                    {item.image_urls?.[0] ? (
                      <img src={item.image_urls[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.image_urls.slice(0, 4).map((image) => (
                      <img key={image} src={image} alt="" className="h-9 w-9 rounded object-cover" />
                    ))}
                  </div>
                  {item.video_urls.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">{item.video_urls.length} video link(s) imported</div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">{item.status}</div>
                      <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-neon underline">
                        Supplier page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => saveDraft.mutate(item)}
                        disabled={saveDraft.isPending || item.status === "published"}
                        className="rounded-md border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        Save draft
                      </button>
                      <button
                        onClick={() => publishDraft.mutate(item.id)}
                        disabled={publishDraft.isPending || item.status === "published" || item.selling_price_naira <= 0}
                        className="inline-flex items-center gap-1 rounded-md bg-neon px-3 py-2 text-xs font-bold text-neon-foreground disabled:opacity-50"
                      >
                        <PackagePlus className="h-3 w-3" /> Add to store
                      </button>
                      <button
                        onClick={() => confirm(`Delete ${item.title}?`) && deleteDraft.mutate(item.id)}
                        className="rounded-md border border-border px-3 py-2 text-xs text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Title" value={item.title} onChange={(title) => updateLocal(item.id, { title })} />
                    <Field label="Slug" value={item.slug} onChange={(slug) => updateLocal(item.id, { slug })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
                    <textarea
                      value={item.description ?? ""}
                      onChange={(e) => updateLocal(item.id, { description: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <NumberField label="Product cost (₦)" value={item.product_cost_naira ?? 0} onChange={(product_cost_naira) => updateLocal(item.id, { product_cost_naira })} />
                    <NumberField label="Selling price (₦)" value={item.selling_price_naira} onChange={(selling_price_naira) => updateLocal(item.id, { selling_price_naira })} />
                    <NumberField label="Shipping fee (₦)" value={item.shipping_fee_naira} onChange={(shipping_fee_naira) => updateLocal(item.id, { shipping_fee_naira })} />
                    <NumberField label="Tax %" value={item.tax_percentage} onChange={(tax_percentage) => updateLocal(item.id, { tax_percentage })} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <NumberField label="Stock" value={item.stock} onChange={(stock) => updateLocal(item.id, { stock })} />
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                      <select
                        value={item.category_id ?? ""}
                        onChange={(e) => updateLocal(item.id, { category_id: e.target.value || null })}
                        className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
                      >
                        <option value="">— none —</option>
                        {categories?.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <label className="mt-6 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.is_trending}
                        onChange={(e) => updateLocal(item.id, { is_trending: e.target.checked })}
                      />
                      Trending
                    </label>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3 text-sm">
                    <div className="font-semibold">Pricing preview</div>
                    <div className="text-muted-foreground">
                      Detected supplier price: {item.detected_currency ?? "—"} {item.detected_price ?? "—"} · Store charge estimate: {formatNaira(estimatedTotal)}
                    </div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <UrlListField
                      label="Image URLs"
                      value={item.image_urls}
                      onChange={(image_urls) => updateLocal(item.id, { image_urls })}
                    />
                    <UrlListField
                      label="Video URLs"
                      value={item.video_urls}
                      onChange={(video_urls) => updateLocal(item.id, { video_urls })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Notes</label>
                    <textarea
                      value={item.import_notes ?? ""}
                      onChange={(e) => updateLocal(item.id, { import_notes: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {((drafts as Draft[] | undefined) ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No imported products yet. Paste a supplier product link above to create your first container draft.
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeDraft(draft: Draft) {
  return {
    id: draft.id,
    title: draft.title,
    slug: draft.slug,
    description: draft.description,
    image_urls: draft.image_urls ?? [],
    video_urls: draft.video_urls ?? [],
    selling_price_naira: Number(draft.selling_price_naira) || 0,
    shipping_fee_naira: Number(draft.shipping_fee_naira) || 0,
    tax_percentage: Number(draft.tax_percentage) || 0,
    product_cost_naira: draft.product_cost_naira === null ? null : Number(draft.product_cost_naira) || 0,
    category_id: draft.category_id ?? null,
    stock: Number(draft.stock) || 0,
    is_trending: Boolean(draft.is_trending),
    import_notes: draft.import_notes ?? null,
  };
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
      />
    </div>
  );
}

function UrlListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      <textarea
        value={(value ?? []).join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
        rows={3}
        className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
        placeholder="One URL per line"
      />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      <input
        type="number"
        value={String(value ?? 0)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
      />
    </div>
  );
}
