"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ListingPhoto } from "@/lib/types";
import { Button, IconButton } from "@/components/ui/button";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { IconChevronLeft, IconChevronRight, IconImage, IconX } from "@/components/ui/icons";

/**
 * Listing photo gallery with a full-screen lightbox. Arrow keys move between
 * images, Escape closes, and touch swipes work on mobile.
 */
export function PhotoGallery({ photos, title }: { photos: ListingPhoto[]; title: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="grid aspect-[16/9] place-items-center rounded-card border border-dashed border-ink-300 bg-ink-50 text-ink-400 sm:aspect-[2/1]">
        <div className="text-center">
          <IconImage className="mx-auto text-4xl" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-ink-600">
            This host has not added photos yet
          </p>
        </div>
      </div>
    );
  }

  const [main, ...rest] = photos;

  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-card sm:grid-cols-4 sm:grid-rows-2">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="relative aspect-[16/10] overflow-hidden bg-ink-100 sm:col-span-2 sm:row-span-2 sm:aspect-auto"
          aria-label={`View all ${photos.length} photos of ${title}, starting with the main photo`}
        >
          <Image
            src={main.url}
            alt={main.alt}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 hover:scale-[1.03]"
            placeholder={main.blurDataUrl ? "blur" : undefined}
            blurDataURL={main.blurDataUrl}
          />
        </button>

        {rest.slice(0, 4).map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxIndex(index + 1)}
            className="relative hidden aspect-[4/3] overflow-hidden bg-ink-100 sm:block"
            aria-label={`View photo ${index + 2} of ${photos.length}: ${photo.alt}`}
          >
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              sizes="25vw"
              className="object-cover transition-transform duration-300 hover:scale-[1.03]"
              placeholder={photo.blurDataUrl ? "blur" : undefined}
              blurDataURL={photo.blurDataUrl}
            />
          </button>
        ))}
      </div>

      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={() => setLightboxIndex(0)}>
          View all {photos.length} photos
        </Button>
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          title={title}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  photos,
  startIndex,
  title,
  onClose,
}: {
  photos: ListingPhoto[];
  startIndex: number;
  title: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);
  const touchStart = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go]);

  const photo = photos[index];

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${title}`}
      tabIndex={-1}
      className="fixed inset-0 z-100 flex flex-col bg-ink-950/97 focus:outline-none animate-fade-in"
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(delta) > 50) go(delta > 0 ? -1 : 1);
        touchStart.current = null;
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white safe-top">
        <p className="text-sm font-semibold tabular-nums" aria-live="polite">
          {index + 1} of {photos.length}
        </p>
        <IconButton
          label="Close photo viewer"
          icon={<IconX />}
          onClick={onClose}
          data-autofocus
          className="text-white hover:bg-white/15"
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <Image
          key={photo.id}
          src={photo.url}
          alt={photo.alt}
          fill
          sizes="100vw"
          className="object-contain animate-fade-in"
        />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-4 safe-bottom">
        <IconButton
          label="Previous photo"
          icon={<IconChevronLeft />}
          onClick={() => go(-1)}
          className="bg-white/12 text-white hover:bg-white/22"
        />
        <p className="min-w-0 flex-1 truncate px-2 text-center text-xs text-white/80">{photo.alt}</p>
        <IconButton
          label="Next photo"
          icon={<IconChevronRight />}
          onClick={() => go(1)}
          className="bg-white/12 text-white hover:bg-white/22"
        />
      </div>

      {/* Thumbnail strip doubles as a direct-jump control on larger screens. */}
      <ul className="hidden gap-2 overflow-x-auto px-4 pb-4 scrollbar-none sm:flex">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? "true" : undefined}
              aria-label={`Show photo ${i + 1}`}
              className={cn(
                "relative h-14 w-20 overflow-hidden rounded-lg transition-opacity",
                i === index ? "ring-2 ring-white" : "opacity-55 hover:opacity-85",
              )}
            >
              <Image src={p.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
