import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  /*
   * ============================================================
   * AUTHENTICATED USER
   * ============================================================
   */

  const [user, setUser] = useState(null);

  /*
   * ============================================================
   * BUSINESS PROFILE
   * ============================================================
   */

  const [business, setBusiness] =
    useState(null);

  const [businessLoading, setBusinessLoading] =
    useState(false);

  /*
   * ============================================================
   * INITIAL AUTH LOADING
   * ============================================================
   */

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================================
   * SAVE AUTHENTICATED USER
   * ============================================================
   */

  const saveUser = useCallback(
    (authenticatedUser) => {
      if (!authenticatedUser) {
        localStorage.removeItem(
          "barter_user"
        );

        setUser(null);

        return;
      }

      localStorage.setItem(
        "barter_user",
        JSON.stringify(
          authenticatedUser
        )
      );

      setUser(
        authenticatedUser
      );
    },
    []
  );

  /*
   * ============================================================
   * CLEAR BUSINESS STATE
   * ============================================================
   */

  const clearBusiness =
    useCallback(() => {
      setBusiness(null);
    }, []);

  /*
   * ============================================================
   * LOAD / REFRESH BUSINESS
   * ============================================================
   *
   * BusinessProfile is intentionally loaded separately from
   * /auth/me.
   *
   * Expected:
   *
   * GET /business/me
   *
   * {
   *   success: true,
   *   isBusiness: true,
   *   business: { ... }
   * }
   *
   * or:
   *
   * {
   *   success: true,
   *   isBusiness: false,
   *   business: null
   * }
   *
   * ACTIVE, CLOSED and SUSPENDED profiles are all still
   * Business Accounts.
   */

  const loadBusiness =
    useCallback(
      async ({
        manageLoading = false,
        clearOnFailure = false,
      } = {}) => {
        const token =
          localStorage.getItem(
            "barter_token"
          );

        if (!token) {
          clearBusiness();

          return null;
        }

        try {
          if (manageLoading) {
            setBusinessLoading(
              true
            );
          }

          const response =
            await api.get(
              "/business/me"
            );

          const data =
            response?.data;

          /*
           * User does not have a
           * Business Account.
           */
          if (
            !data?.isBusiness ||
            !data?.business
          ) {
            setBusiness(null);

            return null;
          }

          setBusiness(
            data.business
          );

          return data.business;
        } catch (error) {
          console.error(
            "LOAD BUSINESS ERROR:",
            error
          );

          /*
           * 404 can safely represent
           * no BusinessProfile if the
           * backend ever returns that
           * style of response.
           */
          if (
            error?.response
              ?.status === 404
          ) {
            setBusiness(null);

            return null;
          }

          if (clearOnFailure) {
            setBusiness(null);
          }

          throw error;
        } finally {
          if (manageLoading) {
            setBusinessLoading(
              false
            );
          }
        }
      },
      [clearBusiness]
    );

  /*
   * ============================================================
   * REFRESH BUSINESS
   * ============================================================
   *
   * Call after:
   *
   * - creating Business Account
   * - editing Business Profile
   * - changing logo
   * - changing cover
   * - opening/closing storefront
   * - future verification changes
   */

  const refreshBusiness =
    useCallback(async () => {
      try {
        return await loadBusiness({
          manageLoading: false,
          clearOnFailure: false,
        });
      } catch (error) {
        console.error(
          "REFRESH BUSINESS ERROR:",
          error
        );

        return null;
      }
    }, [loadBusiness]);

  /*
   * ============================================================
   * LOAD / REFRESH CURRENT USER
   * ============================================================
   *
   * This remains the canonical source
   * for authenticated-user state.
   *
   * /auth/me is expected to return:
   *
   * {
   *   success: true,
   *   user: {
   *     ...
   *     isPremium: true/false,
   *     premiumPlan: "PREMIUM" | null,
   *     premiumStartedAt: Date | null,
   *     premiumEndsAt: Date | null
   *   }
   * }
   */

  const loadUser = useCallback(
    async ({
      clearSessionOnFailure = true,
      manageLoading = false,
    } = {}) => {
      const token =
        localStorage.getItem(
          "barter_token"
        );

      if (!token) {
        saveUser(null);
        clearBusiness();

        if (manageLoading) {
          setLoading(false);
        }

        return null;
      }

      try {
        if (manageLoading) {
          setLoading(true);
        }

        const response =
          await api.get(
            "/auth/me"
          );

        const authenticatedUser =
          response?.data?.user;

        if (!authenticatedUser) {
          throw new Error(
            "Authenticated user was not returned."
          );
        }

        saveUser(
          authenticatedUser
        );

        return authenticatedUser;
      } catch (error) {
        console.error(
          "LOAD USER ERROR:",
          error
        );

        /*
         * During the initial authentication check
         * an invalid or expired token should clear
         * the local session.
         *
         * A manual refresh can choose not to clear
         * the session for temporary network errors.
         */

        if (
          clearSessionOnFailure
        ) {
          localStorage.removeItem(
            "barter_token"
          );

          localStorage.removeItem(
            "barter_user"
          );

          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          localStorage.removeItem(
            "userId"
          );

          setUser(null);
          clearBusiness();
        }

        throw error;
      } finally {
        if (manageLoading) {
          setLoading(false);
        }
      }
    },
    [
      saveUser,
      clearBusiness,
    ]
  );

  /*
   * ============================================================
   * REFRESH AUTHENTICATED USER
   * ============================================================
   */

  const refreshUser =
    useCallback(async () => {
      try {
        return await loadUser({
          clearSessionOnFailure:
            false,

          manageLoading:
            false,
        });
      } catch (error) {
        console.error(
          "REFRESH USER ERROR:",
          error
        );

        return null;
      }
    }, [loadUser]);

  /*
   * ============================================================
   * REFRESH ACCOUNT
   * ============================================================
   *
   * Convenience function for cases
   * where both authentication/Premium
   * and Business state may have changed.
   */

  const refreshAccount =
    useCallback(async () => {
      const [
        refreshedUser,
        refreshedBusiness,
      ] = await Promise.all([
        refreshUser(),
        refreshBusiness(),
      ]);

      return {
        user: refreshedUser,
        business:
          refreshedBusiness,
      };
    }, [
      refreshUser,
      refreshBusiness,
    ]);

  /*
   * ============================================================
   * INITIAL AUTH + BUSINESS CHECK
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          const authenticatedUser =
            await loadUser({
              clearSessionOnFailure:
                true,

              manageLoading:
                false,
            });

          /*
           * Only request BusinessProfile
           * after authentication succeeds.
           */
          if (
            authenticatedUser
          ) {
            try {
              await loadBusiness({
                manageLoading:
                  false,

                clearOnFailure:
                  true,
              });
            } catch (error) {
              /*
               * Business loading should
               * never invalidate a valid
               * authenticated session.
               */
              console.error(
                "INITIAL BUSINESS LOAD ERROR:",
                error
              );
            }
          }
        } catch {
          /*
           * loadUser already handles
           * invalid sessions.
           */
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [
    loadUser,
    loadBusiness,
  ]);

  /*
   * ============================================================
   * REGISTER
   * ============================================================
   */

  const register = async (
    data
  ) => {
    const response =
      await api.post(
        "/auth/register",
        data
      );

    const {
      token,
      user:
        registeredUser,
    } = response.data;

    if (!token) {
      throw new Error(
        "Authentication token was not returned."
      );
    }

    localStorage.setItem(
      "barter_token",
      token
    );

    saveUser(
      registeredUser
    );

    /*
     * Refresh from /auth/me so the
     * frontend receives canonical
     * authenticated-user state.
     */

    await refreshUser();

    /*
     * New users normally have no
     * BusinessProfile, but load it
     * so context is authoritative.
     */

    await refreshBusiness();

    return response.data;
  };

  /*
   * ============================================================
   * NORMAL LOGIN
   * ============================================================
   */

  const login = async (
    data
  ) => {
    const response =
      await api.post(
        "/auth/login",
        data
      );

    const {
      token,
      user:
        loggedInUser,
    } = response.data;

    if (!token) {
      throw new Error(
        "Authentication token was not returned."
      );
    }

    localStorage.setItem(
      "barter_token",
      token
    );

    saveUser(
      loggedInUser
    );

    /*
     * Refresh immediately so Premium
     * information comes from /auth/me.
     */

    await refreshUser();

    /*
     * Load BusinessProfile separately.
     */

    await refreshBusiness();

    return response.data;
  };

  /*
   * ============================================================
   * GOOGLE LOGIN CALLBACK
   * ============================================================
   */

  const setAuthFromToken =
    async (token) => {
      if (!token) {
        throw new Error(
          "Authentication token is missing."
        );
      }

      try {
        localStorage.setItem(
          "barter_token",
          token
        );

        const response =
          await api.get(
            "/auth/me"
          );

        const authenticatedUser =
          response?.data?.user;

        if (!authenticatedUser) {
          throw new Error(
            "Authenticated user was not returned."
          );
        }

        saveUser(
          authenticatedUser
        );

        /*
         * Load Business state after
         * Google authentication.
         */

        await refreshBusiness();

        return authenticatedUser;
      } catch (error) {
        console.error(
          "GOOGLE AUTH CALLBACK ERROR:",
          error
        );

        localStorage.removeItem(
          "barter_token"
        );

        localStorage.removeItem(
          "barter_user"
        );

        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "user"
        );

        localStorage.removeItem(
          "userId"
        );

        setUser(null);
        clearBusiness();

        throw error;
      }
    };

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const logout = () => {
    localStorage.removeItem(
      "barter_token"
    );

    localStorage.removeItem(
      "barter_user"
    );

    /*
     * Remove legacy authentication
     * keys as well.
     */

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    localStorage.removeItem(
      "userId"
    );

    sessionStorage.clear();

    setUser(null);
    clearBusiness();
  };

  /*
   * ============================================================
   * PREMIUM VALUES
   * ============================================================
   */

  const isPremium =
    Boolean(
      user?.isPremium
    );

  const premiumPlan =
    user?.premiumPlan ??
    null;

  const premiumStartedAt =
    user?.premiumStartedAt ??
    null;

  const premiumEndsAt =
    user?.premiumEndsAt ??
    null;

  /*
   * ============================================================
   * BUSINESS VALUES
   * ============================================================
   *
   * IMPORTANT:
   *
   * Business Account ownership does
   * NOT depend on status.
   *
   * ACTIVE
   * CLOSED
   * SUSPENDED
   *
   * are all still Business Accounts.
   */

  const isBusiness =
    Boolean(business);

  const businessStatus =
    business?.status ??
    null;

  const businessSlug =
    business?.slug ??
    null;

  const businessVerificationStatus =
    business?.verificationStatus ??
    null;

  const isBusinessVerified =
    businessVerificationStatus ===
    "VERIFIED";

  const isBusinessStorefrontActive =
    isBusiness &&
    businessStatus ===
      "ACTIVE";

  /*
   * ============================================================
   * PROVIDER
   * ============================================================
   */

  return (
    <AuthContext.Provider
      value={{
        /*
         * Authentication
         */
        user,
        loading,

        /*
         * Premium
         */
        isPremium,
        premiumPlan,
        premiumStartedAt,
        premiumEndsAt,

        /*
         * Business
         */
        business,
        businessLoading,
        isBusiness,
        businessStatus,
        businessSlug,
        businessVerificationStatus,
        isBusinessVerified,
        isBusinessStorefrontActive,

        /*
         * Authentication actions
         */
        register,
        login,
        logout,
        setAuthFromToken,

        /*
         * Refresh functions
         */
        loadUser,
        refreshUser,
        loadBusiness,
        refreshBusiness,
        refreshAccount,

        /*
         * Direct state access retained
         * for existing functionality.
         */
        setUser,
        setBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/*
 * ============================================================
 * AUTH HOOK
 * ============================================================
 */

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};