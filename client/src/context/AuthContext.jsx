import {createContext,useContext,useEffect,useState} from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem("barter_token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");

      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem("barter_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const register = async (data) => {
    const response = await api.post(
      "/auth/register",
      data
    );

    localStorage.setItem(
      "barter_token",
      response.data.token
    );

    setUser(response.data.user);

    return response.data;
  };

  const login = async (data) => {
    const response = await api.post(
      "/auth/login",
      data
    );

    localStorage.setItem(
      "barter_token",
      response.data.token
    );

    setUser(response.data.user);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("barter_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};