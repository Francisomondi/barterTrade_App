
import express from "express";
import { initiateMpesaPayment, mpesaCallback, getPaymentStatus, getMyPayments,} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post( "/mpesa/callback", mpesaCallback);

router.use(protect);

router.post( "/mpesa/stkpush", initiateMpesaPayment);
router.get( "/", getMyPayments);
router.get( "/:id", getPaymentStatus
);

export default router;
