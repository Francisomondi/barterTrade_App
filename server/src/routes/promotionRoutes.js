
import express from "express";
import { getPackages, createPromotion, getMyPromotions, getPromotion, payForPromotion,} from "../controllers/promotionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get( "/packages", getPackages);

router.use(protect);

router.post("/",createPromotion);
router.get( "/my",getMyPromotions);
router.get( "/:id",getPromotion);
router.post("/:id/pay",payForPromotion);

export default router;
