import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Smile, Camera, Target, BookOpen, LineChart, History, User, Leaf } from "lucide-react";
import { useI18n } from "@/i18n";

export default function AppMenu() {
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);

  const items = [
    { path: "/home", icon: Home, label: t("navHome") },
    { path: "/scan", icon: Camera, label: t("scanTitle") },
    { path: "/mood", icon: Smile, label: t("moodPageTitle") },
    { path: "/diet", icon: Target, label: t("dietTitle") },
    { path: "/journal", icon: BookOpen, label: t("journalTitle") },
    { path: "/weekly", icon: LineChart, label: t("weeklyTitle") },
    { path: "/history", icon: History, label: t("historyTitle") },
    { path: "/profile", icon: User, label: t("profile") },
  ];

  const go = (p) => { setOpen(false); nav(p); };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button data-testid="menu-button"
          className="fixed top-4 right-4 z-50 h-11 w-11 rounded-2xl backdrop-blur-xl bg-white/85 border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] flex items-center justify-center active:scale-90 transition-transform">
          <Menu size={22} strokeWidth={2.5} color="#16A34A" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#F9F9F6] border-l border-black/5 w-[80%] max-w-xs">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <div className="h-9 w-9 rounded-xl bg-[#22C55E] flex items-center justify-center"><Leaf color="#fff" size={18} strokeWidth={2.5} /></div>
            <span className="text-xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("menuTitle")}</span>
          </SheetTitle>
          <SheetDescription className="sr-only">{t("appName")}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-1.5">
          {items.map((it) => {
            const active = loc.pathname === it.path;
            return (
              <button key={it.path} data-testid={`menu-${it.path.slice(1)}`} onClick={() => go(it.path)}
                className={`flex items-center gap-3 px-4 h-13 py-3 rounded-2xl font-semibold active:scale-[0.98] transition-transform ${active ? "bg-[#22C55E] text-white" : "bg-white text-[#1A1A1A] border border-green-900/5"}`}>
                <it.icon size={20} strokeWidth={2.5} color={active ? "#fff" : "#22C55E"} />
                {it.label}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
