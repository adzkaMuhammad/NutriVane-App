import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/api";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Sparkles, Loader2, TrendingUp, Lightbulb, Apple, LineChart } from "lucide-react";

export default function WeeklyAnalysis() {
  const { t, lang } = useI18n();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api.get("/analysis/weekly").then((r) => setReport(r.data)).catch(() => {}).finally(() => setChecked(true));
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/analysis/weekly", { language: lang });
      setReport(data);
    } catch (err) { toast.error(apiErr(err.response?.data?.detail) || err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("weeklyTitle")}</h2>
      <p className="text-[#5C5C5C] text-sm mb-5">{t("weeklyHint")}</p>

      <button data-testid="run-analysis" onClick={run} disabled={loading}
        className="w-full h-13 py-3.5 rounded-full bg-[#22C55E] text-white font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(34,197,94,0.35)] disabled:opacity-60 mb-5">
        {loading ? <><Loader2 className="animate-spin" size={18} /> {t("runningAnalysis")}</> : <><Sparkles size={18} strokeWidth={2.5} /> {report ? t("regenerate") : t("runAnalysis")}</>}
      </button>

      {checked && !report && !loading && (
        <div className="bg-[#F0F5ED] rounded-3xl p-8 text-center" data-testid="no-analysis">
          <LineChart size={32} color="#22C55E" className="mx-auto mb-2" strokeWidth={2} />
          <p className="text-sm text-[#5C5C5C]">{t("noAnalysis")}</p>
        </div>
      )}

      {report && (
        <div data-testid="weekly-report" className="flex flex-col gap-4">
          <div className="bg-[#16A34A] rounded-3xl p-5 shadow-[0_10px_30px_rgba(34,197,94,0.3)]">
            <span className="text-xs uppercase tracking-wider font-semibold text-white/80">{t("weekSummaryLabel")}</span>
            <p className="text-white font-semibold mt-1 leading-relaxed">{report.summary}</p>
          </div>

          {report.patterns?.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-green-900/5" data-testid="patterns">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><TrendingUp size={14} color="#22C55E" strokeWidth={2.5} /> {t("patternsLabel")}</span>
              <ul className="mt-2 flex flex-col gap-2">
                {report.patterns.map((p, i) => (
                  <li key={i} className="text-sm text-[#1A1A1A] flex gap-2"><span className="text-[#22C55E] font-bold">•</span> {p}</li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendations?.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-green-900/5" data-testid="recommendations">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><Lightbulb size={14} color="#F97316" strokeWidth={2.5} /> {t("recsLabel")}</span>
              <div className="mt-2 flex flex-col gap-2">
                {report.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3 items-start bg-[#F0F5ED] rounded-2xl p-3">
                    <span className="h-6 w-6 rounded-full bg-[#22C55E] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <p className="text-sm text-[#1A1A1A]">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.nutrition_summary && (
            <div className="bg-white rounded-3xl p-5 border border-green-900/5" data-testid="nutrition-summary">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C] flex items-center gap-1.5"><Apple size={14} color="#22C55E" strokeWidth={2.5} /> {t("nutritionSummaryLabel")}</span>
              <p className="text-sm text-[#1A1A1A] mt-1.5">{report.nutrition_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
