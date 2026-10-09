import sharp from "sharp";

const ALLOWED_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
]);

export const validateBusinessImage = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error(
      "The uploaded image is empty or invalid."
    );

    error.statusCode = 400;
    throw error;
  }

  try {
    const metadata = await sharp(buffer, {
      limitInputPixels: 40_000_000,
    }).metadata();

    if (!ALLOWED_FORMATS.has(metadata.format)) {
      throw new Error("Unsupported image format.");
    }

    // Decode the image rather than trusting its header alone.
    await sharp(buffer, {
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .toBuffer();

    return true;
  } catch {
    const error = new Error(
      "Invalid image. Upload a valid JPEG, PNG or WebP file."
    );

    error.statusCode = 400;
    error.code = "INVALID_IMAGE_CONTENT";

    throw error;
  }
};