import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/verify", {
          method: "GET",
          credentials: "include",
        });
        if (mounted) setOk(res.ok);
      } catch {
        if (mounted) setOk(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return null; // or a small spinner
  if (!ok) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}