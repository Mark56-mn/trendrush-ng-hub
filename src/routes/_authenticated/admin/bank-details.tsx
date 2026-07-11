import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/shop.functions";
import { updateBankDetails } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/bank-details")({
  component: AdminBankDetails,
});

type BankForm = {
  bank_name: string;
  account_number: string;
  account_name: string;
};

function AdminBankDetails() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSettings);
  const saveFn = useServerFn(updateBankDetails);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => getFn() });
  const [form, setForm] = useState<BankForm>({
    bank_name: "",
    account_number: "",
    account_name: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data)
      setForm({
        bank_name: data.bank_name ?? "",
        account_number: data.account_number ?? "",
        account_name: data.account_name ?? "",
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bank Account Details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your bank account information for payment transfers
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">Bank Name</label>
          <input
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            placeholder="e.g., Moniepoint"
            className="mt-2 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">Account Number</label>
          <input
            value={form.account_number}
            onChange={(e) => setForm({ ...form, account_number: e.target.value })}
            placeholder="e.g., 0123456789"
            className="mt-2 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">Account Name</label>
          <input
            value={form.account_name}
            onChange={(e) => setForm({ ...form, account_name: e.target.value })}
            placeholder="Name on the bank account"
            className="mt-2 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="mt-6 w-full rounded-md bg-neon px-4 py-3 font-bold text-neon-foreground disabled:opacity-50 transition-opacity"
        >
          {save.isPending ? "Saving…" : saved ? "✓ Saved" : "Save Bank Details"}
        </button>
        {save.error && <div className="text-sm text-destructive">{(save.error as Error).message}</div>}
      </div>

      <div className="mt-8 rounded-lg border border-border/50 bg-card/50 p-4">
        <h3 className="font-semibold">Current Details</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Bank:</span>
            <span className="ml-2 font-mono">{form.bank_name || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Account:</span>
            <span className="ml-2 font-mono">{form.account_number || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Account Name:</span>
            <span className="ml-2 font-mono">{form.account_name || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
