import React, { useEffect, useRef, useState } from "react";
import api, { apiErr } from "@/api";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Camera, Loader2, Sparkles, Info, RotateCcw, Save, PenLine } from "lucide-react";

const EMOJIS = [
  { v: "sedih", e: "😢" },
  { v: "cemas", e: "😕" },
  { v: "biasa", e: "😐" },
  { v: "baik", e: "🙂" },
  { v: "senang", e: "😄" },
];

export default function Mood() {
  const { t, lang } = useI18n();
  const fileRef = useRef();
  const [mood, setMood] = useState(null); // {mood, mood_label, emoji, source, note}
  const [story, setStory] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [craving, setCraving] = useState("balanced");
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recs, setRecs] = useState(null);
  const [logs, setLogs] = useState([]);

  const loadLogs = () => api.get("/mood/logs").then((r) => setLogs(r.data)).catch(() => {});
  useEffect(() => { loadLogs(); }, []);

  const pickEmoji = (item) => {
    setMood({ mood: item.v, mood_label: t(`emo_${item.v}`), emoji: item.e, source: "emoji", note: null });
    setRecs(null);
  };

  const analyze = async () => {
    if (!story.trim()) return;
    setAnalyzing(true); setRecs(null);
    try {
      const { data } = await api.post("/mood/analyze-text", { story, language: lang });
      setMood({ ...data, source: "text", note: story });
    } catch (err) { toast.error(apiErr(err.response?.data?.detail) || err.message); }
    finally { setAnalyzing(false); }
  };

  const onFace = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setPreview(reader.result); setRecs(null); setDetecting(true);
      try {
        const { data } = await api.post("/mood/detect", { image_base64: reader.result, language: lang });
        setMood({ ...data, source: "face", note: data.note });
      } catch (err) { toast.error(apiErr(err.response?.data?.detail) || t("moodFailed")); }
      finally { setDetecting(false); }
    };
    reader.readAsDataURL(file);
  };

  const saveMood = async () => {
    setSaving(true);
    try {
      await api.post("/mood/log", { mood: mood.mood, mood_label: mood.mood_label, emoji: mood.emoji, source: mood.source, note: mood.note });
      toast.success(t("moodSaved"));
      loadLogs();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const getRecs = async () => {
    setLoadingRecs(true);
    try {
      const { data } = await api.post("/mood/recommend", { mood: mood.mood, craving, language: lang });
      setRecs(data);
    } catch (err) { toast.error(apiErr(err.response?.data?.detail) || err.message); }
    finally { setLoadingRecs(false); }
  };

  const Chip = ({ id, label }) => (
    <button data-testid={`craving-${id}`} onClick={() => setCraving(id)}
      className={`flex-1 h-11 rounded-2xl font-bold text-sm border active:scale-95 transition-transform ${craving === id ? "bg-[#22C55E] text-white border-[#22C55E]" : "bg-white text-[#5C5C5C] border-green-900/10"}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("moodPageTitle")}</h2>
      <p className="text-[#5C5C5C] text-sm mb-4">{t("moodPageHint")}</p>

      {/* emoji */}
      <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("pickEmoji")}</span>
      <div className="flex justify-between gap-1 mt-2 mb-5" data-testid="emoji-row">
        {EMOJIS.map((item) => (
          <button key={item.v} data-testid={`emoji-${item.v}`} onClick={() => pickEmoji(item)}
            className={`flex-1 aspect-square rounded-2xl text-3xl flex items-center justify-center border active:scale-90 transition-transform ${mood?.source === "emoji" && mood?.mood === item.v ? "bg-[#F0F5ED] border-[#22C55E] scale-105" : "bg-white border-green-900/5"}`}>
            {item.e}
          </button>
        ))}
      </div>

      {/* story */}
      <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><PenLine size={13} strokeWidth={2.5} color="#22C55E" /> {t("orStory")}</span>
      <textarea data-testid="mood-story" value={story} onChange={(e) => setStory(e.target.value)} rows={3}
        placeholder={t("storyPlaceholder")}
        className="w-full mt-2 p-4 rounded-2xl bg-white border border-green-900/10 focus:border-[#22C55E] outline-none resize-none text-[#1A1A1A]" />
      <button data-testid="analyze-story" onClick={analyze} disabled={analyzing || !story.trim()}
        className="w-full mt-2 mb-5 h-12 rounded-full bg-[#1A1A1A] text-white font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50">
        {analyzing ? <><Loader2 className="animate-spin" size={18} /> {t("analyzingStory")}</> : <><Sparkles size={18} strokeWidth={2.5} /> {t("analyzeStory")}</>}
      </button>

      {/* face */}
      <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("orFace")}</span>
      <input ref={fileRef} data-testid="mood-file-input" type="file" accept="image/*" capture="user" className="hidden" onChange={onFace} />
      <button data-testid="mood-take-photo" onClick={() => fileRef.current?.click()}
        className="w-full mt-2 h-12 rounded-2xl bg-white border border-green-900/10 text-[#16A34A] font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
        <Camera size={18} strokeWidth={2.5} /> {t("detectMood")}
      </button>
      <div className="flex items-start gap-2 bg-[#F0F5ED] rounded-2xl p-3 mt-2 mb-5">
        <Info size={15} color="#16A34A" strokeWidth={2.5} className="mt-0.5 shrink-0" />
        <span className="text-xs text-[#5C5C5C] leading-snug">{t("moodDisclaimer")}</span>
      </div>
      {detecting && <div className="flex items-center justify-center gap-2 text-[#16A34A] py-2 mb-3" data-testid="mood-detecting"><Loader2 className="animate-spin" size={18} /> {t("detectingMood")}</div>}

      {/* result */}
      {mood && (
        <div data-testid="mood-result" className="mb-5">
          <div className="bg-white rounded-3xl p-5 border border-green-900/5 shadow-[0_8px_32px_rgba(34,197,94,0.08)] flex items-center gap-4">
            <div className="text-5xl leading-none">{mood.emoji || "🙂"}</div>
            <div className="flex-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("yourMood")}</span>
              <div className="text-xl font-extrabold text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{mood.mood_label || mood.mood}</div>
              {mood.note && mood.source !== "text" && <p className="text-sm text-[#5C5C5C] mt-0.5">{mood.note}</p>}
            </div>
          </div>

          <button data-testid="save-mood" onClick={saveMood} disabled={saving}
            className="w-full mt-3 h-12 rounded-full bg-[#22C55E] text-white font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={2.5} />} {t("saveMood")}
          </button>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("craving")}</label>
            <div className="flex gap-2 mt-2">
              <Chip id="salty" label={t("salty")} />
              <Chip id="sweet" label={t("sweet")} />
              <Chip id="balanced" label={t("balanced")} />
            </div>
            <button data-testid="mood-get-recs" onClick={getRecs} disabled={loadingRecs}
              className="w-full mt-3 h-12 rounded-full bg-white border border-[#22C55E] text-[#16A34A] font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
              {loadingRecs ? <><Loader2 className="animate-spin" size={18} /> {t("gettingRecs")}</> : <><Sparkles size={18} strokeWidth={2.5} /> {t("getFoodRecs")}</>}
            </button>
          </div>

          {recs && (
            <div data-testid="mood-recs" className="mt-4">
              {recs.message && <p className="text-[#1A1A1A] font-semibold mb-2">{recs.message}</p>}
              <div className="flex flex-col gap-2">
                {(recs.recommendations || []).map((r, i) => (
                  <div key={i} data-testid={`rec-${i}`} className="bg-white rounded-2xl p-3 border border-green-900/5 flex items-start gap-3">
                    <div className="text-2xl leading-none">{r.emoji || "🍽️"}</div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-[#1A1A1A] text-sm">{lang === "id" ? r.name_id : r.name_en}</span>
                        {r.calories != null && <span className="text-xs font-semibold text-[#16A34A]">{Math.round(r.calories)} kcal</span>}
                      </div>
                      <p className="text-xs text-[#5C5C5C] mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* history */}
      <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{t("moodHistory")}</span>
      <div className="mt-2 flex flex-col gap-2" data-testid="mood-history">
        {logs.length === 0 && <p className="text-sm text-[#9aa39a] bg-[#F0F5ED] rounded-2xl p-4">{t("noMoodYet")}</p>}
        {logs.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl p-3 border border-green-900/5 flex items-center gap-3">
            <div className="text-2xl">{m.emoji || "🙂"}</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#1A1A1A]">{m.mood_label || m.mood}</div>
              {m.note && <div className="text-xs text-[#9aa39a] line-clamp-1">{m.note}</div>}
            </div>
            <span className="text-[11px] text-[#9aa39a]">{m.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
