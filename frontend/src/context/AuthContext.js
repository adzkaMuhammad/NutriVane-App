import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, obj=auth
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nv_token");
    if (!token) { setUser(false); setReady(true); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem("nv_token"); setUser(false); })
      .finally(() => setReady(true));
  }, []);

  const setSession = (data) => {
    localStorage.setItem("nv_token", data.token);
    setUser(data.user);
  };
  const logout = () => { localStorage.removeItem("nv_token"); setUser(false); };
  const refresh = async () => {
    const r = await api.get("/auth/me");
    setUser(r.data);
    return r.data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, setSession, logout, refresh, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
