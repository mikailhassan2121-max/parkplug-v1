"use client";

import { useState } from "react";
import { vehicles as vehiclesApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { VEHICLE_SIZES, type Vehicle, type VehicleSize } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmDialog, Overlay } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { IconCar, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";

type Draft = {
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  plateRegion: string;
  size: VehicleSize | "";
};

const EMPTY: Draft = { make: "", model: "", color: "", licensePlate: "", plateRegion: "", size: "" };

export default function VehiclesPage() {
  const state = useAsync(() => vehiclesApi.list(), []);
  const { toast } = useToast();

  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setDraft(EMPTY);
    setErrors({});
    setCreating(true);
  }

  function openEdit(vehicle: Vehicle) {
    setDraft({
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      plateRegion: vehicle.plateRegion,
      size: vehicle.size,
    });
    setErrors({});
    setEditing(vehicle);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Draft, string>> = {};
    if (!draft.make.trim()) next.make = "Enter the make.";
    if (!draft.model.trim()) next.model = "Enter the model.";
    if (!draft.licensePlate.trim()) next.licensePlate = "Enter the license plate.";
    if (!draft.plateRegion.trim()) next.plateRegion = "Enter the state or jurisdiction.";
    if (!draft.size) next.size = "Choose the vehicle size.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate() || saving) return;
    setSaving(true);
    const payload = {
      make: draft.make.trim(),
      model: draft.model.trim(),
      color: draft.color.trim(),
      licensePlate: draft.licensePlate.trim().toUpperCase(),
      plateRegion: draft.plateRegion.trim().toUpperCase(),
      size: draft.size as VehicleSize,
    };
    const result = editing
      ? await vehiclesApi.update(editing.id, payload)
      : await vehiclesApi.create(payload);
    setSaving(false);

    if (result.ok) {
      toast({ tone: "success", title: editing ? "Vehicle updated" : "Vehicle added" });
      setCreating(false);
      setEditing(null);
      state.reload();
    } else {
      toast({ tone: "error", title: "Could not save the vehicle", description: result.error.message });
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await vehiclesApi.remove(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.ok) {
      toast({ tone: "success", title: "Vehicle removed" });
      state.reload();
    } else {
      toast({ tone: "error", title: "Could not remove the vehicle", description: result.error.message });
    }
  }

  async function makeDefault(vehicle: Vehicle) {
    const result = await vehiclesApi.setDefault(vehicle.id);
    if (result.ok) {
      toast({ tone: "success", title: `${vehicle.make} ${vehicle.model} is now your default` });
      state.reload();
    }
  }

  const dialogOpen = creating || Boolean(editing);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My vehicles</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Hosts use these details to identify your vehicle on arrival.
          </p>
        </div>
        <Button leadingIcon={<IconPlus />} onClick={openCreate}>
          Add vehicle
        </Button>
      </div>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading your vehicles</span>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your vehicles"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: state.reload }]}
          />
        ) : state.data.length === 0 ? (
          <EmptyState
            icon={<IconCar />}
            title="No vehicles saved yet"
            description="Add a vehicle now and it will be ready the next time you book."
            actions={[{ label: "Add a vehicle", onClick: openCreate }]}
          />
        ) : (
          <ul className="space-y-3">
            {state.data.map((vehicle) => (
              <li
                key={vehicle.id}
                className="flex flex-wrap items-center gap-4 rounded-card border border-ink-200 bg-white p-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-100 text-xl text-ink-600">
                  <IconCar aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                    {vehicle.color} {vehicle.make} {vehicle.model}
                    {vehicle.isDefault ? <Badge size="sm" tone="brand">Default</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-600">
                    {vehicle.licensePlate} · {vehicle.plateRegion} ·{" "}
                    {VEHICLE_SIZES.find((s) => s.value === vehicle.size)?.label}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!vehicle.isDefault ? (
                    <Button variant="ghost" size="sm" onClick={() => void makeDefault(vehicle)}>
                      Set default
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" leadingIcon={<IconEdit />} onClick={() => openEdit(vehicle)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<IconTrash />}
                    className="text-danger-700 hover:bg-danger-50"
                    onClick={() => setDeleteTarget(vehicle)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Overlay
        open={dialogOpen}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit vehicle" : "Add a vehicle"}
        variant="sheet"
        size="md"
        disableBackdropClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} loadingText="Saving…">
              {editing ? "Save changes" : "Add vehicle"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Make" required error={errors.make}>
            <Input value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} placeholder="Toyota" />
          </Field>
          <Field label="Model" required error={errors.model}>
            <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="Corolla" />
          </Field>
          <Field label="Color" optional>
            <Input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} placeholder="Silver" />
          </Field>
          <Field label="License plate" required error={errors.licensePlate}>
            <Input
              value={draft.licensePlate}
              onChange={(e) => setDraft({ ...draft, licensePlate: e.target.value.toUpperCase() })}
              placeholder="ABC1234"
              maxLength={12}
              className="uppercase"
            />
          </Field>
          <Field label="State or jurisdiction" required error={errors.plateRegion}>
            <Input
              value={draft.plateRegion}
              onChange={(e) => setDraft({ ...draft, plateRegion: e.target.value.toUpperCase() })}
              placeholder="NJ"
              maxLength={4}
              className="uppercase"
            />
          </Field>
          <Field label="Vehicle size" required error={errors.size}>
            <Select
              value={draft.size}
              onChange={(e) => setDraft({ ...draft, size: e.target.value as VehicleSize })}
              placeholder="Choose a size"
            >
              {VEHICLE_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label} — {size.hint}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Overlay>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
        loading={deleting}
        title="Remove this vehicle?"
        description={`${deleteTarget?.make} ${deleteTarget?.model} will be removed from your account. Reservations that already used it are not affected.`}
        confirmLabel="Remove vehicle"
        destructive
      />
    </div>
  );
}
