import { createContext } from "react";

/* Lets the popup save changes without passing a prop through
   Dashboard -> AppLayout -> Header. App.jsx wraps the dashboard in
   <ProfileUpdateContext.Provider> (admins only) and the popup reads it. */
export const ProfileUpdateContext = createContext(null);

