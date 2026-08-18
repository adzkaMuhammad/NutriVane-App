import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErr } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Leaf, Globe } from "lucide-react";

export default function Auth() {
  const { t, lang, setLang } = useI18n();
  const { setSession } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", parental_consent: false });
  const [loading, setLoading] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(path, form);
      setSession(data);
      nav(data.user.profile_complete ? "/home" : "/onboarding");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const demo = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email: "demo@nutrivane.app", password: "demo1234" });
      setSession(data);
      nav("/home");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally { setLoading(false); }
  };

  const input = "w-full h-12 px-4 rounded-2xl bg-white border border-green-900/10 focus:border-[#22C55E] outline-none text-[#1A1A1A] placeholder:text-[#9aa39a]";

  return (
    <div className="min-h-screen bg-[#F9F9F6] flex flex-col px-6 pt-14 pb-8 relative">
      <button
        data-testid="lang-toggle-auth"
        onClick={() => setLang(lang === "id" ? "en" : "id")}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-sm font-bold text-[#16A34A] bg-white px-3 py-1.5 rounded-full border border-green-900/10"
      >
        <Globe size={15} strokeWidth={2.5} /> {lang.toUpperCase()}
      </button>

      <div className="flex items-center gap-2.5 mb-1">
        <div className="h-11 w-11 rounded-2xl bg-[#22C55E] flex items-center justify-center shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
          <Leaf color="#fff" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("appName")}</h1>
      </div>
      <p className="text-[#5C5C5C] mb-8">{t("tagline")}</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "register" && (
          <input data-testid="input-name" className={input} placeholder={t("name")} value={form.name} onChange={(e) => upd("name", e.target.value)} required />
        )}
        <input data-testid="input-email" type="email" className={input} placeholder={t("email")} value={form.email} onChange={(e) => upd("email", e.target.value)} required />
        <input data-testid="input-password" type="password" className={input} placeholder={t("password")} value={form.password} onChange={(e) => upd("password", e.target.value)} required />

        {mode === "register" && (
          <label className="flex items-start gap-3 bg-[#F0F5ED] rounded-2xl p-3.5 cursor-pointer">
            <input data-testid="input-consent" type="checkbox" className="mt-0.5 h-5 w-5 accent-[#22C55E]" checked={form.parental_consent} onChange={(e) => upd("parental_consent", e.target.checked)} />
            <span className="text-sm text-[#5C5C5C] leading-snug">{t("parentalConsent")}</span>
          </label>
        )}

        <button data-testid="auth-submit" disabled={loading} className="h-12 rounded-full bg-[#22C55E] text-white font-bold active:scale-95 transition-transform disabled:opacity-60 shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
          {loading ? t("loading") : mode === "login" ? t("login") : t("register")}
        </button>
      </form>

      <button data-testid="toggle-mode" onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-5 text-sm text-[#5C5C5C]">
        {mode === "login" ? t("needAccount") : t("haveAccount")}{" "}
        <span className="text-[#16A34A] font-bold">{mode === "login" ? t("register") : t("login")}</span>
      </button>

      <div className="mt-auto pt-8">
        <button data-testid="demo-login" onClick={demo} disabled={loading} className="w-full h-12 rounded-full bg-white border border-[#22C55E] text-[#16A34A] font-bold active:scale-95 transition-transform">
          {t("tryDemo")}
        </button>
      </div>
    </div>
  );
}
