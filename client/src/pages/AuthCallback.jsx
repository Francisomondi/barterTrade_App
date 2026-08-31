import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  useEffect(() => {
    const handleAuthentication = async () => {
      const params = new URLSearchParams(
        window.location.search
      );

      const token = params.get("token");

      if (!token) {
        navigate("/login?error=google", {
          replace: true,
        });

        return;
      }

      localStorage.setItem("barter_token", token);

      await loadUser();

      navigate("/dashboard", {
        replace: true,
      });
    };

    handleAuthentication();
  }, [navigate, loadUser]);

  return (
    <div>
      <h2>Signing you in...</h2>
    </div>
  );
};

export default AuthCallback;