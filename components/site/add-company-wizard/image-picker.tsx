/**
 * Image picking for the wizard.
 *
 * Files are held in memory (object-URL previews) for the whole wizard and only
 * uploaded to Convex storage on the final submit. That is deliberate: uploading
 * per step would leave orphaned blobs behind every abandoned wizard, and Convex
 * storage has no automatic GC.
 */
import { useId, useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MIME_TYPES,
} from "@/convex/lib/constants";
import type { PickedImage } from "./types";

const ACCEPT = UPLOAD_MIME_TYPES.join(",");

export type PickError = "tooLarge" | "invalidType" | "invalid";

/** Reads intrinsic dimensions — the media table requires real width/height. */
export async function readPickedImage(
  file: File,
): Promise<{ ok: true; image: PickedImage } | { ok: false; error: PickError }> {
  if (!(UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "invalidType" };
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return { ok: false, error: "tooLarge" };
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new window.Image();
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("decode failed"));
        image.src = previewUrl;
      },
    );
    if (size.width <= 0 || size.height <= 0) throw new Error("empty image");
    return { ok: true, image: { file, previewUrl, ...size } };
  } catch {
    URL.revokeObjectURL(previewUrl);
    return { ok: false, error: "invalid" };
  }
}

export function releaseImage(image: PickedImage | null | undefined) {
  if (image) URL.revokeObjectURL(image.previewUrl);
}

function Preview({
  image,
  alt,
  className,
}: {
  image: PickedImage;
  alt: string;
  className?: string;
}) {
  // next/image cannot optimize a blob: object URL for a client-side File.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob preview
    <img
      src={image.previewUrl}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function SingleImagePicker({
  label,
  hint,
  value,
  error,
  chooseLabel,
  removeLabel,
  aspect = "square",
  onPick,
  onRemove,
}: {
  label: string;
  hint?: string;
  value: PickedImage | null;
  error?: string;
  chooseLabel: string;
  removeLabel: string;
  aspect?: "square" | "wide";
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted",
            aspect === "square" ? "size-24" : "h-24 w-40",
            error && "border-destructive",
          )}
        >
          {value ? (
            <Preview image={value} alt={label} />
          ) : (
            <ImagePlus
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            {chooseLabel}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="size-4" aria-hidden="true" />
              {removeLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = ""; // allows re-picking the same file
        }}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GalleryPicker({
  label,
  hint,
  values,
  error,
  chooseLabel,
  removeLabel,
  max,
  onPick,
  onRemove,
}: {
  label: string;
  hint?: string;
  values: PickedImage[];
  error?: string;
  chooseLabel: string;
  removeLabel: string;
  max: number;
  onPick: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const full = values.length >= max;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      {values.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {values.map((image, index) => (
            <li
              key={image.previewUrl}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              <Preview image={image} alt={`${label} ${index + 1}`} />
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`${removeLabel} ${index + 1}`}
                className="absolute top-1.5 right-1.5 rounded-full bg-card/90 p-1.5 text-foreground shadow-sm transition-colors hover:bg-card"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={full}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="size-4" aria-hidden="true" />
        {chooseLabel}
      </Button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onPick(files.slice(0, max - values.length));
          event.target.value = "";
        }}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
