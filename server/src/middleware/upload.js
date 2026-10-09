import multer from "multer";

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error(
      "Only JPEG, PNG and WebP images are allowed."
    );

    error.statusCode = 400;
    error.code = "INVALID_IMAGE_TYPE";

    return cb(error);
  }

  cb(null, true);
};

/**
 * Shared upload middleware.
 *
 * Preserves support for listing endpoints that
 * accept multiple images.
 */
const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
    fields: 10,
    parts: 15,
  },

  fileFilter,
});

/**
 * Dedicated middleware for business logo and cover.
 *
 * The .single() handler also rejects unexpected
 * file fields and multiple uploaded files.
 */
export const businessImageUpload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },

  fileFilter,
});

export default upload;