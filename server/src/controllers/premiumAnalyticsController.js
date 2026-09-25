import prisma from "../config/prisma.js";

import {
  hasAdvancedAnalytics,
} from "../services/premiumEntitlementService.js";

/*
 * ============================================================
 * GET PREMIUM ACCOUNT ANALYTICS
 * GET /api/premium-analytics
 * ============================================================
 *
 * IMPORTANT:
 *
 * 1. Views/clicks are PROMOTION analytics only.
 *    Organic listing views are not currently tracked.
 *
 * 2. Promotion spend is calculated from COMPLETED
 *    PROMOTION payments only.
 *
 * 3. This controller performs its own Premium entitlement
 *    check in addition to route-level Premium protection.
 * ============================================================
 */

export const getPremiumAnalytics =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      /*
       * ------------------------------------------------------
       * Verify Premium analytics entitlement
       * ------------------------------------------------------
       */

      const allowed =
        await hasAdvancedAnalytics(
          userId
        );

      if (!allowed) {
        return res
          .status(403)
          .json({
            success: false,

            code:
              "PREMIUM_REQUIRED",

            message:
              "Advanced listing analytics requires BarterTrade Premium.",
          });
      }

      /*
       * ------------------------------------------------------
       * Load user's listings
       * ------------------------------------------------------
       */

      const listings =
        await prisma.listing.findMany({
          where: {
            userId,
          },

          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,

            /*
             * ------------------------------------------------
             * Listing image
             * ------------------------------------------------
             */

            images: {
              orderBy: {
                sortOrder: "asc",
              },

              take: 1,

              select: {
                url: true,
                isPrimary: true,
              },
            },

            /*
             * ------------------------------------------------
             * Offers received
             * ------------------------------------------------
             */

            offersReceived: {
              select: {
                id: true,
                status: true,
                createdAt: true,
              },
            },

            /*
             * ------------------------------------------------
             * Promotions
             * ------------------------------------------------
             */

            promotions: {
              select: {
                id: true,
                type: true,
                status: true,
                amount: true,
                currency: true,
                startsAt: true,
                endsAt: true,
                createdAt: true,

                /*
                 * Promotion-generated views/clicks
                 */

                analyticsEvents: {
                  select: {
                    id: true,
                    type: true,
                    createdAt: true,
                  },
                },

                /*
                 * Actual successful promotion payments.
                 *
                 * Failed, cancelled and pending M-PESA
                 * attempts are deliberately excluded.
                 */

                payments: {
                  where: {
                    type:
                      "PROMOTION",

                    status:
                      "COMPLETED",
                  },

                  select: {
                    id: true,
                    amount: true,
                    currency: true,
                    createdAt: true,
                  },
                },
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      /*
       * ------------------------------------------------------
       * Per-listing analytics
       * ------------------------------------------------------
       */

      const listingAnalytics =
        listings.map(
          (listing) => {
            const promotions =
              listing.promotions ||
              [];

            /*
             * ------------------------------------------------
             * Promotion events
             * ------------------------------------------------
             */

            const events =
              promotions.flatMap(
                (promotion) =>
                  promotion
                    .analyticsEvents ||
                  []
              );

            const promotionViews =
              events.filter(
                (event) =>
                  event.type ===
                  "VIEW"
              ).length;

            const promotionClicks =
              events.filter(
                (event) =>
                  event.type ===
                  "CLICK"
              ).length;

            /*
             * ------------------------------------------------
             * Offers
             * ------------------------------------------------
             */

            const offers =
              listing
                .offersReceived ||
              [];

            const offersReceived =
              offers.length;

            const pendingOffers =
              offers.filter(
                (offer) =>
                  offer.status ===
                  "PENDING"
              ).length;

            const acceptedOffers =
              offers.filter(
                (offer) =>
                  offer.status ===
                  "ACCEPTED"
              ).length;

            /*
             * ------------------------------------------------
             * Promotion click-through rate
             *
             * clicks / promotion views
             * ------------------------------------------------
             */

            const promotionCtr =
              promotionViews > 0
                ? Number(
                    (
                      (
                        promotionClicks /
                        promotionViews
                      ) *
                      100
                    ).toFixed(2)
                  )
                : 0;

            /*
             * ------------------------------------------------
             * Click -> offer rate
             *
             * This tells the seller how many promotion clicks
             * resulted in an offer being received.
             * ------------------------------------------------
             */

            const clickToOfferRate =
              promotionClicks > 0
                ? Number(
                    (
                      (
                        offersReceived /
                        promotionClicks
                      ) *
                      100
                    ).toFixed(2)
                  )
                : 0;

            /*
             * ------------------------------------------------
             * Offer conversion
             *
             * accepted offers / offers received
             * ------------------------------------------------
             */

            const offerConversionRate =
              offersReceived > 0
                ? Number(
                    (
                      (
                        acceptedOffers /
                        offersReceived
                      ) *
                      100
                    ).toFixed(2)
                  )
                : 0;

            /*
             * ------------------------------------------------
             * Actual promotion spend
             *
             * IMPORTANT:
             * Use completed Payment.amount.
             *
             * Do NOT use Promotion.amount because:
             * - payment may have failed
             * - payment may have been cancelled
             * - Premium discount may have changed final price
             * ------------------------------------------------
             */

            const promotionSpend =
              promotions.reduce(
                (
                  total,
                  promotion
                ) => {
                  const completedSpend =
                    (
                      promotion
                        .payments ||
                      []
                    ).reduce(
                      (
                        paymentTotal,
                        payment
                      ) =>
                        paymentTotal +
                        Number(
                          payment.amount ||
                            0
                        ),
                      0
                    );

                  return (
                    total +
                    completedSpend
                  );
                },
                0
              );

            /*
             * ------------------------------------------------
             * Promotions successfully paid for
             *
             * This is more meaningful than simply counting
             * every PENDING/FAILED promotion record.
             * ------------------------------------------------
             */

            const promotionsUsed =
              promotions.filter(
                (promotion) =>
                  (
                    promotion
                      .payments ||
                    []
                  ).length > 0
              ).length;

            /*
             * ------------------------------------------------
             * Return listing analytics
             * ------------------------------------------------
             */

            return {
              listingId:
                listing.id,

              title:
                listing.title,

              status:
                listing.status,

              createdAt:
                listing.createdAt,

              image:
                listing
                  .images?.[0]
                  ?.url ||
                null,

              promotionViews,

              promotionClicks,

              promotionCtr,

              offersReceived,

              pendingOffers,

              acceptedOffers,

              clickToOfferRate,

              offerConversionRate,

              promotionsUsed,

              promotionSpend:
                Number(
                  promotionSpend.toFixed(
                    2
                  )
                ),
            };
          }
        );

      /*
       * ------------------------------------------------------
       * Account totals
       * ------------------------------------------------------
       */

      const totals =
        listingAnalytics.reduce(
          (
            accumulator,
            listing
          ) => {
            accumulator.promotionViews +=
              listing.promotionViews;

            accumulator.promotionClicks +=
              listing.promotionClicks;

            accumulator.offersReceived +=
              listing.offersReceived;

            accumulator.pendingOffers +=
              listing.pendingOffers;

            accumulator.acceptedOffers +=
              listing.acceptedOffers;

            accumulator.promotionsUsed +=
              listing.promotionsUsed;

            accumulator.promotionSpend +=
              listing.promotionSpend;

            return accumulator;
          },
          {
            promotionViews: 0,
            promotionClicks: 0,
            offersReceived: 0,
            pendingOffers: 0,
            acceptedOffers: 0,
            promotionsUsed: 0,
            promotionSpend: 0,
          }
        );

      /*
       * ------------------------------------------------------
       * Account promotion CTR
       * ------------------------------------------------------
       */

      const accountPromotionCtr =
        totals.promotionViews > 0
          ? Number(
              (
                (
                  totals.promotionClicks /
                  totals.promotionViews
                ) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
       * ------------------------------------------------------
       * Account click -> offer rate
       * ------------------------------------------------------
       */

      const accountClickToOfferRate =
        totals.promotionClicks > 0
          ? Number(
              (
                (
                  totals.offersReceived /
                  totals.promotionClicks
                ) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
       * ------------------------------------------------------
       * Account offer conversion rate
       * ------------------------------------------------------
       */

      const accountOfferConversionRate =
        totals.offersReceived > 0
          ? Number(
              (
                (
                  totals.acceptedOffers /
                  totals.offersReceived
                ) *
                100
              ).toFixed(2)
            )
          : 0;

      /*
       * ------------------------------------------------------
       * Listing status totals
       * ------------------------------------------------------
       */

      const activeListings =
        listings.filter(
          (listing) =>
            listing.status ===
            "ACTIVE"
        ).length;

      const completedListings =
        listings.filter(
          (listing) =>
            [
              "TRADED",
              "SOLD",
            ].includes(
              listing.status
            )
        ).length;

      /*
       * ------------------------------------------------------
       * Response
       * ------------------------------------------------------
       */

      return res
        .status(200)
        .json({
          success: true,

          tier:
            "PREMIUM",

          summary: {
            totalListings:
              listings.length,

            activeListings,

            completedListings,

            promotionViews:
              totals.promotionViews,

            promotionClicks:
              totals.promotionClicks,

            promotionCtr:
              accountPromotionCtr,

            offersReceived:
              totals.offersReceived,

            pendingOffers:
              totals.pendingOffers,

            acceptedOffers:
              totals.acceptedOffers,

            clickToOfferRate:
              accountClickToOfferRate,

            offerConversionRate:
              accountOfferConversionRate,

            promotionsUsed:
              totals.promotionsUsed,

            promotionSpend:
              Number(
                totals.promotionSpend.toFixed(
                  2
                )
              ),

            currency:
              "KES",
          },

          listings:
            listingAnalytics,

          /*
           * --------------------------------------------------
           * Metadata prevents frontend labels from being
           * misleading.
           * --------------------------------------------------
           */

          metadata: {
            viewsDefinition:
              "Promotion-generated views only.",

            clicksDefinition:
              "Promotion-generated clicks only.",

            clickToOfferDefinition:
              "Offers received divided by promotion clicks.",

            offerConversionDefinition:
              "Accepted offers divided by offers received.",

            spendDefinition:
              "Completed promotion payments only.",
          },
        });
    } catch (error) {
      console.error(
        "PREMIUM ANALYTICS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load Premium analytics.",
        });
    }
  };