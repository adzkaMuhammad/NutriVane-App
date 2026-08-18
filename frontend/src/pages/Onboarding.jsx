import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErr } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

export default function Onboarding() {
  const { t } = useI18n();
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    age: user?.age || 16, gender: user?.gender || "male",
    height_cm: user?.height_cm || 165, weight_kg: user?.weight_kg || 55,
    goal: user?.goal || "healthier", activity: user?.activity || "light",
  });
  const [loading, setLoading] = useState(false);
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setLoading(true);
    try {
      const { data } = await api.put("/profile", {
        ...form, age: Number(form.age), height_cm: Number(form.height_cm), weight_kg: Number(form.weight_kg),
      });
      setUser(data);
      toast.success(t("saved"));
      nav("/home");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally { setLoading(false); }
  };

  const input = "w-full h-12 px-4 rounded-2xl bg-white border border-green-900/10 focus:border-[#22C55E] outline-none";
  const Chip = ({ active, onClick, children, testid }) => (
    <button data-testid={testid} onClick={onClick} type="button"
      className={`px-4 h-11 rounded-full font-semibold text-sm active:scale-95 transition-transform border ${active ? "bg-[#22C55E] text-white border-[#22C55E]" : "bg-white text-[#5C5C5C] border-green-900/10"}`}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-6 pt-14 pb-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] mb-1" style={{ fontFamily: "Nunito" }}>{t("setupProfile")}</h2>
      <p className="text-[#5C5C5C] mb-6 text-sm">{t("tagline")}</p>

      <div className="flex flex-col gap-5">
        <div>
          <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("gender")}</label>
          <div className="flex gap-2 mt-2">
            <Chip testid="gender-male" active={form.gender === "male"} onClick={() => upd("gender", "male")}>{t("male")}</Chip>
            <Chip testid="gender-female" active={form.gender === "female"} onClick={() => upd("gender", "female")}>{t("female")}</Chip>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("age")}</label>
            <input data-testid="input-age" type="number" className={input + " mt-2"} value={form.age} onChange={(e) => upd("age", e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("height")}</label>
            <input data-testid="input-height" type="number" className={input + " mt-2"} value={form.height_cm} onChange={(e) => upd("height_cm", e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("weight")}</label>
            <input data-testid="input-weight" type="number" className={input + " mt-2"} value={form.weight_kg} onChange={(e) => upd("weight_kg", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("goal")}</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {["maintain", "gain", "lose", "healthier"].map((g) => (
              <Chip key={g} testid={`goal-${g}`} active={form.goal === g} onClick={() => upd("goal", g)}>{t(g)}</Chip>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("activity")}</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {["low", "light", "moderate", "high"].map((a) => (
              <Chip key={a} testid={`activity-${a}`} active={form.activity === a} onClick={() => upd("activity", a)}>{t(a)}</Chip>
            ))}
          </div>
        </div>

        <button data-testid="save-profile" onClick={save} disabled={loading} className="h-13 py-3.5 rounded-full bg-[#22C55E] text-white font-bold active:scale-95 transition-transform shadow-[0_8px_20px_rgba(34,197,94,0.35)] mt-2">
          {loading ? t("loading") : t("save")}
        </button>
      </div>
    </div>
  );
}
