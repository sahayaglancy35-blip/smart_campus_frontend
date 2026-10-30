import { useState, useEffect, useCallback } from "react";
import { RouterContext } from "./RouterContext";

function normalizePath(rawPath) {
  if (!rawPath) return "/";
  const clean = rawPath.split("?")[0].split("#")[0] || "/";
  if (clean.length > 1 && clean.endsWith("/")) {
    return clean.slice(0, -1);
  }
  return clean;
}

export function RouterProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== "undefined") {
      return normalizePath(window.location.pathname);
    }
    return "/";
  });

  const navigate = useCallback((to, options = {}) => {
    const target = normalizePath(to);
    if (typeof window !== "undefined") {
      if (options.replace) {
        window.history.replaceState(null, "", target);
      } else {
        window.history.pushState(null, "", target);
      }
    }
    setCurrentPath(target);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export default RouterProvider;

