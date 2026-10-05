import sharp from "sharp";

/**
 * ============================================================
 * PROCESS AVATAR IMAGE
 * ============================================================
 *
 * Resize and compress an uploaded avatar BEFORE sending it
 * to Cloudinary.
 *
 * This reduces:
 *
 * - upload payload
 * - Cloudinary transfer time
 * - storage size
 * - bandwidth
 *
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
const processAvatarImage = async (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      "Avatar processing requires a valid image buffer."
    );
  }

  if (buffer.length === 0) {
    throw new Error(
      "Avatar processing received an empty image buffer."
    );
  }

  const startedAt = Date.now();

  console.log(
    `[AVATAR PROCESSING] Original: ${(
      buffer.length /
      1024 /
      1024
    ).toFixed(2)} MB`
  );

  /*
   * Resize the avatar locally.
   *
   * withoutEnlargement prevents small images from
   * unnecessarily being enlarged.
   */
  const processedBuffer = await sharp(buffer)
    .rotate()
    .resize(600, 600, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 82,
      progressive: true,
      mozjpeg: true,
    })
    .toBuffer();

  console.log(
    `[AVATAR PROCESSING] Processed: ${(
      processedBuffer.length /
      1024 /
      1024
    ).toFixed(2)} MB`
  );

  console.log(
    `[AVATAR PROCESSING] Completed in ${
      Date.now() - startedAt
    }ms`
  );

  return processedBuffer;
};

export default processAvatarImage;