import { Router, Response, Request } from "express";
import { requireAuth, AuthRequest } from "../middleware/requireAuth";
import { upload, deleteImage } from "../services/cloudinary.service";

const router = Router();
router.use(requireAuth);

// POST /api/upload/image
router.post(
  "/image",
  upload.single("image"),
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const file = req.file as Express.Multer.File & {
      path: string;
      filename: string;
    };
    res.json({ url: file.path, publicId: file.filename });
  }
);

// DELETE /api/upload/:publicId
router.delete("/:publicId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    await deleteImage(publicId);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
