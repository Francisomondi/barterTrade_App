import express from "express";
import upload from "../middleware/upload.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

const router = express.Router();

router.post("/image", upload.single("image"), async (req, res) => {
try {
if (!req.file) {
return res.status(400).json({
message: "No image uploaded",
});
}


const result = await uploadToCloudinary(
  req.file.buffer,
  "barter-trade/test"
);

return res.status(200).json({
  message: "Image uploaded successfully",
  image: {
    url: result.secure_url,
    publicId: result.public_id,
  },
});


} catch (error) {
console.error("Cloudinary upload error:", error);

return res.status(500).json({
  message: "Image upload failed",
  error: error.message,
});


}
});

export default router;
