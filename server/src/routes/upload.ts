import { Router, Response, Request } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import multer from "multer";
import { classifyCloudinaryFailure, cloudinaryDiagnostics, deleteImage, isCloudinaryConfigured, UploadValidationError, upload } from "../services/cloudinary.service";

const router = Router();
router.use(requireAuth);

const logCloudinaryFailure = (failure: ReturnType<typeof classifyCloudinaryFailure>) => {
  console.error("Cloudinary upload failed", {
    code: failure.code,
    httpStatus: failure.httpStatus,
    providerErrorName: failure.providerErrorName,
    requestId: failure.requestId,
  });
};

// GET /api/upload/status - authenticated diagnostic status; never returns credentials.
router.get("/status", async (_req: AuthRequest, res: Response): Promise<void> => {
  const diagnostic = await cloudinaryDiagnostics();
  if ("status" in diagnostic) {
    logCloudinaryFailure(diagnostic);
  }
  res.json({
    configured: diagnostic.configured,
    reachable: diagnostic.reachable,
    code: diagnostic.code,
    message: diagnostic.message,
  });
});

// POST /api/upload/image
router.post(
  "/image",
  (req: Request, res: Response): void => {
    if (!isCloudinaryConfigured()) {
      res.status(503).json({
        error: "Upload provider unavailable",
        code: "UPLOAD_PROVIDER_UNAVAILABLE",
        message: "Image uploads are not configured on the server.",
      });
      return;
    }

    upload.single("image")(req, res, (error: unknown) => {
      if (error) {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "File too large",
            code: "FILE_TOO_LARGE",
            message: "Choose an image smaller than 10 MB.",
          });
          return;
        }
        if (error instanceof UploadValidationError) {
          res.status(400).json({ error: "Unsupported image", code: error.code, message: error.message });
          return;
        }
        const failure = classifyCloudinaryFailure(error);
        logCloudinaryFailure(failure);
        res.status(failure.status).json({ error: "Upload provider error", code: failure.code, message: failure.message });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file uploaded", code: "FILE_REQUIRED", message: "Please choose an image first." });
        return;
      }

      const file = req.file as Express.Multer.File & {
        path: string;
        filename: string;
      };
      res.json({ url: file.path, publicId: file.filename });
    });
  }
);

// DELETE /api/upload/:publicId
router.delete("/:publicId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    await deleteImage(publicId);
    res.json({ message: "Deleted" });
  } catch {
    res.status(502).json({ error: "Upload provider error", code: "UPLOAD_DELETE_FAILED", message: "The image could not be deleted." });
  }
});

export default router;
