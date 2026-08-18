import React, { useEffect, useState } from "react";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { Ring, MacroBar } from "@/components/Rings";
import { AlertTriangle, Salad } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function Home() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center text-[#5C5C5C]">{t("loading")}</div>;

  const { totals, targets, week } = data;
  const calRemain = targets.calories - totals.calories;
  const sodiumWarn = totals.sodium_mg > targets.sodium_mg;
  const sugarWarn = totals.sugar_g > targets.sugar_g;
  const dayLabel = (d) => new Date(d).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "short" });
  const empty = totals.calories === 0;

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <div className="mb-5">
        <p className="text-[#5C5C5C] text-sm">{t("hi")},</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{user?.name} 👋</h2>
      </div>

      {(sodiumWarn || sugarWarn) && (
        <div data-testid="warning-banner" className="flex items-start gap-2 bg-[#FFF1E6] border border-[#F97316]/30 rounded-2xl p-3.5 mb-4">
          <AlertTriangle size={18} color="#F97316" strokeWidth={2.5} className="mt-0.5 shrink-0" />
          <div className="text-sm text-[#9a4a10] font-medium">
            {sodiumWarn && <div>{t("warnSodium")}</div>}
            {sugarWarn && <div>{t("warnSugar")}</div>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-green-900/5 shadow-[0_8px_32px_rgba(34,197,94,0.08)] flex flex-col items-center mb-4" data-testid="calorie-card">
        <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] mb-3 self-start">{t("todayIntake")}</span>
        <Ring value={totals.calories} max={targets.calories} size={150} stroke={16} unit="" label="calories" />
        <p className="mt-2 text-sm text-[#5C5C5C]">
          {calRemain >= 0
            ? <><span className="font-bold text-[#16A34A]">{Math.round(calRemain)}</span> kcal {t("remaining")}</>
            : <><span className="font-bold text-[#F97316]">{Math.round(-calRemain)}</span> kcal {t("over")}</>}
        </p>
      </div>

      {empty && (
        <div className="bg-[#F0F5ED] rounded-3xl p-6 text-center mb-4">
          <Salad size={34} color="#22C55E" strokeWidth={2} className="mx-auto mb-2" />
          <p className="text-sm text-[#5C5C5C]">{t("emptyLog")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <MacroBar label={t("protein")} value={totals.protein_g} max={targets.protein_g} color="#22C55E" />
        <MacroBar label={t("carbs")} value={totals.carbs_g} max={targets.carbs_g} color="#3B82F6" />
        <MacroBar label={t("fat")} value={totals.fat_g} max={targets.fat_g} color="#A855F7" />
        <MacroBar label={t("sodium")} value={totals.sodium_mg} max={targets.sodium_mg} color="#22C55E" unit="mg" warn={sodiumWarn} />
        <MacroBar label={t("sugar")} value={totals.sugar_g} max={targets.sugar_g} color="#22C55E" warn={sugarWarn} />
        <div className="bg-white rounded-3xl p-4 border border-green-900/5 flex flex-col justify-center" data-testid="bmi-card">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("bmi")}</span>
          <span className="text-2xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{targets.bmi}</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-green-900/5 mb-4">
        <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("weeklyCalories")}</span>
        <ResponsiveContainer width="100%" height={140} className="mt-2">
          <BarChart data={week}>
            <CartesianGrid vertical={false} stroke="#EAEFE6" />
            <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 11, fill: "#9aa39a" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#F0F5ED" }} labelFormatter={dayLabel} />
            <Bar dataKey="calories" fill="#22C55E" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-green-900/5">
        <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("weeklySodium")}</span>
        <ResponsiveContainer width="100%" height={140} className="mt-2">
          <LineChart data={week}>
            <CartesianGrid vertical={false} stroke="#EAEFE6" />
            <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 11, fill: "#9aa39a" }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={dayLabel} />
            <Line type="monotone" dataKey="sodium_mg" stroke="#F97316" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="sugar_g" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
