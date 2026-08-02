import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import sharp from "sharp";
import { env } from "../env.js";

const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
// The set sharp is allowed to have actually decoded the file as. Client-sent
// Content-Type (checked above, in fileFilter) is trivially spoofable — this
// is the real check, since it's driven by the file's own content rather than
// a header the uploader controls. Deliberately excludes "svg": sharp can
// rasterise SVGs when built with librsvg support, which would otherwise let
// an SVG (a legitimate vector for stored XSS if ever served or opened
// directly) slip through a MIME allowlist that only inspects Content-Type.
const ACCEPTED_SHARP_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const MAX_BYTES = 10 * 1024 * 1024;

export const uploadRoot = path.resolve(env.UPLOAD_DIR);
const listingPhotoDir = path.join(uploadRoot, "listings");
const supportAttachmentDir = path.join(uploadRoot, "support");

for (const dir of [listingPhotoDir, supportAttachmentDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

function storageFor(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(uploadRoot, subdir)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!ACCEPTED_MIME.has(file.mimetype)) {
    cb(new Error("Only JPG, PNG, WebP, or AVIF images are accepted."));
    return;
  }
  cb(null, true);
}

// Client-sent Content-Type is only a first-pass filter (it's spoofable) —
// the route handler verifies the real content afterwards for both cases:
// sanitizeUploadedImage() re-decodes images, and support-attachment checks
// the PDF magic number. This layer's real job is rejecting obvious
// mismatches (a .html or .svg upload, whatever it claims to be) early.
const ACCEPTED_ATTACHMENT_MIME = new Set([...ACCEPTED_MIME, "application/pdf"]);

function attachmentFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!ACCEPTED_ATTACHMENT_MIME.has(file.mimetype)) {
    cb(new Error("Only JPG, PNG, WebP, AVIF, or PDF files are accepted."));
    return;
  }
  cb(null, true);
}

export const uploadListingPhoto = multer({
  storage: storageFor("listings"),
  limits: { fileSize: MAX_BYTES },
  fileFilter: imageFileFilter,
});

export const uploadSupportAttachment = multer({
  storage: storageFor("support"),
  limits: { fileSize: MAX_BYTES },
  fileFilter: attachmentFileFilter,
});

export function publicUrlFor(subdir: string, filename: string): string {
  return `${env.PUBLIC_UPLOAD_BASE_URL}/${subdir}/${filename}`;
}

/**
 * Re-encodes an uploaded image in place: verifies it is genuinely one of the
 * accepted raster formats (rejecting anything else, including an SVG or
 * arbitrary bytes with a spoofed Content-Type), auto-rotates using any EXIF
 * orientation tag, then strips all metadata as a side effect of re-encoding
 * — sharp only preserves EXIF/ICC/GPS data if `.withMetadata()` is called,
 * which this deliberately never does. A phone photo's embedded GPS
 * coordinates would otherwise be published as-is on a public listing page,
 * undermining the address-privacy system (the approximate map circle,
 * street-number stripping, etc.) entirely.
 *
 * Throws and deletes the file on anything that isn't a real, decodable image
 * in an accepted format.
 */
export async function sanitizeUploadedImage(filePath: string): Promise<{ width: number; height: number }> {
  try {
    const image = sharp(filePath, { failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.format || !ACCEPTED_SHARP_FORMATS.has(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format ?? "unknown"}`);
    }

    const buffer = await image.rotate().toBuffer({ resolveWithObject: true });
    await fs.promises.writeFile(filePath, buffer.data);
    return { width: buffer.info.width, height: buffer.info.height };
  } catch (error) {
    await fs.promises.unlink(filePath).catch(() => {});
    throw error;
  }
}
