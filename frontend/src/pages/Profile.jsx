import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { LogOut, Globe, Pencil, Flame, Target, Scale } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const tg = user?.targets || {};

  const Stat = ({ icon: Icon, label, value }) => (
    <div className="bg-white rounded-3xl p-4 border border-green-900/5 flex flex-col gap-1">
      <Icon size={18} color="#22C55E" strokeWidth={2.5} />
      <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] mt-1">{label}</span>
      <span className="text-xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-full bg-[#22C55E] flex items-center justify-center text-white text-2xl font-extrabold shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{user?.name}</h2>
          <p className="text-sm text-[#5C5C5C]">{user?.email}</p>
          {user?.is_demo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF1E6] text-[#F97316] font-bold uppercase mt-1 inline-block">{t("demoBadge")}</span>}
        </div>
      </div>

      <button data-testid="edit-profile" onClick={() => nav("/onboarding")} className="w-full flex items-center justify-between bg-white rounded-2xl p-4 border border-green-900/5 mb-3 active:scale-[0.98] transition-transform">
        <span className="font-semibold text-[#1A1A1A] flex items-center gap-2"><Pencil size={16} strokeWidth={2.5} /> {t("editProfile")}</span>
      </button>

      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-green-900/5 mb-5">
        <span className="font-semibold text-[#1A1A1A] flex items-center gap-2"><Globe size={16} strokeWidth={2.5} /> {t("language")}</span>
        <div className="flex gap-1 bg-[#F0F5ED] rounded-full p-1">
          {["id", "en"].map((l) => (
            <button key={l} data-testid={`lang-${l}`} onClick={() => setLang(l)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${lang === l ? "bg-[#22C55E] text-white" : "text-[#5C5C5C]"}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("yourTargets")}</span>
      <div className="grid grid-cols-3 gap-3 mt-2 mb-5">
        <Stat icon={Flame} label={t("calories")} value={tg.calories} />
        <Stat icon={Target} label="BMR" value={tg.bmr} />
        <Stat icon={Scale} label={t("bmi")} value={tg.bmi} />
        <Stat icon={Flame} label={t("protein")} value={`${tg.protein_g}g`} />
        <Stat icon={Flame} label={t("carbs")} value={`${tg.carbs_g}g`} />
        <Stat icon={Flame} label={t("fat")} value={`${tg.fat_g}g`} />
      </div>

      <button data-testid="logout-btn" onClick={() => { logout(); nav("/"); }} className="w-full h-12 rounded-full bg-white border border-[#EF4444]/30 text-[#EF4444] font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
        <LogOut size={17} strokeWidth={2.5} /> {t("logout")}
      </button>
    </div>
  );
}
