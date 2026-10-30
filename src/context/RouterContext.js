import { createContext } from "react";

export const RouterContext = createContext({
  currentPath: "/",
  navigate: () => {},
});

