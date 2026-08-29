import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import prisma from "./prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        const email =
          profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
          return done(
            new Error(
              "Google account does not have an email"
            )
          );
        }

        let user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              name:
                profile.displayName ||
                profile.name?.givenName ||
                "Barter Trade User",

              email,

              avatar:
                profile.photos?.[0]?.value || null,

              googleId: profile.id,

              authProvider: "GOOGLE",
            },
          });
        } else if (!user.googleId) {
          user = await prisma.user.update({
            where: {
              id: user.id,
            },

            data: {
              googleId: profile.id,
              avatar:
                user.avatar ||
                profile.photos?.[0]?.value ||
                null,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;