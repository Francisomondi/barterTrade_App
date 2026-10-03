import express from "express";
import passport from "../config/passport.js";
import { register, login, getMe, updateMe, forgotPassword, resetPassword, uploadMyAvatar,deleteMyAvatar} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { generateToken } from "../utils/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password",forgotPassword);
router.post( "/reset-password/:token",resetPassword);
router.get("/me", protect, getMe);
router.patch( "/me", protect, updateMe);
router.patch("/me/avatar", protect, upload.single("avatar"), uploadMyAvatar);
router.delete( "/me/avatar", protect, deleteMyAvatar);
router.get( "/google", passport.authenticate("google",
   {  scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login",
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user);

      res.redirect(
        `http://localhost:5173/auth/callback?token=${encodeURIComponent(
          token
        )}`
      );
    } catch (error) {
      console.error("GOOGLE CALLBACK ERROR:", error);

      res.redirect("http://localhost:5173/login");
    }
  }
);

export default router;