import { useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const { setAuthFromToken } =
    useAuth();

  const [error, setError] =
    useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const token =
        searchParams.get("token");

      if (!token) {
        console.error(
          "Google callback: token missing"
        );

        setError(
          "Google authentication failed."
        );

        setTimeout(() => {
          navigate("/login", {
            replace: true,
          });
        }, 1500);

        return;
      }

      try {
        await setAuthFromToken(token);

        // IMPORTANT:
        // Successful Google login goes here.
        navigate("/marketplace", {
          replace: true,
        });
      } catch (error) {
        console.error(
          "Google authentication failed:",
          error
        );

        setError(
          "Unable to complete Google sign-in."
        );

        setTimeout(() => {
          navigate("/login", {
            replace: true,
          });
        }, 1500);
      }
    };

    handleCallback();
  }, [
    navigate,
    searchParams,
    setAuthFromToken,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F5F3] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E7DDDF] bg-white p-8 text-center shadow-lg">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B1725] text-2xl font-black text-white">
          ⇄
        </div>

        {!error ? (
          <>
            <h1 className="mt-5 text-xl font-black text-[#21191B]">
              Signing you in...
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Please wait while we complete
              your Google sign-in.
            </p>

            <div className="mx-auto mt-5 h-6 w-6 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />
          </>
        ) : (
          <>
            <h1 className="mt-5 text-xl font-black text-[#5B1725]">
              Sign-in failed
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {error}
            </p>

            <p className="mt-4 text-xs text-gray-400">
              Redirecting to login...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;