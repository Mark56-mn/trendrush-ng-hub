import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/shop.functions";
import { updateSettings } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Landmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type Form = {
  whatsapp_phone: string;
  hero_slogan: string;
  logo_url: string;
  banner_url: string;
  rapidapi_key: string;
  rapidapi_host: string;
};

function AdminSettings() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSettings);
  const saveFn = useServerFn(updateSettings);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => getFn() });
  const [form, setForm] = useState<Form>({
    whatsapp_phone: "",
    hero_slogan: "",
    logo_url: "",
    banner_url: "",
    rapidapi_key: "",
    rapidapi_host: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data)
      setForm({
        whatsapp_phone: data.whatsapp_phone ?? "",
        hero_slogan: data.hero_slogan ?? "",
        logo_url: data.logo_url ?? "",
        banner_url: data.banner_url ?? "",
        rapidapi_key: data.rapidapi_key ?? "",
        rapidapi_host: data.rapidapi_host ?? "",
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
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Landmark className="h-5 w-5 text-neon" />
            <div>
              <h3 className="font-semibold">Bank Account Details</h3>
              <p className="text-xs text-muted-foreground">Manage your payment bank account</p>
            </div>
          </div>
          <Link
            to="/admin/bank-details"
            className="rounded-md bg-neon px-3 py-1.5 text-xs font-bold text-neon-foreground hover:bg-neon/90"
          >
            Manage
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <Section title="Brand">
        <Field
          label="Hero slogan"
          value={form.hero_slogan}
          onChange={(v) => setForm({ ...form, hero_slogan: v })}
        />
        <Field
          label="WhatsApp phone number (e.g. 2348012345678)"
          value={form.whatsapp_phone}
          onChange={(v) => setForm({ ...form, whatsapp_phone: v })}
          placeholder="Enter phone without + or spaces"
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

      <Section title="Rapid API (Product Import)">
        <Field
          label="Rapid API Key"
          value={form.rapidapi_key}
          onChange={(v) => setForm({ ...form, rapidapi_key: v })}
          placeholder="Your Rapid API key"
        />
        <Field
          label="Rapid API Host"
          value={form.rapidapi_host}
          onChange={(v) => setForm({ ...form, rapidapi_host: v })}
          placeholder="e.g., api.example.rapidapi.com"
        />
      </Section>

      <div className="col-span-1 sm:col-span-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground disabled:opacity-50 transition-opacity"
        >
          {save.isPending ? "Saving…" : saved ? "✓ Saved" : "Save settings"}
        </button>
        {save.error && <div className="mt-2 text-sm text-destructive">{(save.error as Error).message}</div>}
        </div>
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
