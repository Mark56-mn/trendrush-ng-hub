import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { adminListProducts, adminListProductVariants, upsertProductVariant, deleteProductVariant } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Plus, Trash2, Upload, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/product-variants")({
  component: ProductVariantsAdmin,
});

function ProductVariantsAdmin() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/admin/product-variants" });
  const productId = (search as any)?.productId;

  if (!productId) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Product Color Variants</h2>
        <p className="text-muted-foreground">Select a product from the Products page to manage its color variants.</p>
      </div>
    );
  }

  return <VariantsEditor productId={productId} />;
}

function VariantsEditor({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listProductsFn = useServerFn(adminListProducts);
  const listVariantsFn = useServerFn(adminListProductVariants);
  const upsertFn = useServerFn(upsertProductVariant);
  const delFn = useServerFn(deleteProductVariant);

  const { data: products } = useQuery({ queryKey: ["admin", "products"], queryFn: () => listProductsFn() });
  const { data: variants } = useQuery({
    queryKey: ["admin", "variants", productId],
    queryFn: () => listVariantsFn({ productId }),
  });

  const product = products?.find((p: any) => p.id === productId);
  const [editing, setEditing] = useState<{ id?: string; color_name: string; image_urls: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  function reorderImages(from: number, to: number) {
    if (!editing || from === to) return;
    const next = [...editing.image_urls];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setEditing({ ...editing, image_urls: next });
  }

  const save = useMutation({
    mutationFn: (data: any) =>
      upsertFn({
        data: { ...data, product_id: productId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "variants", productId] });
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "variants", productId] }),
  });

  async function handleUpload(files: FileList | null) {
    if (!files || !editing) return;
    setUploading(true);
    const paths: string[] = [];
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `variant-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file, {
          contentType: file.type,
        });
        if (!error) paths.push(path);
      }
      setEditing((e) => ({ ...e!, image_urls: [...e!.image_urls, ...paths] }));
    } finally {
      setUploading(false);
    }
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate({ to: "/admin/products" })}
          className="rounded-md border border-border p-2 hover:bg-card transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-display text-2xl font-bold">{product.title}</h2>
          <p className="text-sm text-muted-foreground">Manage color variants and images</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {variants?.length ? (
            <div className="space-y-3">
              <h3 className="font-semibold">Color Variants</h3>
              {variants.map((variant: any) => (
                <div
                  key={variant.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-card transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{variant.color_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {variant.signed_image_urls?.length || 0} images
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(variant)}
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-card transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => del.mutate(variant.id)}
                    className="rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6">No color variants yet.</p>
          )}

          <button
            onClick={() => setEditing({ color_name: "", image_urls: [] })}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm font-semibold hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add color variant
          </button>
        </div>

        {editing && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <h3 className="font-semibold">
              {editing.id ? "Edit variant" : "New variant"}
            </h3>
            
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Color name</label>
              <input
                value={editing.color_name}
                onChange={(e) => setEditing({ ...editing, color_name: e.target.value })}
                placeholder="e.g., Red, Blue, Black"
                className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                Images ({editing.image_urls.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {editing.image_urls.map((url, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverIdx(idx);
                    }}
                    onDragLeave={() => setOverIdx(null)}
                    onDrop={() => {
                      if (dragIdx !== null && dragIdx !== idx) {
                        reorderImages(dragIdx, idx);
                      }
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    className={`flex items-center gap-2 rounded-md border p-2 cursor-move transition-colors ${
                      overIdx === idx ? "bg-neon/10 border-neon" : "border-border"
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <img src={url} alt="" className="h-12 w-12 rounded object-cover" />
                    <p className="text-xs text-muted-foreground flex-1 truncate">{url.split("/").pop()}</p>
                    <button
                      onClick={() =>
                        setEditing({
                          ...editing,
                          image_urls: editing.image_urls.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-destructive hover:bg-destructive/10 p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 hover:bg-card transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-xs font-semibold">Upload images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
              {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing.color_name.trim()}
                className="flex-1 rounded-md bg-neon px-3 py-2 text-sm font-semibold text-neon-foreground disabled:opacity-50 transition-opacity"
              >
                {save.isPending ? "Saving…" : "Save variant"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-card transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
