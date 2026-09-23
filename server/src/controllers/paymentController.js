
import prisma from "../config/prisma.js";
import { initiateStkPush, normalizeMpesaPhone,} from "../services/mpesaService.js";
import { activatePromotion,} from "../services/promotionService.js";

/**
 * INITIATE M-PESA STK PUSH
 * POST /api/payments/mpesa/stkpush
 *
 * Creates a pending Payment record and
 * sends an STK Push request to Safaricom.
 */
export const initiateMpesaPayment = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      amount,
      phoneNumber,
      type,
      tradeId,
      description,
    } = req.body;

    /*
     * STEP 1
     * Validate required fields.
     */
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero.",
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "M-PESA phone number is required.",
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Payment type is required.",
      });
    }

    /*
     * STEP 2
     * Validate payment type.
     *
     * These values must match the Prisma PaymentType enum.
     */
    const allowedPaymentTypes = [
      "PROMOTION",
      "SUBSCRIPTION",
      "VERIFICATION",
      "PROTECTED_TRADE",
      "OTHER",
    ];

    if (!allowedPaymentTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type.",
      });
    }

    /*
     * STEP 3
     * Normalize Kenyan phone number.
     *
     * Examples:
     *
     * 0712345678
     * 0112345678
     * +254712345678
     *
     * become:
     *
     * 254712345678
     */
    let normalizedPhone;

    try {
      normalizedPhone = normalizeMpesaPhone(phoneNumber);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    /*
     * STEP 4
     * If this payment belongs to a trade,
     * verify that the authenticated user is
     * actually a participant in that trade.
     */
    if (tradeId) {
      const trade = await prisma.trade.findUnique({
        where: {
          id: tradeId,
        },

        select: {
          id: true,
          traderAId: true,
          traderBId: true,
        },
      });

      if (!trade) {
        return res.status(404).json({
          success: false,
          message: "Trade not found.",
        });
      }

      if (
        trade.traderAId !== userId &&
        trade.traderBId !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to make a payment for this trade.",
        });
      }
    }

    /*
     * STEP 5
     * Convert amount to a whole-number KES amount.
     *
     * M-PESA STK Push accepts an integer amount.
     */
    const paymentAmount = Math.round(Number(amount));

    /*
     * STEP 6
     * Create the Payment record BEFORE calling
     * Safaricom.
     *
     * The initial status is PENDING.
     */
    const payment = await prisma.payment.create({
      data: {
        userId,
        tradeId: tradeId || null,

        amount: paymentAmount,
        currency: "KES",

        status: "PENDING",
        type,

        provider: "MPESA",
        phoneNumber: normalizedPhone,

        description:
          description?.trim() ||
          "Barter Trade M-PESA Payment",
      },
    });

    /*
     * STEP 7
     * Create a unique account reference.
     *
     * This makes it easier to identify the
     * payment in M-PESA and in callback logs.
     */
    const accountReference = `BT-${payment.id
      .replace(/-/g, "")
      .substring(0, 12)
      .toUpperCase()}`;

    /*
     * STEP 8
     * Send STK Push to Safaricom.
     */
    let stkResponse;

    try {
      stkResponse = await initiateStkPush({
        amount: paymentAmount,
        phoneNumber: normalizedPhone,
        accountReference,
        transactionDesc:
          description?.trim() ||
          "Barter Trade Payment",
      });
    } catch (error) {
      /*
       * Safaricom request failed.
       *
       * Update our Payment record so it does
       * not remain PENDING forever.
       */
      await prisma.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: "FAILED",
          resultDescription: error.message,
        },
      });

      return res.status(502).json({
        success: false,
        message: error.message,
        paymentId: payment.id,
      });
    }

    /*
     * STEP 9
     * Safaricom normally returns:
     *
     * ResponseCode
     * ResponseDescription
     * MerchantRequestID
     * CheckoutRequestID
     * CustomerMessage
     */
    const {
      ResponseCode,
      ResponseDescription,
      MerchantRequestID,
      CheckoutRequestID,
      CustomerMessage,
    } = stkResponse || {};

    /*
     * Safaricom may return an HTTP success response
     * but indicate that the STK request itself failed.
     */
    if (
      String(ResponseCode) !== "0" ||
      !CheckoutRequestID
    ) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: "FAILED",

          merchantRequestId:
            MerchantRequestID || null,

          checkoutRequestId:
            CheckoutRequestID || null,

          resultCode:
            ResponseCode !== undefined
              ? String(ResponseCode)
              : null,

          resultDescription:
            ResponseDescription ||
            CustomerMessage ||
            "M-PESA STK Push was not accepted.",
        },
      });

      return res.status(400).json({
        success: false,
        message:
          ResponseDescription ||
          CustomerMessage ||
          "Unable to initiate M-PESA payment.",

        paymentId: payment.id,
      });
    }

    /*
     * STEP 10
     * Save Safaricom identifiers.
     *
     * The callback will later use the
     * CheckoutRequestID to locate this payment.
     */
    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        merchantRequestId:
          MerchantRequestID || null,

        checkoutRequestId:
          CheckoutRequestID,

        resultCode:
          ResponseCode !== undefined
            ? String(ResponseCode)
            : null,

        resultDescription:
          ResponseDescription || null,
      },
    });

    /*
     * STEP 11
     * Return a clean response to React.
     *
     * The frontend should now tell the user
     * to check their phone and enter their
     * M-PESA PIN.
     */
    return res.status(201).json({
      success: true,

      message:
        CustomerMessage ||
        "STK Push sent successfully. Check your phone and enter your M-PESA PIN.",

      payment: {
        id: updatedPayment.id,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        status: updatedPayment.status,
        type: updatedPayment.type,
        phoneNumber: updatedPayment.phoneNumber,
        checkoutRequestId:
          updatedPayment.checkoutRequestId,
      },
    });
  } catch (error) {
    console.error(
      "INITIATE M-PESA PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to initiate M-PESA payment.",
    });
  }
};

/**
 * M-PESA STK PUSH CALLBACK
 * POST /api/payments/mpesa/callback
 *
 * Safaricom calls this endpoint after the customer
 * completes or cancels the STK Push request.
 *
 * IMPORTANT:
 * This endpoint must NOT use the `protect` middleware.
 * Safaricom is the caller.
 */
export const mpesaCallback = async (req, res) => {
  try {
    console.log("M-PESA CALLBACK RECEIVED:", JSON.stringify(req.body, null, 2));

    const stkCallback = req.body?.Body?.stkCallback;

    if (!stkCallback) {
      console.error("M-PESA CALLBACK: stkCallback not found.");

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received.",
      });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    /*
     * CheckoutRequestID is the most important identifier.
     *
     * We stored this when the STK Push was initiated.
     */
    if (!CheckoutRequestID) {
      console.error("M-PESA CALLBACK: CheckoutRequestID missing.");

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received.",
      });
    }

    /*
     * STEP 1
     * Find the payment using CheckoutRequestID.
     */
    const payment = await prisma.payment.findFirst({
      where: {
        checkoutRequestId: CheckoutRequestID,
      },
    });

    /*
     * Payment may not exist if:
     *
     * - the callback belongs to an unknown request
     * - the database record was removed
     * - credentials/environment were mixed up
     */
    if (!payment) {
      console.error("M-PESA CALLBACK: Payment not found for CheckoutRequestID:", CheckoutRequestID);

      /*
       * Still acknowledge the callback.
       */
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received.",
      });
    }

    /*
     * STEP 2
     * Idempotency protection.
     *
     * If the payment has already reached a final state,
     * do not process it again.
     */
    if (
      payment.status === "COMPLETED" ||
      payment.status === "FAILED" ||
      payment.status === "REFUNDED" ||
      payment.status === "CANCELLED"
    ) {
      console.log(`M-PESA CALLBACK: Payment ${payment.id} already has final status ${payment.status}.`);

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback already processed.",
      });
    }

    /*
     * STEP 3
     * Convert ResultCode to a string for consistent
     * storage in our Payment model.
     */
    const resultCode = ResultCode !== undefined && ResultCode !== null
        ? String(ResultCode)
        : null;

    /*
     * STEP 4
     * Extract callback metadata.
     *
     * Successful STK callbacks normally contain:
     *
     * Amount
     * MpesaReceiptNumber
     * TransactionDate
     * PhoneNumber
     */
    const metadataItems = CallbackMetadata?.Item || [];

    const metadata = {};

    for (const item of metadataItems) {
      if (!item?.Name) {
        continue;
      }

      metadata[item.Name] = item.Value;
    }

    const callbackAmount = metadata.Amount !== undefined
        ? Number(metadata.Amount)
        : null;

    const receiptNumber = metadata.MpesaReceiptNumber
        ? String(metadata.MpesaReceiptNumber)
        : null;

    const phoneNumber = metadata.PhoneNumber !== undefined
        ? String(metadata.PhoneNumber)
        : null;

    /*
     * STEP 5
     * Successful payment.
     *
     * Safaricom ResultCode 0 means the
     * customer completed the payment successfully.
     */
    if (ResultCode === 0 || resultCode === "0") {
      /*
       * Validate the callback amount when Safaricom
       * supplied it.
       *
       * This protects against accidentally marking
       * a payment as completed if the callback amount
       * does not match our original payment.
       */
      if (callbackAmount !== null && callbackAmount !== payment.amount) {
        console.error("M-PESA CALLBACK: Amount mismatch.",
          {
            paymentId: payment.id,
            expected: payment.amount,
            received: callbackAmount,
          }
        );

      const completedResult = await prisma.payment.updateMany({
            where: {
            id: payment.id,
            status: "PENDING",
            },

            data: {
            status: "COMPLETED",
            merchantRequestId: MerchantRequestID || null,
            checkoutRequestId: CheckoutRequestID,
            receiptNumber,
            resultCode,
            resultDescription: ResultDesc || "Payment completed successfully.",

            phoneNumber: phoneNumber || payment.phoneNumber,
            },
      });

        /*
        * Another callback already processed the payment.
        */
        if (completedResult.count === 0) {
        console.log( `M-PESA CALLBACK: Payment ${payment.id} was already processed.`);

        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Callback already processed.",
        });
        }

        console.log(
        `M-PESA PAYMENT COMPLETED: ${payment.id}`
        );

        return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received.",
        });
      }

      /*
       * Update payment to COMPLETED.
       */
      const completedPayment = await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: "COMPLETED",
            merchantRequestId: MerchantRequestID || null,
            checkoutRequestId: CheckoutRequestID,
            receiptNumber,
            resultCode,
            resultDescription: ResultDesc || "Payment completed successfully.",
            phoneNumber: phoneNumber || payment.phoneNumber,
          },
        });

      console.log(`M-PESA PAYMENT COMPLETED: ${completedPayment.id}`);

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received.",
      });
    }


    /*
    * Payment has successfully transitioned:
    *
    * PENDING → COMPLETED
    *
    * Now activate the paid feature.
    */
    if (payment.type === "PROMOTION") {
    try {
        const promotion =
        await activatePromotion(
            payment.id
        );

        console.log(
        `PROMOTION ACTIVATED: ${promotion.id}`
        );
    } catch (error) {
        /*
        * IMPORTANT:
        *
        * The M-PESA payment itself is already
        * COMPLETED.
        *
        * Therefore we must NOT change the
        * payment back to FAILED.
        *
        * Instead, log the activation problem
        * so it can be recovered.
        */
        console.error(
        "PROMOTION ACTIVATION ERROR:",
        error
        );
    }
    }


    const failedResult = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: "PENDING",
    },

        data: {
        status: "FAILED",
        merchantRequestId:  MerchantRequestID || null,
        checkoutRequestId: CheckoutRequestID,
        resultCode,
        resultDescription:ResultDesc || "M-PESA payment was not completed.",
        
        },
      });
      if (failedResult.count === 0) {
        console.log(
            `M-PESA CALLBACK: Payment ${payment.id} was already processed.`
        );

        return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback already processed.",
    });
    }

    console.log(
    `M-PESA PAYMENT FAILED: ${payment.id}`
    );

    return res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Callback received.",
    });
  } catch (error) {
    console.error( "M-PESA CALLBACK ERROR:", error);

    /*
     * IMPORTANT:
     *
     * We still acknowledge Safaricom.
     *
     * Your application error is logged for debugging.
     */
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Callback received.",
    });
  }
};

/**
 * GET PAYMENT DETAILS / STATUS
 * GET /api/payments/:id
 *
 * Returns one payment belonging to the
 * authenticated user.
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId,
      },

      select: {
        id: true,
        userId: true,

        tradeId: true,

        amount: true,
        currency: true,

        status: true,
        type: true,

        provider: true,
        phoneNumber: true,

        merchantRequestId: true,
        checkoutRequestId: true,

        receiptNumber: true,

        resultCode: true,
        resultDescription: true,

        description: true,

        createdAt: true,
        updatedAt: true,

        trade: {
          select: {
            id: true,
            tradeNumber: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error(
      "GET PAYMENT STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve payment status.",
    });
  }
};

/**
 * GET MY PAYMENT HISTORY
 * GET /api/payments
 *
 * Returns payments belonging only to the
 * authenticated user.
 *
 * Supports pagination:
 *
 * /api/payments?page=1&limit=10
 */
export const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    /*
     * Pagination
     */
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = Number.parseInt( req.query.limit, 10) || 10;

    /*
     * Prevent users from requesting an
     * unnecessarily large number of records.
     */
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const skip = (page - 1) * limit;

    /*
     * Optional status filter.
     *
     * Example:
     *
     * /api/payments?status=COMPLETED
     */
    const status = req.query.status?.trim();

    const allowedStatuses = [
      "PENDING",
      "COMPLETED",
      "FAILED",
      "REFUNDED",
      "CANCELLED",
    ];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }

    /*
     * Optional payment type filter.
     */
    const type = req.query.type?.trim();

    const allowedTypes = [
      "PROMOTION",
      "SUBSCRIPTION",
      "VERIFICATION",
      "PROTECTED_TRADE",
      "OTHER",
    ];

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type.",
      });
    }

    /*
     * Build filters.
     */
    const where = {
      userId,

      ...(status
        ? {
            status,
          }
        : {}),

      ...(type
        ? {
            type,
          }
        : {}),
    };

    /*
     * Fetch payments and total count together.
     */
    const [payments, total] = await prisma.$transaction([
        prisma.payment.findMany({
          where,

          orderBy: {
            createdAt: "desc",
          },

          skip,
          take: limit,

          select: {
            id: true,
            tradeId: true,

            amount: true,
            currency: true,

            status: true,
            type: true,

            provider: true,
            phoneNumber: true,

            merchantRequestId: true,
            checkoutRequestId: true,

            receiptNumber: true,

            resultCode: true,
            resultDescription: true,

            description: true,

            createdAt: true,
            updatedAt: true,
          },
        }),

        prisma.payment.count({
          where,
        }),
      ]);

    const totalPages = total === 0
        ? 0
        : Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {console.error( "GET PAYMENT HISTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve payment history.",
    });
  }
};



