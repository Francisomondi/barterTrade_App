import express from "express";

import passport from "../config/passport.js";

import {
  register,
  login,
  getMe,
} from "../controllers/authController.js";

import { protect } from "../middlewares/authMiddleware.js";

import { generateToken } from "../utils/auth.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.get("/me", protect, getMe);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect:
      "http://localhost:5173/login?error=google",
  }),
  (req, res) => {
    const token = generateToken(req.user);

    res.redirect(
      `http://localhost:5173/auth/callback?token=${token}`
    );
  }
);

export default router;