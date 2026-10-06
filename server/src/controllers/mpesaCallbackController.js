import prisma from "../config/prisma.js";

import {
  activateSubscription,
  activateSubscriptionWithTx,
} from "../services/subscriptionActivationService.js";

/*
 * ============================================================
 * CENTRAL M-PESA CALLBACK
 * ============================================================
 *
 * Handles:
 *
 * PROMOTION
 * SUBSCRIPTION
 * VERIFICATION
 * PROTECTED_TRADE
 *
 * IMPORTANT:
 *
 * Safaricom calls this endpoint directly.
 * Do not protect this route using normal user authentication.
 */

export const promotionPaymentCallback =
  async (req, res) => {
    try {
      console.log(
        "M-PESA PAYMENT CALLBACK:",
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      const stkCallback =
        req.body?.Body?.stkCallback;

      /*
       * ------------------------------------------------------------
       * VALIDATE CALLBACK BODY
       * ------------------------------------------------------------
       */

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

      if (
        !CheckoutRequestID
      ) {
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

      /*
       * ------------------------------------------------------------
       * FIND PAYMENT
       * ------------------------------------------------------------
       *
       * Do NOT restrict this to PENDING.
       *
       * A payment locally marked CANCELLED can still later receive
       * a genuine successful callback from Safaricom.
       */

      const payment =
        await prisma.payment.findFirst(
          {
            where: {
              checkoutRequestId:
                CheckoutRequestID,
            },

            include: {
              promotion:
                true,

              subscription:
                true,
            },
          }
        );

      if (!payment) {
        console.error(
          `Payment not found for CheckoutRequestID: ${CheckoutRequestID}`
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback received.",
          });
      }

      console.log(
        `M-PESA callback matched payment ${payment.id} (${payment.type}).`
      );

      /*
       * ------------------------------------------------------------
       * ALREADY COMPLETED
       * ------------------------------------------------------------
       */

      if (
        payment.status ===
        "COMPLETED"
      ) {
        console.log(
          `Payment ${payment.id} has already been completed.`
        );

        /*
         * Recovery path for subscriptions.
         *
         * This covers older/incomplete states where Payment became
         * COMPLETED but Subscription remained PENDING.
         *
         * activateSubscription() is expected to be idempotent.
         */
        if (
          payment.type ===
            "SUBSCRIPTION" &&
          payment.subscriptionId
        ) {
          try {
            await activateSubscription({
              subscriptionId:
                payment.subscriptionId,

              paymentId:
                payment.id,
            });
          } catch (
            activationError
          ) {
            console.error(
              "SUBSCRIPTION RECOVERY ACTIVATION ERROR:",
              activationError
            );
          }
        }

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback already processed.",
          });
      }

      /*
       * ------------------------------------------------------------
       * FAILED / CANCELLED STK
       * ------------------------------------------------------------
       */

      if (
        Number(ResultCode) !==
        0
      ) {
        /*
         * Re-read status to protect against callback races.
         */
        const currentPayment =
          await prisma.payment.findUnique(
            {
              where: {
                id:
                  payment.id,
              },

              select: {
                status:
                  true,
              },
            }
          );

        if (
          currentPayment
            ?.status ===
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

        /*
         * 1032 = user cancelled STK prompt.
         */
        const paymentStatus =
          Number(
            ResultCode
          ) === 1032
            ? "CANCELLED"
            : "FAILED";

        await prisma.payment.update(
          {
            where: {
              id:
                payment.id,
            },

            data: {
              status:
                paymentStatus,

              merchantRequestId:
                MerchantRequestID ||
                payment.merchantRequestId,

              resultCode:
                String(
                  ResultCode
                ),

              resultDescription:
                ResultDesc ||
                "M-PESA payment failed.",
            },
          }
        );

        console.log(
          `${payment.type} payment ${payment.id} marked ${paymentStatus}.`
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback processed successfully.",
          });
      }

      /*
       * ------------------------------------------------------------
       * EXTRACT SUCCESS METADATA
       * ------------------------------------------------------------
       */

      const metadataItems =
        CallbackMetadata
          ?.Item ||
        [];

      const metadata = {};

      for (
        const item of
        metadataItems
      ) {
        if (item?.Name) {
          metadata[
            item.Name
          ] =
            item.Value;
        }
      }

      const mpesaReceiptNumber =
        metadata
          .MpesaReceiptNumber ||
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

      /*
       * ------------------------------------------------------------
       * AMOUNT VALIDATION
       * ------------------------------------------------------------
       *
       * If Safaricom says the payment succeeded but the amount
       * differs from what our Payment row expected:
       *
       * Payment = COMPLETED
       *
       * but DO NOT activate the entitlement.
       *
       * This preserves financial truth while preventing accidental
       * activation.
       */

      if (
        paidAmount !== null &&
        Number(
          paidAmount
        ) !==
          Number(
            payment.amount
          )
      ) {
        console.error(
          `Payment amount mismatch. Expected ${payment.amount}, received ${paidAmount}.`
        );

        await prisma.payment.update(
          {
            where: {
              id:
                payment.id,
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
                `M-PESA payment completed, but the amount requires manual reconciliation. Expected ${payment.amount} ${payment.currency}, received ${paidAmount}. Entitlement was not activated.`,
            },
          }
        );

        console.error(
          `Payment ${payment.id} completed financially but has an amount mismatch. Manual reconciliation required.`
        );

        return res
          .status(200)
          .json({
            ResultCode: 0,
            ResultDesc:
              "Callback processed.",
          });
      }

      /*
       * ============================================================
       * PAYMENT TYPE
       * ============================================================
       */

      switch (
        payment.type
      ) {
        /*
         * ==========================================================
         * PROMOTION
         * ==========================================================
         */

        case "PROMOTION": {
          if (
            !payment.promotion
          ) {
            console.error(
              `Payment ${payment.id} does not have a promotion.`
            );

            /*
             * Financial payment succeeded.
             *
             * Keep COMPLETED, but do not invent an entitlement.
             */
            await prisma.payment.update(
              {
                where: {
                  id:
                    payment.id,
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
                    "M-PESA payment completed, but the promotion record could not be found. Manual reconciliation required.",
                },
              }
            );

            console.error(
              `Promotion payment ${payment.id} requires manual reconciliation.`
            );

            break;
          }

          const startsAt =
            new Date();

          const endsAt =
            new Date(
              startsAt
            );

          endsAt.setDate(
            endsAt.getDate() +
              payment
                .promotion
                .durationDays
          );

          /*
           * Payment completion and promotion activation happen in
           * the same Prisma transaction.
           */
          const transactionResult =
            await prisma.$transaction(
              async (tx) => {
                const currentPayment =
                  await tx.payment.findUnique(
                    {
                      where: {
                        id:
                          payment.id,
                      },

                      select: {
                        id: true,
                        status:
                          true,
                      },
                    }
                  );

                if (
                  !currentPayment
                ) {
                  throw new Error(
                    "Payment disappeared during callback processing."
                  );
                }

                /*
                 * Duplicate callback.
                 */
                if (
                  currentPayment
                    .status ===
                  "COMPLETED"
                ) {
                  return {
                    alreadyProcessed:
                      true,

                    activated:
                      false,
                  };
                }

                /*
                 * Complete financial transaction.
                 */
                await tx.payment.update(
                  {
                    where: {
                      id:
                        payment.id,
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
                  }
                );

                /*
                 * Cancel other still-pending payment attempts for
                 * the same promotion.
                 */
                await tx.payment.updateMany(
                  {
                    where: {
                      promotionId:
                        payment
                          .promotion
                          .id,

                      id: {
                        not:
                          payment.id,
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
                  }
                );

                /*
                 * Only PENDING promotions can be activated.
                 *
                 * A late callback therefore cannot restart or extend
                 * an already-active promotion.
                 */
                const activation =
                  await tx.promotion.updateMany(
                    {
                      where: {
                        id:
                          payment
                            .promotion
                            .id,

                        status:
                          "PENDING",
                      },

                      data: {
                        status:
                          "ACTIVE",

                        startsAt,

                        endsAt,
                      },
                    }
                  );

                return {
                  alreadyProcessed:
                    false,

                  activated:
                    activation.count >
                    0,
                };
              }
            );

          if (
            transactionResult
              .alreadyProcessed
          ) {
            console.log(
              `Promotion payment ${payment.id} was already processed.`
            );
          } else if (
            transactionResult
              .activated
          ) {
            console.log(
              `Payment ${payment.id} completed and promotion ${payment.promotion.id} activated successfully.`
            );
          } else {
            console.warn(
              `Payment ${payment.id} completed, but promotion ${payment.promotion.id} was already active or is no longer pending.`
            );
          }

          break;
        }

        /*
         * ==========================================================
         * SUBSCRIPTION
         * ==========================================================
         */

        case "SUBSCRIPTION": {
          if (!payment.subscription) {
            console.error(
              `Payment ${payment.id} does not have a subscription.`
            );

            /*
            * Financially successful, but the entitlement relation
            * cannot be resolved.
            */
            await prisma.payment.update({
              where: {
                id: payment.id,
              },

              data: {
                status: "COMPLETED",

                merchantRequestId:
                  MerchantRequestID ||
                  payment.merchantRequestId,

                receiptNumber:
                  mpesaReceiptNumber,

                phoneNumber:
                  callbackPhoneNumber,

                resultCode:
                  String(ResultCode),

                resultDescription:
                  "M-PESA payment completed successfully, but the subscription record was not found. Manual reconciliation required.",
              },
            });

            console.error(
              `Subscription payment ${payment.id} completed financially but requires manual reconciliation.`
            );

            break;
          }

          /*
          * ========================================================
          * ATOMIC PAYMENT + SUBSCRIPTION ACTIVATION
          * ========================================================
          *
          * Payment COMPLETED and Subscription ACTIVE are committed
          * in the SAME Prisma transaction.
          */

          const transactionResult =
            await prisma.$transaction(
              async (tx) => {
                /*
                * --------------------------------------------------
                * RE-READ PAYMENT INSIDE TRANSACTION
                * --------------------------------------------------
                */

                const currentPayment =
                  await tx.payment.findUnique({
                    where: {
                      id: payment.id,
                    },

                    include: {
                      subscription: true,
                    },
                  });

                if (!currentPayment) {
                  throw new Error(
                    "Payment disappeared during callback processing."
                  );
                }

                if (!currentPayment.subscription) {
                  throw new Error(
                    "Subscription disappeared during callback processing."
                  );
                }

                /*
                * --------------------------------------------------
                * DUPLICATE CALLBACK / RECOVERY
                * --------------------------------------------------
                *
                * Safaricom may send the same callback more than once.
                *
                * If Payment is already COMPLETED, do not add another
                * subscription period.
                *
                * activateSubscriptionWithTx() is idempotent and can
                * safely recover a PENDING subscription if an earlier
                * callback completed the Payment but activation did
                * not finish.
                */

                if (
                  currentPayment.status ===
                  "COMPLETED"
                ) {
                  const recoveredSubscription =
                    await activateSubscriptionWithTx({
                      tx,

                      subscriptionId:
                        currentPayment.subscriptionId,

                      paymentId:
                        currentPayment.id,
                    });

                  return {
                    alreadyProcessed: true,

                    conflict: false,

                    subscription:
                      recoveredSubscription,
                  };
                }

                const now =
                  new Date();

                /*
                * ==================================================
                * SAME-PLAN SUBSCRIPTION / RENEWAL PROTECTION
                * ==================================================
                *
                * NORMAL PURCHASE
                * --------------------------------------------------
                *
                * A normal purchase must never create a second
                * currently-active entitlement for the same plan.
                *
                *
                * RENEWAL
                * --------------------------------------------------
                *
                * A renewal is explicitly identified using:
                *
                * subscription.renewalOfId
                *
                * This points to the subscription whose paid period
                * is being extended.
                *
                * IMPORTANT:
                *
                * We DO NOT require the renewal source to still be
                * ACTIVE when this callback arrives.
                *
                * Example:
                *
                * 11:57 PM - user initiates renewal
                * 11:59 PM - current subscription expires
                * 12:01 AM - Safaricom callback arrives
                *
                * That is still a legitimate renewal.
                */

                const subscriptionPlan =
                  currentPayment.subscription.plan;

                const renewalOfId =
                  currentPayment.subscription
                    .renewalOfId || null;

                const isRenewal =
                  Boolean(renewalOfId);

                /*
                * ==================================================
                * LOAD RENEWAL SOURCE DIRECTLY
                * ==================================================
                */

                let renewalSourceSubscription =
                  null;

                if (isRenewal) {
                  renewalSourceSubscription =
                    await tx.subscription.findFirst({
                      where: {
                        /*
                        * Must be the exact subscription referenced
                        * by renewalOfId.
                        */
                        id:
                          renewalOfId,

                        /*
                        * Prevent another user's subscription from
                        * ever being used as the renewal source.
                        */
                        userId:
                          currentPayment.userId,

                        /*
                        * PREMIUM can only renew PREMIUM.
                        *
                        * BUSINESS_PRO can only renew BUSINESS_PRO.
                        */
                        plan:
                          subscriptionPlan,
                      },

                      select: {
                        id: true,

                        userId: true,

                        plan: true,

                        status: true,

                        startsAt: true,

                        endsAt: true,
                      },
                    });

                  /*
                  * ------------------------------------------------
                  * INVALID RENEWAL SOURCE
                  * ------------------------------------------------
                  *
                  * Safaricom has genuinely confirmed the money.
                  *
                  * Therefore Payment must remain financial truth:
                  *
                  * COMPLETED
                  *
                  * But entitlement must NOT be invented when the
                  * renewal relationship cannot be verified.
                  */

                  if (
                    !renewalSourceSubscription
                  ) {
                    const completedPayment =
                      await tx.payment.update({
                        where: {
                          id:
                            currentPayment.id,
                        },

                        data: {
                          status:
                            "COMPLETED",

                          merchantRequestId:
                            MerchantRequestID ||
                            currentPayment
                              .merchantRequestId,

                          receiptNumber:
                            mpesaReceiptNumber,

                          phoneNumber:
                            callbackPhoneNumber,

                          resultCode:
                            String(
                              ResultCode
                            ),

                          resultDescription:
                            `M-PESA payment completed, but the ${subscriptionPlan} renewal source could not be verified. Manual reconciliation required.`,
                        },
                      });

                    return {
                      alreadyProcessed:
                        false,

                      conflict:
                        true,

                      renewalConflict:
                        true,

                      payment:
                        completedPayment,
                    };
                  }

                  /*
                  * ------------------------------------------------
                  * VERIFY SOURCE HAD A REAL SUBSCRIPTION PERIOD
                  * ------------------------------------------------
                  *
                  * A PENDING subscription that never received an
                  * entitlement must not be used as the source of a
                  * renewal.
                  */

                  if (
                    !renewalSourceSubscription
                      .startsAt ||
                    !renewalSourceSubscription
                      .endsAt
                  ) {
                    const completedPayment =
                      await tx.payment.update({
                        where: {
                          id:
                            currentPayment.id,
                        },

                        data: {
                          status:
                            "COMPLETED",

                          merchantRequestId:
                            MerchantRequestID ||
                            currentPayment
                              .merchantRequestId,

                          receiptNumber:
                            mpesaReceiptNumber,

                          phoneNumber:
                            callbackPhoneNumber,

                          resultCode:
                            String(
                              ResultCode
                            ),

                          resultDescription:
                            `M-PESA payment completed, but the ${subscriptionPlan} renewal source has no valid membership period. Manual reconciliation required.`,
                        },
                      });

                    return {
                      alreadyProcessed:
                        false,

                      conflict:
                        true,

                      renewalConflict:
                        true,

                      payment:
                        completedPayment,

                      renewalSourceSubscription,
                    };
                  }
                }

                /*
                * ==================================================
                * FIND CURRENT SAME-PLAN ENTITLEMENT
                * ==================================================
                *
                * Do not rely on:
                *
                * status === "ACTIVE"
                *
                * alone.
                *
                * A scheduled renewal can have ACTIVE database status
                * while its startsAt is still in the future.
                *
                * A currently usable entitlement therefore requires:
                *
                * status = ACTIVE
                * startsAt <= now
                * endsAt > now
                */

                const anotherActiveSubscription =
                  await tx.subscription.findFirst({
                    where: {
                      userId:
                        currentPayment.userId,

                      plan:
                        subscriptionPlan,

                      status:
                        "ACTIVE",

                      /*
                      * Exclude the subscription currently being
                      * activated by this payment.
                      */
                      id: {
                        not:
                          currentPayment
                            .subscriptionId,
                      },

                      startsAt: {
                        lte:
                          now,
                      },

                      endsAt: {
                        gt:
                          now,
                      },
                    },

                    select: {
                      id: true,

                      userId: true,

                      plan: true,

                      status: true,

                      startsAt: true,

                      endsAt: true,
                    },
                  });

                /*
                * ==================================================
                * RENEWAL CONFLICT PROTECTION
                * ==================================================
                *
                * If this is an explicit renewal AND another
                * same-plan subscription is currently providing the
                * entitlement, that subscription must be the exact
                * subscription referenced by renewalOfId.
                *
                * Example:
                *
                * renewalOfId = subscription A
                *
                * but
                *
                * current entitlement = subscription B
                *
                * That is suspicious/stale state.
                *
                * Record the successful financial payment, but do
                * NOT automatically grant another entitlement.
                */

                if (
                  isRenewal &&
                  anotherActiveSubscription &&
                  anotherActiveSubscription.id !==
                    renewalSourceSubscription.id
                ) {
                  const completedPayment =
                    await tx.payment.update({
                      where: {
                        id:
                          currentPayment.id,
                      },

                      data: {
                        status:
                          "COMPLETED",

                        merchantRequestId:
                          MerchantRequestID ||
                          currentPayment
                            .merchantRequestId,

                        receiptNumber:
                          mpesaReceiptNumber,

                        phoneNumber:
                          callbackPhoneNumber,

                        resultCode:
                          String(
                            ResultCode
                          ),

                        resultDescription:
                          `M-PESA payment completed, but another ${subscriptionPlan} subscription became active after this renewal was created. Manual reconciliation required.`,
                      },
                    });

                  return {
                    alreadyProcessed:
                      false,

                    conflict:
                      true,

                    renewalConflict:
                      true,

                    payment:
                      completedPayment,

                    activeSubscription:
                      anotherActiveSubscription,

                    renewalSourceSubscription,
                  };
                }

                /*
                * ==================================================
                * NORMAL DUPLICATE SUBSCRIPTION PROTECTION
                * ==================================================
                *
                * If renewalOfId is NULL, this is an ordinary
                * subscription purchase.
                *
                * Another currently-active same-plan subscription
                * therefore means this late callback must NOT grant
                * another entitlement.
                *
                * We still record Payment COMPLETED because Safaricom
                * genuinely collected the money.
                */

                if (
                  !isRenewal &&
                  anotherActiveSubscription
                ) {
                  const completedPayment =
                    await tx.payment.update({
                      where: {
                        id:
                          currentPayment.id,
                      },

                      data: {
                        status:
                          "COMPLETED",

                        merchantRequestId:
                          MerchantRequestID ||
                          currentPayment
                            .merchantRequestId,

                        receiptNumber:
                          mpesaReceiptNumber,

                        phoneNumber:
                          callbackPhoneNumber,

                        resultCode:
                          String(
                            ResultCode
                          ),

                        resultDescription:
                          `M-PESA payment completed after another ${subscriptionPlan} subscription had already become active. The subscription was not activated again. Manual reconciliation required.`,
                      },
                    });

                  return {
                    alreadyProcessed:
                      false,

                    conflict:
                      true,

                    renewalConflict:
                      false,

                    payment:
                      completedPayment,

                    activeSubscription:
                      anotherActiveSubscription,
                  };
                }

                /*
                * ==================================================
                * VALID RENEWAL
                * ==================================================
                *
                * At this point an explicit renewal has passed:
                *
                * - renewalOfId exists
                * - renewal source exists
                * - same user
                * - same plan
                * - source has startsAt
                * - source has endsAt
                * - no unrelated active subscription replaced it
                *
                * Notice that renewalSourceSubscription may now be
                * EXPIRED.
                *
                * That is intentional.
                *
                * It may have expired while Safaricom was processing
                * the payment.
                *
                * We therefore allow execution to continue.
                */

                if (isRenewal) {
                  console.log(
                    `Valid ${subscriptionPlan} renewal detected. Subscription ${currentPayment.subscriptionId} renews ${renewalSourceSubscription.id}.`
                  );
                }

                /*
                * ==================================================
                * COMPLETE PAYMENT
                * ==================================================
                *
                * We have now passed all entitlement safety checks.
                */

                await tx.payment.update({
                  where: {
                    id:
                      currentPayment.id,
                  },

                  data: {
                    status:
                      "COMPLETED",

                    merchantRequestId:
                      MerchantRequestID ||
                      currentPayment
                        .merchantRequestId,

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
                      "M-PESA subscription payment completed successfully.",
                  },
                });

                /*
                * ==================================================
                * ACTIVATE SUBSCRIPTION IN SAME TRANSACTION
                * ==================================================
                *
                * The activation service is responsible for the
                * subscription dates.
                *
                * NORMAL PURCHASE:
                *
                * startsAt = confirmation time
                *
                * RENEWAL BEFORE EXPIRY:
                *
                * startsAt = previousSubscription.endsAt
                *
                * RENEWAL AFTER SOURCE EXPIRED:
                *
                * startsAt = confirmation time
                *
                * This prevents the user from losing remaining paid
                * days while also preventing retroactive entitlement.
                */

                const activatedSubscription =
                  await activateSubscriptionWithTx({
                    tx,

                    subscriptionId:
                      currentPayment
                        .subscriptionId,

                    paymentId:
                      currentPayment.id,
                  });

                return {
                  alreadyProcessed:
                    false,

                  conflict:
                    false,

                  subscription:
                    activatedSubscription,
                };
              }
            );

          /*
          * Transaction has committed by the time execution
          * reaches here.
          */

          if (
            transactionResult.conflict
          ) {
            if (
              transactionResult
                .renewalConflict
            ) {
              console.warn(
                `Subscription renewal payment ${payment.id} completed, but the renewal could not be activated automatically. Manual reconciliation required.`
              );
            } else {
              console.warn(
                `Subscription payment ${payment.id} completed, but another subscription of the same plan is already active. Manual reconciliation required.`
              );
            }
          } else if (
            transactionResult
              .alreadyProcessed
          ) {
            console.log(
              `Subscription payment ${payment.id} had already been processed.`
            );
          } else {
            console.log(
              `Payment ${payment.id} completed and subscription ${transactionResult.subscription.id} activated atomically.`
            );
          }

          break;
        }

        /*
         * ==========================================================
         * VERIFICATION
         * ==========================================================
         */

        case "VERIFICATION": {
          console.warn(
            `Verification payment callback received for payment ${payment.id}, but verification processing has not been implemented yet.`
          );

          await prisma.payment.update(
            {
              where: {
                id:
                  payment.id,
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
                  "M-PESA verification payment completed successfully.",
              },
            }
          );

          break;
        }

        /*
         * ==========================================================
         * PROTECTED TRADE
         * ==========================================================
         */

        case "PROTECTED_TRADE": {
          console.warn(
            `Protected Trade payment callback received for payment ${payment.id}, but Protected Trade activation has not been implemented yet.`
          );

          await prisma.payment.update(
            {
              where: {
                id:
                  payment.id,
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
                  "M-PESA Protected Trade payment completed successfully.",
              },
            }
          );

          break;
        }

        /*
         * ==========================================================
         * UNKNOWN PAYMENT TYPE
         * ==========================================================
         */

        default: {
          console.error(
            `Unsupported payment type "${payment.type}" for payment ${payment.id}.`
          );

          /*
           * M-Pesa genuinely confirmed the money.
           *
           * Keep the financial event COMPLETED and flag the
           * application entitlement for manual processing.
           */
          await prisma.payment.update(
            {
              where: {
                id:
                  payment.id,
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
                  `Payment completed successfully, but payment type "${payment.type}" requires manual processing.`,
              },
            }
          );

          break;
        }
      }

      /*
       * ------------------------------------------------------------
       * ACKNOWLEDGE SAFARICOM
       * ------------------------------------------------------------
       */

      return res
        .status(200)
        .json({
          ResultCode: 0,
          ResultDesc:
            "Callback processed successfully.",
        });
    } catch (error) {
      console.error(
        "M-PESA PAYMENT CALLBACK ERROR:",
        error
      );

      /*
       * Always acknowledge receipt to Safaricom.
       *
       * Application errors should be logged/monitored and manually
       * reconciled rather than causing uncontrolled callback loops.
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