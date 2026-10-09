import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_TIMEOUT_MS = 120000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,

  secure: true,
  timeout: CLOUDINARY_TIMEOUT_MS,
});

export default cloudinary;