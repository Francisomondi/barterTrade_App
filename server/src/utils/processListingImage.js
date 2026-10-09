
import sharp from "sharp";

/**
 * ============================================================
 * LISTING IMAGE PROCESSING CONFIGURATION
 * ============================================================
 */

const MAX_IMAGE_DIMENSION = 1400;
const JPEG_QUALITY = 78;
const MAX_INPUT_SIZE = 5 * 1024 * 1024;

/**
 * ============================================================
 * PROCESS LISTING IMAGE
 * ============================================================
 *
 * - Validates the input buffer
 * - Automatically rotates images using EXIF orientation
 * - Resizes images to fit within 1400 x 1400
 * - Converts supported images to optimized JPEG
 * - Removes unnecessary metadata
 * - Logs processing duration and size reduction
 *
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */

const processListingImage = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error(
      "Listing image processing requires a non-empty Buffer."
    );
  }

  if (buffer.length > MAX_INPUT_SIZE) {
    throw new Error(
      "Listing image exceeds the maximum allowed size of 5 MB."
    );
  }

  const startedAt = Date.now();

  const originalSizeMB =
    buffer.length / 1024 / 1024;

  console.log(
    `[LISTING IMAGE] Original size: ${originalSizeMB.toFixed(2)} MB`
  );

  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(
        "Unable to determine image dimensions."
      );
    }

    console.log(
      `[LISTING IMAGE] Original dimensions: ${metadata.width}x${metadata.height}`
    );

    const processedBuffer = await sharp(buffer, {
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({
        background: "#ffffff",
      })
      .jpeg({
        quality: JPEG_QUALITY,
        progressive: true,
        mozjpeg: false,
      })
      .toBuffer();

    const processedMetadata =
      await sharp(processedBuffer).metadata();

    const processedSizeMB =
      processedBuffer.length / 1024 / 1024;

    const savedPercentage =
      ((buffer.length - processedBuffer.length) /
        buffer.length) *
      100;

    console.log(
      `[LISTING IMAGE] Processed size: ${processedSizeMB.toFixed(2)} MB`
    );

    console.log(
      `[LISTING IMAGE] Processed dimensions: ${processedMetadata.width}x${processedMetadata.height}`
    );

    console.log(
      `[LISTING IMAGE] Size change: ${savedPercentage.toFixed(1)}%`
    );

    console.log(
      `[LISTING IMAGE] Completed in ${
        Date.now() - startedAt
      }ms`
    );

    return processedBuffer;
  } catch (error) {
    console.error(
      "[LISTING IMAGE] Processing failed:",
      error
    );

    throw new Error(
      "Unable to process listing image."
    );
  }
};

export default processListingImage;
