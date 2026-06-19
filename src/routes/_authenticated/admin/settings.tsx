import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/shop.functions";
import { updateSettings } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type Form = {
  bank_name: string;
  account_number: string;
  account_name: string;
  whatsapp_link: string;
  hero_slogan: string;
  logo_url: string;
  banner_url: string;
};

function AdminSettings() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSettings);
  const saveFn = useServerFn(updateSettings);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => getFn() });
  const [form, setForm] = useState<Form>({
    bank_name: "",
    account_number: "",
    account_name: "",
    whatsapp_link: "",
    hero_slogan: "",
    logo_url: "",
    banner_url: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data)
      setForm({
        bank_name: data.bank_name ?? "",
        account_number: data.account_number ?? "",
        account_name: data.account_name ?? "",
        whatsapp_link: data.whatsapp_link ?? "",
        hero_slogan: data.hero_slogan ?? "",
        logo_url: data.logo_url ?? "",
        banner_url: data.banner_url ?? "",
      });
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  async function upload(field: "logo_url" | "banner_url", file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (!error) setForm((f) => ({ ...f, [field]: path }));
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Section title="Payment (Moniepoint bank transfer)">
        <Field label="Bank name" value={form.bank_name} onChange={(v) => setForm({ ...form, bank_name: v })} />
        <Field
          label="Account number"
          value={form.account_number}
          onChange={(v) => setForm({ ...form, account_number: v })}
        />
        <Field
          label="Account name"
          value={form.account_name}
          onChange={(v) => setForm({ ...form, account_name: v })}
        />
      </Section>

      <Section title="Brand">
        <Field
          label="Hero slogan"
          value={form.hero_slogan}
          onChange={(v) => setForm({ ...form, hero_slogan: v })}
        />
        <Field
          label="WhatsApp link (e.g. https://wa.me/2348012345678)"
          value={form.whatsapp_link}
          onChange={(v) => setForm({ ...form, whatsapp_link: v })}
        />
        <Uploader
          label="Logo"
          path={form.logo_url}
          onUpload={(f) => upload("logo_url", f)}
          onClear={() => setForm({ ...form, logo_url: "" })}
        />
        <Uploader
          label="Homepage banner"
          path={form.banner_url}
          onUpload={(f) => upload("banner_url", f)}
          onClear={() => setForm({ ...form, banner_url: "" })}
        />
      </Section>

      <div className="sm:col-span-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : saved ? "✓ Saved" : "Save settings"}
        </button>
        {save.error && <div className="mt-2 text-sm text-destructive">{(save.error as Error).message}</div>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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

function Uploader({
  label,
  path,
  onUpload,
  onClear,
}: {
  label: string;
  path: string;
  onUpload: (f: File) => void;
  onClear: () => void;
}) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    if (!path) return setUrl("");
    if (path.startsWith("http")) return setUrl(path);
    supabase.storage
      .from("branding")
      .createSignedUrl(path, 3600)
      .then(({ data }) => data?.signedUrl && setUrl(data.signedUrl));
  }, [path]);
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        {url ? (
          <img src={url} alt="" className="h-16 w-16 rounded-md border border-border object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-md border border-dashed border-border text-muted-foreground">
            <Upload className="h-4 w-4" />
          </div>
        )}
        <label className="flex-1 cursor-pointer rounded-md border border-border bg-input px-3 py-2 text-center text-xs font-semibold">
          Choose file
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
        {url && (
          <button onClick={onClear} className="text-xs text-destructive">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
