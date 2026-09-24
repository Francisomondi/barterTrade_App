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
  const [user, setUser] = useState(null);

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
   * LOAD / REFRESH CURRENT USER
   * ============================================================
   *
   * This is the single source used whenever React needs fresh
   * authenticated-user information from the backend.
   *
   * It is especially important after:
   *
   * - Premium activation
   * - profile updates
   * - future verification changes
   * - account changes
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
         * During the initial authentication check an invalid or
         * expired token should clear the local session.
         *
         * A manual refresh can choose not to clear the session
         * for temporary network failures.
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
        }

        throw error;
      } finally {
        if (manageLoading) {
          setLoading(false);
        }
      }
    },
    [saveUser]
  );

  /*
   * ============================================================
   * REFRESH AUTHENTICATED USER
   * ============================================================
   *
   * Use this after something changes the authenticated user's
   * server-side state.
   *
   * Example:
   *
   * await refreshUser();
   *
   * Premium.jsx will use this immediately after M-Pesa success.
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
   * INITIAL AUTH CHECK
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          await loadUser({
            clearSessionOnFailure:
              true,

            manageLoading:
              false,
          });
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
  }, [loadUser]);

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
     * Refresh from /auth/me so the frontend receives the
     * canonical authenticated-user shape.
     */

    await refreshUser();

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
     * Refresh immediately so Premium information comes from
     * /auth/me even if the login response has an older shape.
     */

    await refreshUser();

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
     * Remove legacy authentication keys as well.
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
  };

  /*
   * ============================================================
   * CONVENIENT PREMIUM VALUES
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
         * Authentication actions
         */
        register,
        login,
        logout,
        setAuthFromToken,

        /*
         * Refresh functions
         *
         * loadUser is kept for compatibility with any existing
         * component that already uses it.
         */
        loadUser,
        refreshUser,

        /*
         * Keep this available if an existing part of your app
         * needs to update user state directly.
         */
        setUser,
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