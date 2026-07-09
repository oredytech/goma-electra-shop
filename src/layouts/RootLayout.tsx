import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { useLocation } from "react-router-dom";

export function RootLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      reportLovableError(event.error ?? new Error(event.message), { boundary: "spa_root_layout" });
    };
    window.addEventListener("error", errorHandler);
    return () => window.removeEventListener("error", errorHandler);
  }, []);

  return (
    <>
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
