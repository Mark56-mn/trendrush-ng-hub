import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListProducts, upsertProduct, deleteProduct } from "@/lib/admin.functions";
import { listCategories } from "@/lib/shop.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format";
import { Pencil, Trash2, Plus, X, Upload, GripVertical, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type Editing = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  price_naira: number;
  category_id: string | null;
  image_urls: string[];
  is_trending: boolean;
  is_active: boolean;
  stock: number;
};

const empty: Editing = {
  title: "",
  slug: "",
  description: "",
  price_naira: 0,
  category_id: null,
  image_urls: [],
  is_trending: false,
  is_active: true,
  stock: 0,
};

function AdminProducts() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListProducts);
  const upsertFn = useServerFn(upsertProduct);
  const delFn = useServerFn(deleteProduct);

  const { data: products } = useQuery({ queryKey: ["admin", "products"], queryFn: () => listFn() });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });

  const [editing, setEditing] = useState<Editing | null>(null);
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
    mutationFn: (data: Editing) => upsertFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });

  async function handleUpload(files: FileList | null) {
    if (!files || !editing) return;
    setUploading(true);
    const paths: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (!error) paths.push(path);
    }
    setEditing({ ...editing, image_urls: [...editing.image_urls, ...paths] });
    setUploading(false);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setEditing({ ...empty })}
          className="flex items-center gap-2 rounded-md bg-neon px-3 py-2 text-sm font-bold text-neon-foreground"
        >
          <Plus className="h-4 w-4" /> New product
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Price</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Stock</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 overflow-hidden rounded bg-surface">
                      {p.signed_image_urls?.[0] && (
                        <img src={p.signed_image_urls[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">{formatNaira(p.price_naira)}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                <td className="px-3 py-2">{p.stock}</td>
                <td className="px-3 py-2">
                  {p.is_active ? (
                    <span className="text-neon">Live</span>
                  ) : (
                    <span className="text-muted-foreground">Hidden</span>
                  )}
                  {p.is_trending && <span className="ml-2 text-orange">Trending</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() =>
                      setEditing({
                        id: p.id,
                        title: p.title,
                        slug: p.slug,
                        description: p.description ?? "",
                        price_naira: p.price_naira,
                        category_id: p.category_id,
                        image_urls: p.image_urls ?? [],
                        is_trending: p.is_trending,
                        is_active: p.is_active,
                        stock: p.stock,
                      })
                    }
                    className="rounded p-1 hover:bg-secondary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => confirm(`Delete ${p.title}?`) && del.mutate(p.id)}
                    className="rounded p-1 text-destructive hover:bg-secondary"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  No products yet. Create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">
                {editing.id ? "Edit product" : "New product"}
              </h3>
              <button onClick={() => setEditing(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Input label="Title" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
              <Input
                label="Slug (lowercase, hyphens)"
                value={editing.slug}
                onChange={(v) => setEditing({ ...editing, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              />
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Price (₦)"
                  type="number"
                  value={String(editing.price_naira)}
                  onChange={(v) => setEditing({ ...editing, price_naira: Number(v) || 0 })}
                />
                <Input
                  label="Stock"
                  type="number"
                  value={String(editing.stock)}
                  onChange={(v) => setEditing({ ...editing, stock: Number(v) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                <select
                  value={editing.category_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}
                  className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
                >
                  <option value="">— none —</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_trending}
                    onChange={(e) => setEditing({ ...editing, is_trending: e.target.checked })}
                  />
                  Trending
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Gallery ({editing.image_urls.length})
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Drag to reorder · first image is the cover
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {editing.image_urls.map((path, i) => (
                    <div
                      key={`${path}-${i}`}
                      draggable
                      onDragStart={(e) => {
                        setDragIdx(i);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (overIdx !== i) setOverIdx(i);
                      }}
                      onDragLeave={() => setOverIdx((o) => (o === i ? null : o))}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIdx !== null) reorderImages(dragIdx, i);
                        setDragIdx(null);
                        setOverIdx(null);
                      }}
                      onDragEnd={() => {
                        setDragIdx(null);
                        setOverIdx(null);
                      }}
                      className={`group relative aspect-square cursor-move overflow-hidden rounded-md border bg-surface transition ${
                        overIdx === i ? "border-neon ring-2 ring-neon" : "border-border"
                      } ${dragIdx === i ? "opacity-40" : ""}`}
                    >
                      <ImageThumb path={path} />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-neon/90 px-1 py-0.5 text-[9px] font-bold text-neon-foreground">
                          <Star className="h-2.5 w-2.5" /> COVER
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1 py-0.5 opacity-0 transition group-hover:opacity-100">
                        <GripVertical className="h-3 w-3 text-white/80" />
                        <div className="flex gap-0.5">
                          {i > 0 && (
                            <button
                              type="button"
                              onClick={() => reorderImages(i, i - 1)}
                              className="rounded bg-white/20 px-1 text-[10px] text-white hover:bg-white/40"
                              aria-label="Move left"
                            >
                              ◀
                            </button>
                          )}
                          {i < editing.image_urls.length - 1 && (
                            <button
                              type="button"
                              onClick={() => reorderImages(i, i + 1)}
                              className="rounded bg-white/20 px-1 text-[10px] text-white hover:bg-white/40"
                              aria-label="Move right"
                            >
                              ▶
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            image_urls: editing.image_urls.filter((_, idx) => idx !== i),
                          })
                        }
                        className="absolute right-0.5 top-0.5 rounded bg-destructive/90 p-0.5 hover:bg-destructive"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-neon hover:text-neon">
                    {uploading ? (
                      <span className="text-xs">Uploading…</span>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="text-[10px]">Add</span>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        handleUpload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <button
                disabled={save.isPending}
                onClick={() => save.mutate(editing)}
                className="mt-2 w-full rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground disabled:opacity-50"
              >
                {save.isPending ? "Saving…" : "Save product"}
              </button>
              {save.error && (
                <div className="text-sm text-destructive">{(save.error as Error).message}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
      />
    </div>
  );
}

function ImageThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    if (!path) return;
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    supabase.storage
      .from("product-images")
      .createSignedUrl(path, 3600)
      .then(({ data }) => data?.signedUrl && setUrl(data.signedUrl));
  }, [path]);
  return url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null;
}

