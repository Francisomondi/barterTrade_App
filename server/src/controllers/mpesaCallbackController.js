import prisma from "../config/prisma.js";

/**
 * =========================================================
 * M-PESA PROMOTION CALLBACK
 * POST /api/mpesa/promotions/callback
 * =========================================================
 *
 * Called by Safaricom after an STK Push has been processed.
 *
 * IMPORTANT:
 * This endpoint must NOT use normal user authentication.
 */
export const promotionPaymentCallback =
  async (req, res) => {
    try {
      console.log(
        "M-PESA PROMOTION CALLBACK:",
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      const stkCallback =
        req.body?.Body?.stkCallback;

      // ---------------------------------------------------
      // 1. Validate callback
      // ---------------------------------------------------

      if (!stkCallback) {
        console.error(
          "Invalid M-PESA callback payload."
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback received.",
          });
      }

      const {
        MerchantRequestID,
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata,
      } = stkCallback;

      if (!CheckoutRequestID) {
        console.error(
          "M-PESA callback missing CheckoutRequestID."
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback received.",
          });
      }

      // ---------------------------------------------------
      // 2. Find payment
      // ---------------------------------------------------

      const payment =
        await prisma.payment.findFirst({
          where: {
            checkoutRequestId:
              CheckoutRequestID,

            type: "PROMOTION",
          },

          include: {
            promotion: true,
          },
        });

      if (!payment) {
        console.error(
          `Promotion payment not found for CheckoutRequestID: ${CheckoutRequestID}`
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback received.",
          });
      }

      // ---------------------------------------------------
      // 3. Idempotency
      // ---------------------------------------------------

      if (
        payment.status ===
        "COMPLETED"
      ) {
        console.log(
          `Payment ${payment.id} has already been completed.`
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,

            ResultDesc:
              "Callback already processed.",
          });
      }

      // ---------------------------------------------------
      // 4. Failed/cancelled M-PESA result
      // ---------------------------------------------------

      if (
        Number(ResultCode) !== 0
      ) {
        /**
         * If this payment somehow became COMPLETED
         * between the initial query and this point,
         * don't downgrade it.
         */
        const currentPayment =
          await prisma.payment.findUnique({
            where: {
              id: payment.id,
            },

            select: {
              status: true,
            },
          });

        if (
          currentPayment?.status ===
          "COMPLETED"
        ) {
          return res
            .status(200)
            .json({
              ResultCode: 0,

              ResultDesc:
                "Callback already processed.",
            });
        }

        const paymentStatus =
          Number(ResultCode) ===
          1032
            ? "CANCELLED"
            : "FAILED";

        await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status:
              paymentStatus,

            merchantRequestId:
              MerchantRequestID ||
              payment.merchantRequestId,

            resultCode:
              String(ResultCode),

            resultDescription:
              ResultDesc ||
              "M-PESA payment failed.",
          },
        });

        console.log(
          `Promotion payment ${payment.id} marked ${paymentStatus}.`
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,

            ResultDesc:
              "Callback processed successfully.",
          });
      }

      // ---------------------------------------------------
      // 5. Extract successful-payment metadata
      // ---------------------------------------------------

      const metadataItems =
        CallbackMetadata?.Item ||
        [];

      const metadata = {};

      for (
        const item of
        metadataItems
      ) {
        if (item?.Name) {
          metadata[item.Name] =
            item.Value;
        }
      }

      const mpesaReceiptNumber =
        metadata.MpesaReceiptNumber ||
        null;

      const paidAmount =
        metadata.Amount !==
        undefined
          ? Number(
              metadata.Amount
            )
          : null;

      const callbackPhoneNumber =
        metadata.PhoneNumber !==
        undefined
          ? String(
              metadata.PhoneNumber
            )
          : payment.phoneNumber;

      // ---------------------------------------------------
      // 6. Validate successful amount
      // ---------------------------------------------------

      if (
        paidAmount !== null &&
        Number(paidAmount) !==
          Number(payment.amount)
      ) {
        console.error(
          `Payment amount mismatch. Expected ${payment.amount}, received ${paidAmount}.`
        );

        await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: "FAILED",

            merchantRequestId:
              MerchantRequestID ||
              payment.merchantRequestId,

            resultCode:
              String(ResultCode),

            resultDescription:
              `Payment amount mismatch. Expected ${payment.amount} ${payment.currency}, received ${paidAmount}.`,
          },
        });

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback processed.",
          });
      }

      // ---------------------------------------------------
      // 7. Promotion must exist
      // ---------------------------------------------------

      if (!payment.promotion) {
        console.error(
          `Payment ${payment.id} does not have a promotion.`
        );

        await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: "FAILED",

            merchantRequestId:
              MerchantRequestID ||
              payment.merchantRequestId,

            resultCode:
              String(ResultCode),

            resultDescription:
              "Payment succeeded but promotion record was not found.",
          },
        });

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback processed.",
          });
      }

      // ---------------------------------------------------
      // 8. Calculate promotion dates
      // ---------------------------------------------------

      const startsAt =
        new Date();

      const endsAt =
        new Date(startsAt);

      endsAt.setDate(
        endsAt.getDate() +
          payment.promotion
            .durationDays
      );

      // ---------------------------------------------------
      // 9. Complete payment + activate promotion
      // ---------------------------------------------------

      const transactionResult =
        await prisma.$transaction(
          async (tx) => {
            /**
             * Re-read the payment inside the transaction.
             *
             * This reduces the chance of processing the
             * same payment twice concurrently.
             */
            const currentPayment =
              await tx.payment.findUnique({
                where: {
                  id: payment.id,
                },

                select: {
                  id: true,
                  status: true,
                },
              });

            if (!currentPayment) {
              throw new Error(
                "Payment disappeared during callback processing."
              );
            }

            if (
              currentPayment.status ===
              "COMPLETED"
            ) {
              return {
                alreadyProcessed:
                  true,

                activated: false,
              };
            }

            // ---------------------------------------------
            // Complete THIS real M-PESA payment
            // ---------------------------------------------

            await tx.payment.update({
              where: {
                id: payment.id,
              },

              data: {
                status:
                  "COMPLETED",

                merchantRequestId:
                  MerchantRequestID ||
                  payment.merchantRequestId,

                receiptNumber:
                  mpesaReceiptNumber,

                phoneNumber:
                  callbackPhoneNumber,

                resultCode:
                  String(
                    ResultCode
                  ),

                resultDescription:
                  ResultDesc ||
                  "M-PESA payment completed successfully.",
              },
            });

            /**
             * Close other locally PENDING payment
             * attempts for this promotion.
             *
             * They are no longer required because
             * one payment has succeeded.
             */
            await tx.payment.updateMany({
              where: {
                promotionId:
                  payment.promotion.id,

                id: {
                  not: payment.id,
                },

                status:
                  "PENDING",
              },

              data: {
                status:
                  "CANCELLED",

                resultDescription:
                  "Another payment attempt successfully activated this promotion.",
              },
            });

            /**
             * Activate ONLY if still PENDING.
             *
             * If a previous payment already activated
             * this promotion, startsAt/endsAt are not
             * reset.
             */
            const activation =
              await tx.promotion.updateMany({
                where: {
                  id:
                    payment
                      .promotion.id,

                  status:
                    "PENDING",
                },

                data: {
                  status:
                    "ACTIVE",

                  startsAt,
                  endsAt,
                },
              });

            return {
              alreadyProcessed:
                false,

              activated:
                activation.count >
                0,
            };
          }
        );

      // ---------------------------------------------------
      // 10. Logging
      // ---------------------------------------------------

      if (
        transactionResult
          .alreadyProcessed
      ) {
        console.log(
          `Payment ${payment.id} was already processed.`
        );
      } else if (
        transactionResult.activated
      ) {
        console.log(
          `Payment ${payment.id} completed and promotion ${payment.promotion.id} activated successfully.`
        );
      } else {
        /**
         * This can happen when an older STK request
         * succeeds after another payment has already
         * activated the promotion.
         *
         * We preserve the successful payment record,
         * but DO NOT restart/extend the promotion.
         */
        console.warn(
          `Payment ${payment.id} completed, but promotion ${payment.promotion.id} was already activated or is no longer pending.`
        );
      }

      return res
        .status(200)
        .json({
          ResultCode: 0,

          ResultDesc:
            "Callback processed successfully.",
        });
    } catch (error) {
      console.error(
        "M-PESA PROMOTION CALLBACK ERROR:",
        error
      );

      /**
       * Always acknowledge Safaricom callback.
       */
      return res
        .status(200)
        .json({
          ResultCode: 0,
          ResultDesc:
            "Callback received.",
        });
    }
  };