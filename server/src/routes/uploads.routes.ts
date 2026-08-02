import { Router } from "express";
import fs from "node:fs";
import sharp from "sharp";
import { requireAuth } from "../middleware/session.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { uploadListingPhoto, uploadSupportAttachment, publicUrlFor } from "../lib/uploads.js";
import { uploadFailed } from "../lib/errors.js";

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

uploadsRouter.post(
  "/listing-photo",
  uploadListingPhoto.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) throw uploadFailed("No file was received. Check the file size and format, then try again.");

    try {
      const metadata = await sharp(req.file.path).metadata();
      res.status(201).json({
        url: publicUrlFor("listings", req.file.filename),
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      });
    } catch (error) {
      fs.unlink(req.file.path, () => {});
      throw uploadFailed("That image could not be processed. Try a different file.");
    }
  }),
);

uploadsRouter.post(
  "/support-attachment",
  uploadSupportAttachment.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) throw uploadFailed("No file was received. Check the file size and format, then try again.");
    res.status(201).json({ url: publicUrlFor("support", req.file.filename) });
  }),
);
