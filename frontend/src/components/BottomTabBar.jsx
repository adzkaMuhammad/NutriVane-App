import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, History, User, Camera, Smile } from "lucide-react";
import { useI18n } from "@/i18n";

export default function BottomTabBar() {
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useI18n();
  const active = loc.pathname;

  const Tab = ({ path, icon: Icon, label, testid }) => {
    const on = active === path;
    return (
      <button
        data-testid={testid}
        onClick={() => nav(path)}
        className="flex flex-col items-center justify-center gap-1 flex-1 py-1 active:scale-95 transition-transform"
      >
        <Icon strokeWidth={2.5} size={23} color={on ? "#16A34A" : "#9aa39a"} />
        <span className={`text-[10px] font-semibold ${on ? "text-[#16A34A]" : "text-[#9aa39a]"}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
      <div className="relative mx-3 mb-3 rounded-[28px] backdrop-blur-xl bg-white/85 border border-black/5 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] flex items-center px-2 pt-2 pb-3">
        <Tab path="/home" icon={Home} label={t("home")} testid="tab-home" />
        <Tab path="/mood" icon={Smile} label={t("moodTab")} testid="tab-mood" />
        <div className="flex-1 flex justify-center">
          <button
            data-testid="tab-scan"
            onClick={() => nav("/scan")}
            className="absolute -top-6 h-16 w-16 rounded-full bg-[#22C55E] shadow-[0_10px_25px_rgba(34,197,94,0.5)] flex items-center justify-center active:scale-90 transition-transform border-4 border-[#F9F9F6]"
          >
            <Camera strokeWidth={2.5} size={28} color="#fff" />
          </button>
        </div>
        <Tab path="/history" icon={History} label={t("history")} testid="tab-history" />
        <Tab path="/profile" icon={User} label={t("profile")} testid="tab-profile" />
      </div>
    </div>
  );
}
