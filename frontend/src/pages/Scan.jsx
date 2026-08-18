import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErr } from "@/api";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Camera, Loader2, Check, Sparkles } from "lucide-react";

export default function Scan() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [meal, setMeal] = useState("lunch");
  const [saving, setSaving] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result;
      setPreview(b64);
      setItems(null);
      setLoading(true);
      try {
        const { data } = await api.post("/scan/food", { image_base64: b64, language: lang });
        setItems(data.items || []);
        setConfidence(data.confidence);
        if (!data.items || data.items.length === 0) toast.error(t("noItems"));
      } catch (err) {
        toast.error(apiErr(err.response?.data?.detail) || err.message);
      } finally { setLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const editItem = (idx, key, val) => {
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = items.map((it) => ({
        name_id: it.name_id || it.name_en || "Makanan",
        name_en: it.name_en || it.name_id || "Food",
        portion: it.portion || "",
        grams: Number(it.grams) || 0, calories: Number(it.calories) || 0,
        protein_g: Number(it.protein_g) || 0, carbs_g: Number(it.carbs_g) || 0,
        fat_g: Number(it.fat_g) || 0, sodium_mg: Number(it.sodium_mg) || 0, sugar_g: Number(it.sugar_g) || 0,
      }));
      await api.post("/logs/food", { items: payload, meal });
      toast.success(t("saved"));
      nav("/home");
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const reset = () => { setPreview(null); setItems(null); setConfidence(null); };

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("scanTitle")}</h2>
      <p className="text-[#5C5C5C] text-sm mb-5">{t("scanHint")}</p>

      <input ref={fileRef} data-testid="file-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      {preview ? (
        <img src={preview} alt="preview" className="w-full h-52 object-cover rounded-3xl mb-4" />
      ) : (
        <button
          data-testid="take-photo-btn"
          onClick={() => fileRef.current?.click()}
          className="w-full h-52 rounded-3xl border-2 border-dashed border-[#22C55E]/40 bg-[#F0F5ED] flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform mb-4"
        >
          <div className="h-14 w-14 rounded-full bg-[#22C55E] flex items-center justify-center shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
            <Camera color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[#16A34A]">{t("takePhoto")}</span>
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#16A34A] py-6" data-testid="scan-loading">
          <Loader2 className="animate-spin" size={20} /> <span className="font-semibold">{t("analyzing")}</span>
        </div>
      )}

      {items && items.length > 0 && (
        <div data-testid="scan-results">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} color="#22C55E" strokeWidth={2.5} />
            <span className="font-bold text-[#1A1A1A]">{t("detected")}</span>
            {confidence && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0F5ED] text-[#16A34A] font-semibold uppercase">{t("confidence")}: {confidence}</span>}
          </div>

          {items.map((it, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-4 border border-green-900/5 mb-3" data-testid={`scan-item-${idx}`}>
              <input
                data-testid={`edit-name-${idx}`}
                className="w-full font-bold text-[#1A1A1A] text-lg bg-transparent outline-none border-b border-transparent focus:border-[#22C55E]"
                value={lang === "id" ? it.name_id : it.name_en}
                onChange={(e) => editItem(idx, lang === "id" ? "name_id" : "name_en", e.target.value)}
              />
              <input
                data-testid={`edit-portion-${idx}`}
                className="w-full text-sm text-[#5C5C5C] bg-transparent outline-none mt-1"
                value={it.portion || ""}
                placeholder={t("portion")}
                onChange={(e) => editItem(idx, "portion", e.target.value)}
              />
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[["calories", "kcal"], ["protein_g", "P"], ["carbs_g", "K"], ["fat_g", "L"]].map(([k, lbl]) => (
                  <div key={k} className="bg-[#F0F5ED] rounded-xl px-2 py-1.5">
                    <div className="text-[10px] text-[#9aa39a] font-semibold">{lbl}</div>
                    <input data-testid={`edit-${k}-${idx}`} type="number" className="w-full bg-transparent outline-none font-bold text-sm text-[#1A1A1A]"
                      value={Math.round(it[k] || 0)} onChange={(e) => editItem(idx, k, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("meal")}</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["breakfast", "lunch", "dinner", "snack"].map((m) => (
                <button key={m} data-testid={`meal-${m}`} onClick={() => setMeal(m)}
                  className={`px-4 h-10 rounded-full font-semibold text-sm border active:scale-95 transition-transform ${meal === m ? "bg-[#22C55E] text-white border-[#22C55E]" : "bg-white text-[#5C5C5C] border-green-900/10"}`}>
                  {t(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button data-testid="scan-again" onClick={reset} className="flex-1 h-12 rounded-full bg-white border border-green-900/10 text-[#5C5C5C] font-bold active:scale-95 transition-transform">
              {t("scanAgain")}
            </button>
            <button data-testid="save-log" onClick={save} disabled={saving} className="flex-[2] h-12 rounded-full bg-[#22C55E] text-white font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
              <Check size={18} strokeWidth={3} /> {saving ? t("loading") : t("addToLog")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
