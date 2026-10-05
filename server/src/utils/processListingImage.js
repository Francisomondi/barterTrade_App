import sharp from "sharp";

const processListingImage = async (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      "Listing image processing requires a valid image buffer."
    );
  }

  if (buffer.length === 0) {
    throw new Error(
      "Listing image processing received an empty image buffer."
    );
  }

  const startedAt = Date.now();

  const originalSizeMB =
    buffer.length / 1024 / 1024;

  console.log(
    `[LISTING IMAGE] Original: ${originalSizeMB.toFixed(2)} MB`
  );

  try {
    const metadata =
      await sharp(buffer).metadata();

    console.log(
      `[LISTING IMAGE] Original dimensions: ${
        metadata.width || "unknown"
      }x${metadata.height || "unknown"}`
    );

    const processedBuffer =
      await sharp(buffer)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();

    const processedMetadata =
      await sharp(
        processedBuffer
      ).metadata();

    console.log(
      `[LISTING IMAGE] Processed: ${(
        processedBuffer.length /
        1024 /
        1024
      ).toFixed(2)} MB`
    );

    console.log(
      `[LISTING IMAGE] Processed dimensions: ${
        processedMetadata.width ||
        "unknown"
      }x${
        processedMetadata.height ||
        "unknown"
      }`
    );

    /*
     * If Sharp somehow creates a larger image,
     * keep the original buffer instead.
     *
     * Exception:
     * If the original image required resizing,
     * we still want the processed version.
     */
    const requiredResize =
      (metadata.width || 0) > 1600 ||
      (metadata.height || 0) > 1600;

    if (
      !requiredResize &&
      processedBuffer.length >= buffer.length
    ) {
      console.log(
        "[LISTING IMAGE] Original is already smaller. Keeping original."
      );

      console.log(
        `[LISTING IMAGE] Completed in ${
          Date.now() - startedAt
        }ms`
      );

      return buffer;
    }

    console.log(
      `[LISTING IMAGE] Saved ${(
        ((buffer.length -
          processedBuffer.length) /
          buffer.length) *
        100
      ).toFixed(1)}%`
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