import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import prisma from "./prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,

      callbackURL:
        process.env.GOOGLE_CALLBACK_URL,
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        const email =
          profile.emails?.[0]?.value
            ?.toLowerCase()
            .trim();

        if (!email) {
          return done(
            new Error(
              "Google account does not have an email."
            ),
            null
          );
        }

        console.log(
          "GOOGLE LOGIN:",
          email
        );

        let user =
          await prisma.user.findUnique({
            where: {
              email,
            },
          });

        /*
        |--------------------------------------------------------------------------
        | CREATE NEW GOOGLE USER
        |--------------------------------------------------------------------------
        */

        if (!user) {
          user =
            await prisma.user.create({
              data: {
                name:
                  profile.displayName ||
                  profile.name?.givenName ||
                  "BarterConnect User",

                email,

                avatar:
                  profile.photos?.[0]?.value ||
                  null,

                googleId: profile.id,

                authProvider: "GOOGLE",

                /*
                 * Password intentionally omitted.
                 *
                 * User can create one later using
                 * Forgot Password.
                 */
              },
            });

          console.log(
            "GOOGLE USER CREATED:",
            user.email
          );
        }

        /*
        |--------------------------------------------------------------------------
        | EXISTING USER
        |--------------------------------------------------------------------------
        */

        else {
          const updates = {};

          /*
           * Connect Google ID if it isn't already
           * associated with this account.
           */
          if (
            !user.googleId
          ) {
            updates.googleId =
              profile.id;
          }

          /*
           * Update missing avatar.
           */
          if (
            !user.avatar &&
            profile.photos?.[0]?.value
          ) {
            updates.avatar =
              profile.photos[0].value;
          }

          /*
           * Do NOT change:
           *
           * user.password
           *
           * This is important because a Google
           * account may later have a local password.
           */

          if (
            Object.keys(updates).length > 0
          ) {
            user =
              await prisma.user.update({
                where: {
                  id: user.id,
                },

                data: updates,
              });
          }

          console.log(
            "EXISTING USER GOOGLE LOGIN:",
            user.email
          );
        }

        /*
        |--------------------------------------------------------------------------
        | ACCOUNT STATUS
        |--------------------------------------------------------------------------
        */

        if (
          user.status !== "ACTIVE"
        ) {
          return done(
            new Error(
              "This account is not active."
            ),
            null
          );
        }

        return done(null, user);
      } catch (error) {
        console.error(
          "GOOGLE AUTH ERROR:",
          error
        );

        return done(
          error,
          null
        );
      }
    }
  )
);

export default passport;