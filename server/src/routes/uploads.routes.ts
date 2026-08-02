import { Router } from "express";
import fs from "node:fs";
import { requireAuth } from "../middleware/session.js";
import { userLimiter } from "../middleware/rate-limit.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { uploadListingPhoto, uploadSupportAttachment, publicUrlFor, sanitizeUploadedImage } from "../lib/uploads.js";
import { uploadFailed } from "../lib/errors.js";

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);
// Per-account, on top of the per-IP limit in app.ts — enough for a full
// 12-photo listing plus retries, without leaving uploads effectively
// uncapped for one account.
uploadsRouter.use(userLimiter({ windowMs: 60 * 60_000, limit: 30, message: "Too many uploads. Try again later." }));

uploadsRouter.post(
  "/listing-photo",
  uploadListingPhoto.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) throw uploadFailed("No file was received. Check the file size and format, then try again.");

    try {
      const { width, height } = await sanitizeUploadedImage(req.file.path);
      res.status(201).json({ url: publicUrlFor("listings", req.file.filename), width, height });
    } catch {
      // sanitizeUploadedImage already deleted the file on failure.
      throw uploadFailed("That image could not be processed. Try a different file.");
    }
  }),
);

const PDF_MAGIC = Buffer.from("%PDF-");

uploadsRouter.post(
  "/support-attachment",
  uploadSupportAttachment.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) throw uploadFailed("No file was received. Check the file size and format, then try again.");

    // Content-Type from the client is not trustworthy — verify what the
    // bytes actually are. Images are re-encoded (strips EXIF/GPS the same
    // way listing photos are); anything claiming to be a PDF is checked for
    // the real PDF magic number rather than trusted at face value.
    if (req.file.mimetype === "application/pdf") {
      const head = await fs.promises.readFile(req.file.path, { encoding: null, flag: "r" }).then((b) => b.subarray(0, 5));
      if (!head.equals(PDF_MAGIC)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        throw uploadFailed("That file could not be processed. Try a different file.");
      }
      res.status(201).json({ url: publicUrlFor("support", req.file.filename) });
      return;
    }

    try {
      await sanitizeUploadedImage(req.file.path);
      res.status(201).json({ url: publicUrlFor("support", req.file.filename) });
    } catch {
      throw uploadFailed("That file could not be processed. Try a different file.");
    }
  }),
);
