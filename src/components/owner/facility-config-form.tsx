"use client";

import { useState } from "react";
import { updateFacilityConfig } from "@/lib/api/sensors";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function FacilityConfigForm({
  facilityId,
  name,
  address,
  onSaved,
}: {
  facilityId: string;
  name: string;
  address: string;
  onSaved: (next: { name: string; address: string }) => void;
}) {
  const [nameValue, setNameValue] = useState(name);
  const [addressValue, setAddressValue] = useState(address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = nameValue !== name || addressValue !== address;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const trimmedName = nameValue.trim();
    const trimmedAddress = addressValue.trim();
    if (!trimmedName || !trimmedAddress) {
      setError("Name and address cannot be empty.");
      setSaving(false);
      return;
    }

    const result = await updateFacilityConfig(facilityId, { name: trimmedName, address: trimmedAddress });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setNameValue(result.data.name);
    setAddressValue(result.data.address);
    onSaved({ name: result.data.name, address: result.data.address });
    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-sm font-bold text-ink-900">Facility details</h2>

      {error ? (
        <Alert tone="danger" live title="Could not save">
          {error}
        </Alert>
      ) : saved ? (
        <Alert tone="success" title="Saved">
          Your changes are live.
        </Alert>
      ) : null}

      <Field label="Facility name" required>
        <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} maxLength={120} />
      </Field>

      <Field label="Address" required>
        <Input value={addressValue} onChange={(e) => setAddressValue(e.target.value)} maxLength={240} />
      </Field>

      <Button type="submit" disabled={!dirty} loading={saving} loadingText="Saving…">
        Save changes
      </Button>
    </form>
  );
}
