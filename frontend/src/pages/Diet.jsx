import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Loader2, Dumbbell, Utensils, Lightbulb, Sparkles, AlertTriangle, Flame } from "lucide-react";

export default function Diet() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [plan, setPlan] = useState(null);
  const [editing, setEditing] = useState(null); // null=checking
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    target_weight_kg: user?.weight_kg || 55,
    days: 30, intensity: "santai", meals_per_day: "3", budget: "terjangkau",
  });

  useEffect(() => {
    api.get("/diet/plan")
      .then((r) => { if (r.data) { setPlan(r.data); setEditing(false); } else setEditing(true); })
      .catch(() => setEditing(true));
  }, []);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/diet/plan", {
        ...form, target_weight_kg: Number(form.target_weight_kg), days: Number(form.days), language: lang,
      });
      setPlan(data); setEditing(false);
      toast.success(t("savedNote"));
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const input = "w-full h-12 px-4 rounded-2xl bg-white border border-green-900/10 focus:border-[#22C55E] outline-none";
  const Chip = ({ active, onClick, children, testid }) => (
    <button data-testid={testid} onClick={onClick} type="button"
      className={`px-4 h-11 rounded-full font-semibold text-sm active:scale-95 transition-transform border ${active ? "bg-[#22C55E] text-white border-[#22C55E]" : "bg-white text-[#5C5C5C] border-green-900/10"}`}>{children}</button>
  );

  if (editing === null) {
    return <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center text-[#5C5C5C]">{t("loading")}</div>;
  }

  if (editing) {
    return (
      <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("dietTitle")}</h2>
        <p className="text-[#5C5C5C] text-sm mb-5">{t("dietHintPage")}</p>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F0F5ED] rounded-2xl p-4">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("currentWeight")}</span>
              <div className="text-2xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{user?.weight_kg || "-"} kg</div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("targetWeight")}</span>
              <input data-testid="input-target-weight" type="number" className={input + " mt-2"} value={form.target_weight_kg} onChange={(e) => upd("target_weight_kg", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("durationDays")}</label>
            <div className="flex items-center gap-3 mt-2">
              <input data-testid="input-days" type="range" min="7" max="180" step="1" value={form.days} onChange={(e) => upd("days", e.target.value)} className="flex-1 accent-[#22C55E]" />
              <span className="font-extrabold text-[#16A34A] w-20 text-right" style={{ fontFamily: "Nunito" }}>{form.days} {t("daysUnit")}</span>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("intensityLabel")}</label>
            <div className="flex gap-2 mt-2">
              <Chip testid="intensity-santai" active={form.intensity === "santai"} onClick={() => upd("intensity", "santai")}>{t("santai")}</Chip>
              <Chip testid="intensity-ekstrem" active={form.intensity === "ekstrem"} onClick={() => upd("intensity", "ekstrem")}>{t("ekstrem")}</Chip>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("mealsLabel")}</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["2", "3", "4"].map((m) => (
                <Chip key={m} testid={`meals-${m}`} active={form.meals_per_day === m} onClick={() => upd("meals_per_day", m)}>{m}x</Chip>
              ))}
              <Chip testid="meals-flex" active={form.meals_per_day === "flex"} onClick={() => upd("meals_per_day", "flex")}>{t("mealsFlex")}</Chip>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("budgetLabel")}</label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Chip testid="budget-terjangkau" active={form.budget === "terjangkau"} onClick={() => upd("budget", "terjangkau")}>{t("cheap")}</Chip>
              <Chip testid="budget-sedang" active={form.budget === "sedang"} onClick={() => upd("budget", "sedang")}>{t("mid")}</Chip>
              <Chip testid="budget-mahal" active={form.budget === "mahal"} onClick={() => upd("budget", "mahal")}>{t("pricey")}</Chip>
            </div>
          </div>

          <button data-testid="make-plan" onClick={submit} disabled={loading}
            className="py-3.5 rounded-full bg-[#22C55E] text-white font-bold active:scale-95 transition-transform shadow-[0_8px_20px_rgba(34,197,94,0.35)] flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <><Loader2 className="animate-spin" size={18} /> {t("makingPlan")}</> : <><Sparkles size={18} strokeWidth={2.5} /> {t("makePlan")}</>}
          </button>
        </div>
      </div>
    );
  }

  const dt = plan.daily_targets;
  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32" data-testid="diet-plan-view">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("dietTitle")}</h2>
        <button data-testid="reset-plan" onClick={() => setEditing(true)} className="text-sm font-bold text-[#16A34A] bg-white px-3 py-1.5 rounded-full border border-green-900/10">{t("resetPlan")}</button>
      </div>

      {!plan.safe && (
        <div data-testid="unsafe-warn" className="flex items-start gap-2 bg-[#FFF1E6] border border-[#F97316]/30 rounded-2xl p-3.5 mb-4">
          <AlertTriangle size={18} color="#F97316" strokeWidth={2.5} className="mt-0.5 shrink-0" />
          <span className="text-sm text-[#9a4a10] font-medium">{t("unsafeWarn")} {plan.days_min_safe} {t("daysUnit")}.</span>
        </div>
      )}

      <div className="bg-[#16A34A] rounded-3xl p-6 mb-4 shadow-[0_10px_30px_rgba(34,197,94,0.35)]">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-white/80">{t("dailyTargetLabel")}</span>
          <span className="text-xs font-semibold text-white/80">{t(plan.direction)} → {plan.target_weight} kg · {plan.days} {t("daysUnit")}</span>
        </div>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-4xl font-extrabold text-white" style={{ fontFamily: "Nunito" }}>{dt.calories}</span>
          <span className="text-white/80 font-semibold mb-1">{t("kcalDay")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[["protein", dt.protein_g], ["carbs", dt.carbs_g], ["fat", dt.fat_g]].map(([k, v]) => (
            <div key={k} className="bg-white/15 rounded-2xl px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">{t(k)}</div>
              <div className="text-white font-extrabold" style={{ fontFamily: "Nunito" }}>{v}g</div>
            </div>
          ))}
        </div>
      </div>

      {plan.menu?.length > 0 && (
        <div className="mb-4" data-testid="plan-menu">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><Utensils size={14} color="#22C55E" strokeWidth={2.5} /> {t("planMenuLabel")}</span>
          <div className="flex flex-col gap-3 mt-2">
            {plan.menu.map((mealGroup, gi) => (
              <div key={gi} className="bg-white rounded-3xl p-4 border border-green-900/5">
                <div className="font-bold text-[#16A34A] text-sm mb-1">{mealGroup.meal}</div>
                {(mealGroup.items || []).map((it, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-[#F0F5ED] last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-[#1A1A1A]">{lang === "id" ? it.name_id : it.name_en}</div>
                      <div className="text-[11px] text-[#9aa39a]">{it.portion}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1A1A1A]">{Math.round(it.calories || 0)} kcal</div>
                      {it.protein_g != null && <div className="text-[11px] text-[#9aa39a]">{Math.round(it.protein_g)}g P</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.exercises?.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-green-900/5 mb-4" data-testid="plan-exercises">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><Dumbbell size={14} color="#22C55E" strokeWidth={2.5} /> {t("planExerciseLabel")}</span>
          <div className="mt-2 flex flex-col gap-2">
            {plan.exercises.map((ex, i) => (
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

      {plan.tips?.length > 0 && (
        <div className="bg-[#F0F5ED] rounded-3xl p-5" data-testid="plan-tips">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><Lightbulb size={14} color="#22C55E" strokeWidth={2.5} /> {t("planTipsLabel")}</span>
          <ul className="mt-2 flex flex-col gap-1.5">
            {plan.tips.map((tip, i) => (
              <li key={i} className="text-sm text-[#5C5C5C] flex gap-2"><span className="text-[#22C55E] font-bold">•</span> {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
