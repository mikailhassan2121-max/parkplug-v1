import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { env } from "../env.js";

const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
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

export const uploadListingPhoto = multer({
  storage: storageFor("listings"),
  limits: { fileSize: MAX_BYTES },
  fileFilter: imageFileFilter,
});

export const uploadSupportAttachment = multer({
  storage: storageFor("support"),
  limits: { fileSize: MAX_BYTES },
});

export function publicUrlFor(subdir: string, filename: string): string {
  return `${env.PUBLIC_UPLOAD_BASE_URL}/${subdir}/${filename}`;
}
