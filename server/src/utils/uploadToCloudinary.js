import cloudinary from "../config/cloudinary.js";

/**
 * ============================================================
 * CLOUDINARY UPLOAD CONFIGURATION
 * ============================================================
 */

const CLOUDINARY_UPLOAD_TIMEOUT_MS = 120000;

/**
 * ============================================================
 * UPLOAD IMAGE TO CLOUDINARY
 * ============================================================
 *
 * Uploads an in-memory image Buffer using Cloudinary's
 * upload_stream API.
 *
 * @param {Buffer} buffer
 * @param {string} folder
 * @param {object} options
 * @returns {Promise<object>}
 */
const uploadToCloudinary = (
  buffer,
  folder = "barter-trade/listings",
  options = {}
) => {
  return new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return reject(
        new Error(
          "Cloudinary upload requires a non-empty Buffer."
        )
      );
    }

    const startedAt = Date.now();
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;

      settled = true;

      const elapsed = Date.now() - startedAt;

      if (error) {
        console.error(
          `[CLOUDINARY] Upload failed after ${elapsed}ms:`,
          {
            message: error.message,
            http_code: error.http_code,
            name: error.name,
          }
        );

        return reject(error);
      }

      if (!result?.secure_url || !result?.public_id) {
        return reject(
          new Error(
            "Cloudinary upload completed without the expected result."
          )
        );
      }

      console.log(
        `[CLOUDINARY] Upload completed in ${elapsed}ms`
      );

      console.log(
        `[CLOUDINARY] Result: ${result.width}x${result.height}, ${result.format}, ${(
          (result.bytes || 0) /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      resolve(result);
    };

    try {
      console.log(
        `[CLOUDINARY] Starting upload: ${(
          buffer.length /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
            ...options,
          },
          finish
        );

      uploadStream.on("error", (error) => {
        finish(error);
      });

      uploadStream.end(buffer);
    } catch (error) {
      finish(error);
    }
  });
};

export default uploadToCloudinary;