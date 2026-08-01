"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ListingPhoto } from "@/lib/types";
import { newId } from "@/lib/api/store";
import { Button, IconButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCamera,
  IconImage,
  IconTrash,
  IconUpload,
} from "@/components/ui/icons";

const MAX_PHOTOS = 12;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type Pending = { id: string; name: string; progress: number };

/**
 * Photo upload with drag-and-drop, reordering, and a main-photo selection.
 *
 * Files are read locally and handed back as `ListingPhoto` records. Swap
 * `readFile` for a call to the media upload endpoint to store them remotely —
 * the rest of this component does not change.
 */
export function PhotoUploader({
  photos,
  onChange,
  error,
}: {
  photos: ListingPhoto[];
  onChange: (next: ListingPhoto[]) => void;
  error?: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File): Promise<ListingPhoto | null> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result);
          const img = new window.Image();
          img.onload = () =>
            resolve({
              id: newId("pho"),
              url,
              alt: "",
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          img.onerror = () => resolve(null);
          img.src = url;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }),
    [],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const problems: string[] = [];
      const accepted: File[] = [];

      for (const file of incoming) {
        if (!ACCEPTED.includes(file.type)) {
          problems.push(`${file.name} is not a JPG, PNG, WebP, or AVIF image.`);
        } else if (file.size > MAX_BYTES) {
          problems.push(`${file.name} is larger than 10 MB.`);
        } else {
          accepted.push(file);
        }
      }

      const room = MAX_PHOTOS - photos.length;
      if (accepted.length > room) {
        problems.push(`Only ${MAX_PHOTOS} photos can be added. Extra files were skipped.`);
      }

      setRejected(problems);
      const toUpload = accepted.slice(0, Math.max(0, room));
      if (toUpload.length === 0) return;

      const tickets: Pending[] = toUpload.map((file) => ({
        id: newId("upl"),
        name: file.name,
        progress: 0,
      }));
      setPending(tickets);

      const results: ListingPhoto[] = [];
      for (let i = 0; i < toUpload.length; i += 1) {
        const ticket = tickets[i];
        setPending((prev) => prev.map((p) => (p.id === ticket.id ? { ...p, progress: 45 } : p)));
        const photo = await readFile(toUpload[i]);
        if (photo) results.push(photo);
        setPending((prev) => prev.map((p) => (p.id === ticket.id ? { ...p, progress: 100 } : p)));
      }

      if (results.length < toUpload.length) {
        setRejected((prev) => [...prev, "Some images could not be read. Try uploading them again."]);
      }

      setPending([]);
      onChange([...photos, ...results]);
    },
    [photos, onChange, readFile],
  );

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function setMain(index: number) {
    if (index === 0) return;
    const next = [...photos];
    const [chosen] = next.splice(index, 1);
    onChange([chosen, ...next]);
  }

  function remove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  function setAlt(index: number, alt: string) {
    onChange(photos.map((photo, i) => (i === index ? { ...photo, alt } : photo)));
  }

  return (
    <div>
      {/* ------------------------------------------------------- Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-card border-2 border-dashed p-6 text-center transition-colors sm:p-8",
          dragging ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-ink-50/60",
          error && "border-danger-400",
        )}
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-xl text-brand-600 shadow-e1">
          <IconUpload aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-bold text-ink-900">
          Drag photos here, or choose files
        </p>
        <p className="mt-1 text-xs text-ink-600">
          JPG, PNG, WebP, or AVIF · up to 10 MB each · {MAX_PHOTOS} photos maximum
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            Browse files
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<IconCamera />}
            onClick={() => cameraRef.current?.click()}
            className="sm:hidden"
          >
            Take a photo
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          aria-label="Choose photos to upload"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Take a photo with your camera"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger-700">
          <IconAlert className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {/* --------------------------------------------------- Upload progress */}
      {pending.length > 0 ? (
        <ul className="mt-4 space-y-2" role="status" aria-live="polite">
          {pending.map((item) => (
            <li key={item.id} className="rounded-xl border border-ink-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-ink-800">{item.name}</span>
                <span className="shrink-0 tabular-nums text-ink-500">{item.progress}%</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-200"
                role="progressbar"
                aria-valuenow={item.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Uploading ${item.name}`}
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {rejected.length > 0 ? (
        <Alert tone="warning" live className="mt-4" title="Some files were not added">
          <ul className="mt-1 space-y-1">
            {rejected.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {/* -------------------------------------------------------- Gallery */}
      {photos.length > 0 ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-card border border-ink-200 bg-white">
              <div className="relative aspect-[4/3] bg-ink-100">
                <Image src={photo.url} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" unoptimized />
                {index === 0 ? (
                  <span className="absolute left-2 top-2">
                    <Badge tone="brand" size="sm">Main photo</Badge>
                  </span>
                ) : null}
              </div>

              <div className="p-3">
                <label className="block text-xs font-semibold text-ink-700">
                  Describe this photo
                  <input
                    type="text"
                    value={photo.alt}
                    onChange={(e) => setAlt(index, e.target.value)}
                    placeholder="Driveway seen from the street"
                    maxLength={120}
                    className="mt-1 h-9 w-full rounded-lg border border-ink-300 px-2.5 text-sm font-normal
                               placeholder:text-ink-400 focus:border-brand-500"
                  />
                </label>
                <p className="mt-1 text-2xs text-ink-500">
                  Used as alt text for drivers using a screen reader.
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1">
                  <IconButton
                    label={`Move photo ${index + 1} earlier`}
                    icon={<IconArrowLeft />}
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    label={`Move photo ${index + 1} later`}
                    icon={<IconArrowRight />}
                    size="sm"
                    disabled={index === photos.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  {index !== 0 ? (
                    <Button variant="ghost" size="sm" onClick={() => setMain(index)}>
                      Make main
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<IconTrash />}
                    className="ml-auto text-danger-700 hover:bg-danger-50"
                    onClick={() => remove(index)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 grid place-items-center rounded-card border border-dashed border-ink-300 px-4 py-8 text-center">
          <IconImage className="text-2xl text-ink-400" aria-hidden="true" />
          <p className="mt-2 text-sm text-ink-600">No photos added yet</p>
        </div>
      )}

      {/* -------------------------------------------------------- Guidance */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-ink-200 p-4">
          <h4 className="text-sm font-bold text-ink-900">Good photos show</h4>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-600">
            <li>· The parking space itself, in daylight</li>
            <li>· The entrance a driver will use</li>
            <li>· The approach from the street</li>
            <li>· Where the space starts and ends</li>
            <li>· Any signs or posted restrictions</li>
          </ul>
        </div>
        <div className="rounded-card border border-warning-200 bg-warning-50 p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-warning-800">
            <IconAlert aria-hidden="true" /> Please do not upload
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-warning-800">
            <li>· License plates</li>
            <li>· People&rsquo;s faces</li>
            <li>· House numbers or mail with your address</li>
            <li>· Documents or anything with personal information</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
