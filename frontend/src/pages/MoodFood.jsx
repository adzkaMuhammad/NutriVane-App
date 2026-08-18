import React, { useRef, useState } from "react";
import api, { apiErr } from "@/api";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Camera, Loader2, Sparkles, Info, RotateCcw } from "lucide-react";

export default function MoodFood() {
  const { t, lang } = useI18n();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [mood, setMood] = useState(null);
  const [craving, setCraving] = useState("balanced");
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recs, setRecs] = useState(null);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result;
      setPreview(b64);
      setMood(null); setRecs(null);
      setDetecting(true);
      try {
        const { data } = await api.post("/mood/detect", { image_base64: b64, language: lang });
        setMood(data);
      } catch (err) {
        toast.error(apiErr(err.response?.data?.detail) || t("moodFailed"));
      } finally { setDetecting(false); }
    };
    reader.readAsDataURL(file);
  };

  const getRecs = async () => {
    setLoadingRecs(true);
    try {
      const { data } = await api.post("/mood/recommend", { mood: mood.mood, craving, language: lang });
      setRecs(data);
    } catch (err) {
      toast.error(apiErr(err.response?.data?.detail) || err.message);
    } finally { setLoadingRecs(false); }
  };

  const reset = () => { setPreview(null); setMood(null); setRecs(null); setCraving("balanced"); };

  const Chip = ({ id, label }) => (
    <button data-testid={`craving-${id}`} onClick={() => setCraving(id)}
      className={`flex-1 h-12 rounded-2xl font-bold text-sm border active:scale-95 transition-transform ${craving === id ? "bg-[#22C55E] text-white border-[#22C55E]" : "bg-white text-[#5C5C5C] border-green-900/10"}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("moodTitle")}</h2>
      <p className="text-[#5C5C5C] text-sm mb-4">{t("moodHint")}</p>

      <div className="flex items-start gap-2 bg-[#F0F5ED] rounded-2xl p-3 mb-4">
        <Info size={16} color="#16A34A" strokeWidth={2.5} className="mt-0.5 shrink-0" />
        <span className="text-xs text-[#5C5C5C] leading-snug">{t("moodDisclaimer")}</span>
      </div>

      <input ref={fileRef} data-testid="mood-file-input" type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />

      {preview ? (
        <img src={preview} alt="face" className="w-full h-56 object-cover rounded-3xl mb-4" />
      ) : (
        <button data-testid="mood-take-photo" onClick={() => fileRef.current?.click()}
          className="w-full h-56 rounded-3xl border-2 border-dashed border-[#22C55E]/40 bg-[#F0F5ED] flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform mb-4">
          <div className="h-14 w-14 rounded-full bg-[#22C55E] flex items-center justify-center shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
            <Camera color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[#16A34A]">{t("detectMood")}</span>
        </button>
      )}

      {detecting && (
        <div className="flex items-center justify-center gap-2 text-[#16A34A] py-4" data-testid="mood-detecting">
          <Loader2 className="animate-spin" size={20} /> <span className="font-semibold">{t("detectingMood")}</span>
        </div>
      )}

      {mood && (
        <div data-testid="mood-result">
          <div className="bg-white rounded-3xl p-5 border border-green-900/5 shadow-[0_8px_32px_rgba(34,197,94,0.08)] flex items-center gap-4 mb-4">
            <div className="text-5xl leading-none">{mood.emoji || "🙂"}</div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("yourMood")}</span>
              <div className="text-xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{mood.mood_label || mood.mood}</div>
              {mood.note && <p className="text-sm text-[#5C5C5C] mt-0.5">{mood.note}</p>}
            </div>
          </div>

          <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("craving")}</label>
          <div className="flex gap-2 mt-2 mb-4">
            <Chip id="salty" label={t("salty")} />
            <Chip id="sweet" label={t("sweet")} />
            <Chip id="balanced" label={t("balanced")} />
          </div>

          <div className="flex gap-3 mb-4">
            <button data-testid="mood-again" onClick={reset} className="h-12 px-4 rounded-full bg-white border border-green-900/10 text-[#5C5C5C] font-bold active:scale-95 transition-transform flex items-center gap-2">
              <RotateCcw size={16} strokeWidth={2.5} /> {t("detectAgain")}
            </button>
            <button data-testid="mood-get-recs" onClick={getRecs} disabled={loadingRecs}
              className="flex-1 h-12 rounded-full bg-[#22C55E] text-white font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
              {loadingRecs ? <><Loader2 className="animate-spin" size={18} /> {t("gettingRecs")}</> : <><Sparkles size={18} strokeWidth={2.5} /> {t("getRecs")}</>}
            </button>
          </div>
        </div>
      )}

      {recs && (
        <div data-testid="mood-recs">
          {recs.message && <p className="text-[#1A1A1A] font-semibold mb-3">{recs.message}</p>}
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("recsTitle")}</span>
          <div className="flex flex-col gap-3 mt-2">
            {(recs.recommendations || []).map((r, i) => (
              <div key={i} data-testid={`rec-${i}`} className="bg-white rounded-3xl p-4 border border-green-900/5 flex items-start gap-3">
                <div className="text-3xl leading-none">{r.emoji || "🍽️"}</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-[#1A1A1A]">{lang === "id" ? r.name_id : r.name_en}</span>
                    {r.calories != null && <span className="text-xs font-semibold text-[#16A34A]">{Math.round(r.calories)} kcal</span>}
                  </div>
                  <p className="text-sm text-[#5C5C5C] mt-0.5">{r.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
