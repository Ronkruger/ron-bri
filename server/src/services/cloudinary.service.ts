import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export class UploadValidationError extends Error {
  constructor(message: string, public readonly code: "UNSUPPORTED_FILE_TYPE") {
    super(message);
    this.name = "UploadValidationError";
  }
}

export type CloudinaryFailureCode =
  | "UPLOAD_AUTH_FAILED"
  | "UPLOAD_CLOUD_NOT_FOUND"
  | "UPLOAD_LIMIT_REACHED"
  | "UPLOAD_NETWORK_ERROR"
  | "UPLOAD_PROVIDER_REJECTED";

export interface CloudinaryFailure {
  code: CloudinaryFailureCode;
  message: string;
  status: number;
  httpStatus?: number;
  providerErrorName?: string;
  requestId?: string;
}

type CloudinaryErrorShape = {
  message?: unknown;
  name?: unknown;
  http_code?: unknown;
  statusCode?: unknown;
  request_id?: unknown;
  requestId?: unknown;
  code?: unknown;
  errors?: unknown;
  cause?: unknown;
};

const readableString = (value: unknown) => typeof value === "string" ? value : "";
const readableNumber = (value: unknown) => typeof value === "number" ? value : undefined;

const collectCloudinaryErrors = (error: unknown, seen = new Set<object>()): CloudinaryErrorShape[] => {
  if (typeof error !== "object" || error === null || seen.has(error)) {
    return [];
  }

  seen.add(error);
  const details = error as CloudinaryErrorShape;
  const nestedErrors = Array.isArray(details.errors)
    ? details.errors.flatMap((nested) => collectCloudinaryErrors(nested, seen))
    : [];
  const cause = collectCloudinaryErrors(details.cause, seen);

  return [details, ...nestedErrors, ...cause];
};

export const classifyCloudinaryFailure = (error: unknown): CloudinaryFailure => {
  const errors = collectCloudinaryErrors(error);
  const details = errors[0] ?? {};
  const message = errors.map((item) => readableString(item.message)).join(" ").toLowerCase();
  const name = readableString(details.name);
  const httpStatus = errors
    .map((item) => readableNumber(item.http_code) ?? readableNumber(item.statusCode))
    .find((status): status is number => status !== undefined);
  const requestId = errors
    .map((item) => readableString(item.request_id) || readableString(item.requestId))
    .find(Boolean) || undefined;
  const identity = errors
    .map((item) => `${readableString(item.name)} ${readableString(item.message)} ${readableString(item.code)}`)
    .join(" ")
    .toLowerCase();

  if (httpStatus === 401 || /invalid (api key|signature)|authorization|required.*credential|api secret/.test(identity)) {
    return { code: "UPLOAD_AUTH_FAILED", status: 502, httpStatus, providerErrorName: name || undefined, requestId, message: "Cloudinary rejected the upload credentials. Verify the server-side API key and secret, then restart the API." };
  }
  if (httpStatus === 404 || /unknown cloud|cloud name|not found.*cloud/.test(identity)) {
    return { code: "UPLOAD_CLOUD_NOT_FOUND", status: 502, httpStatus, providerErrorName: name || undefined, requestId, message: "Cloudinary could not find the configured cloud. Verify the cloud name, then restart the API." };
  }
  if (httpStatus === 420 || httpStatus === 429 || /quota|rate limit|too many requests|credit/.test(identity)) {
    return { code: "UPLOAD_LIMIT_REACHED", status: 503, httpStatus, providerErrorName: name || undefined, requestId, message: "Cloudinary cannot accept uploads right now because its account limit was reached. Try again later." };
  }
  if (/eacces|enotfound|econnrefused|econnreset|etimedout|network|socket|fetch failed/.test(identity)) {
    return { code: "UPLOAD_NETWORK_ERROR", status: 503, httpStatus, providerErrorName: name || undefined, requestId, message: "The server could not reach Cloudinary. Check the server network connection and try again." };
  }
  return { code: "UPLOAD_PROVIDER_REJECTED", status: 502, httpStatus, providerErrorName: name || undefined, requestId, message: "Cloudinary rejected the upload. Check the Cloudinary account settings and try again." };
};

export const cloudinaryDiagnostics = async () => {
  if (!configured) {
    return { configured: false, reachable: false, code: "UPLOAD_PROVIDER_UNAVAILABLE", message: "Image uploads are not configured on the server." };
  }

  try {
    await cloudinary.api.ping();
    return { configured: true, reachable: true, code: "UPLOAD_PROVIDER_READY", message: "Cloudinary is reachable." };
  } catch (error) {
    const failure = classifyCloudinaryFailure(error);
    return { configured: true, reachable: false, ...failure };
  }
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ronbri",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
  } as any,
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new UploadValidationError("Use a JPG, PNG, GIF, or WebP image.", "UNSUPPORTED_FILE_TYPE"));
      return;
    }
    callback(null, true);
  },
});

export const isCloudinaryConfigured = () => configured;

export const deleteImage = async (publicId: string) => {
  return cloudinary.uploader.destroy(publicId);
};

export { cloudinary };
