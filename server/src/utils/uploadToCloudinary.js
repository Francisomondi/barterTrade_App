import cloudinary from "../config/cloudinary.js";

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
    if (!Buffer.isBuffer(buffer)) {
      reject(
        new Error(
          "Cloudinary upload requires a valid Buffer."
        )
      );

      return;
    }

    if (buffer.length === 0) {
      reject(
        new Error(
          "Cloudinary upload received an empty Buffer."
        )
      );

      return;
    }

    const startedAt = Date.now();

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

          /*
           * Cloudinary automatically determines
           * the image format unless overridden.
           */
          ...options,
        },

        (error, result) => {
          const elapsed =
            Date.now() - startedAt;

          if (error) {
            console.error(
              `[CLOUDINARY] Upload failed after ${elapsed}ms:`,
              error
            );

            reject(error);

            return;
          }

          if (
            !result?.secure_url ||
            !result?.public_id
          ) {
            reject(
              new Error(
                "Cloudinary upload completed without the expected result."
              )
            );

            return;
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
        }
      );

    /*
     * Catch stream-level errors as well.
     */
    uploadStream.on(
      "error",
      (error) => {
        console.error(
          "[CLOUDINARY] Stream error:",
          error
        );

        reject(error);
      }
    );

    uploadStream.end(buffer);
  });
};

export default uploadToCloudinary;