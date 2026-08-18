import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { Ring, MacroBar } from "@/components/Rings";
import { AlertTriangle, Salad, Target, ChevronRight, Dumbbell, Flame } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function Home() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
    api.get("/logs/food").then((r) => setLogs(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center text-[#5C5C5C]">{t("loading")}</div>;

  const { totals, targets, week, diet_plan } = data;
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

      {diet_plan ? (
        <button data-testid="diet-card" onClick={() => nav("/diet")} className="w-full text-left bg-[#16A34A] rounded-3xl p-5 mb-4 active:scale-[0.98] transition-transform shadow-[0_10px_30px_rgba(34,197,94,0.35)]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-white/80">{t("dietActive")}</span>
            <ChevronRight color="#fff" size={18} />
          </div>
          <div className="text-white font-extrabold text-lg mt-1" style={{ fontFamily: "Nunito" }}>{t(diet_plan.direction)} → {diet_plan.target_weight} kg</div>
          <p className="text-white/85 text-sm">{diet_plan.days} {t("daysToTarget")} · {t(diet_plan.intensity)} · {diet_plan.daily_targets.calories} {t("kcalDay")}</p>
        </button>
      ) : (
        <button data-testid="diet-cta" onClick={() => nav("/diet")} className="w-full text-left bg-white rounded-3xl p-4 mb-4 border border-[#22C55E]/30 active:scale-[0.98] transition-transform flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[#F0F5ED] flex items-center justify-center shrink-0"><Target color="#22C55E" strokeWidth={2.5} /></div>
          <div className="flex-1">
            <div className="font-bold text-[#1A1A1A]">{t("setDietTitle")}</div>
            <p className="text-sm text-[#5C5C5C]">{t("setDietHint")}</p>
          </div>
          <ChevronRight color="#9aa39a" size={18} />
        </button>
      )}

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

      {logs.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-green-900/5 mb-4" data-testid="today-meals">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("todayMeals")}</span>
          <div className="mt-2 flex flex-col gap-1.5">
            {logs.flatMap((l) => (l.items || []).map((it, i) => (
              <div key={l.id + "-" + i} className="flex justify-between items-center py-1 border-b border-[#F0F5ED] last:border-0">
                <div>
                  <div className="text-sm font-semibold text-[#1A1A1A]">{lang === "id" ? it.name_id : it.name_en}</div>
                  <div className="text-[11px] text-[#9aa39a]">{t(l.meal)} · {it.portion}</div>
                </div>
                <span className="text-sm font-bold text-[#1A1A1A]">{Math.round(it.calories)} kcal</span>
              </div>
            )))}
          </div>
        </div>
      )}

      {diet_plan?.exercises?.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-green-900/5 mb-4" data-testid="home-exercise">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><Dumbbell size={14} color="#22C55E" strokeWidth={2.5} /> {t("exercisePlan")}</span>
          <div className="mt-2 flex flex-col gap-2">
            {diet_plan.exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#1A1A1A]">{lang === "id" ? ex.name_id : ex.name_en}</div>
                  <div className="text-[11px] text-[#9aa39a]">{ex.duration}{ex.note ? ` · ${ex.note}` : ""}</div>
                </div>
                {ex.calories_burn != null && <span className="text-xs font-semibold text-[#F97316] flex items-center gap-1"><Flame size={12} /> -{Math.round(ex.calories_burn)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

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
