import {createContext,useContext,useEffect,useState,} from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // LOAD CURRENT USER
  // =========================================================

  const loadUser = async () => {
    const token = localStorage.getItem("barter_token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user);

      localStorage.setItem(
        "barter_user",
        JSON.stringify(response.data.user)
      );
    } catch (error) {
      console.error("LOAD USER ERROR:", error);

      localStorage.removeItem("barter_token");
      localStorage.removeItem("barter_user");

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL AUTH CHECK
  // =========================================================

  useEffect(() => {
    loadUser();
  }, []);

  // =========================================================
  // REGISTER
  // =========================================================

  const register = async (data) => {
    const response = await api.post(
      "/auth/register",
      data
    );

    const { token, user } = response.data;

    localStorage.setItem(
      "barter_token",
      token
    );

    localStorage.setItem(
      "barter_user",
      JSON.stringify(user)
    );

    setUser(user);

    return response.data;
  };

  // =========================================================
  // NORMAL LOGIN
  // =========================================================

  const login = async (data) => {
    const response = await api.post(
      "/auth/login",
      data
    );

    const { token, user } = response.data;

    localStorage.setItem(
      "barter_token",
      token
    );

    localStorage.setItem(
      "barter_user",
      JSON.stringify(user)
    );

    setUser(user);

    return response.data;
  };

  // =========================================================
  // GOOGLE LOGIN CALLBACK
  // =========================================================

  const setAuthFromToken = async (token) => {
    if (!token) {
      throw new Error("Authentication token is missing.");
    }

    try {
      // Save Google JWT
      localStorage.setItem(
        "barter_token",
        token
      );

      // Ask backend who this token belongs to
      const response = await api.get(
        "/auth/me"
      );

      const authenticatedUser =
        response.data.user;

      // Save user information
      localStorage.setItem(
        "barter_user",
        JSON.stringify(authenticatedUser)
      );

      // Update React authentication state
      setUser(authenticatedUser);

      return authenticatedUser;
    } catch (error) {
      console.error(
        "GOOGLE AUTH CALLBACK ERROR:",
        error
      );

      // Remove invalid token
      localStorage.removeItem(
        "barter_token"
      );

      localStorage.removeItem(
        "barter_user"
      );

      setUser(null);

      throw error;
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = () => {
    localStorage.removeItem(
      "barter_token"
    );

    localStorage.removeItem(
      "barter_user"
    );

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");

    sessionStorage.clear();

    setUser(null);
  };

  // =========================================================
  // PROVIDER
  // =========================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        loadUser,
        setAuthFromToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ===========================================================
// HOOK
// ===========================================================

export const useAuth = () => {
  const context = useContext(
    AuthContext
  );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};