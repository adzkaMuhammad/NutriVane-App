import React, { useEffect, useState } from "react";
import api from "@/api";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Trash2, UtensilsCrossed } from "lucide-react";

export default function History() {
  const { t, lang } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState([]);

  const load = (d) => {
    api.get(`/logs/food?date=${d}`).then((r) => setLogs(r.data)).catch(() => {});
  };
  useEffect(() => { load(date); }, [date]);

  const del = async (id) => {
    await api.delete(`/logs/food/${id}`);
    toast.success(t("delete"));
    load(date);
  };

  const sumLog = (items, key) => Math.round(items.reduce((a, i) => a + (Number(i[key]) || 0), 0));

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A] mb-4" style={{ fontFamily: "Nunito" }}>{t("historyTitle")}</h2>

      <input data-testid="history-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
        className="w-full h-12 px-4 rounded-2xl bg-white border border-green-900/10 outline-none mb-4 font-semibold text-[#1A1A1A]" />

      {logs.length === 0 && (
        <div className="bg-[#F0F5ED] rounded-3xl p-8 text-center">
          <UtensilsCrossed size={32} color="#22C55E" className="mx-auto mb-2" strokeWidth={2} />
          <p className="text-sm text-[#5C5C5C]">{t("noHistory")}</p>
        </div>
      )}

      {logs.map((log) => (
        <div key={log.id} className="bg-white rounded-3xl p-4 border border-green-900/5 mb-3" data-testid={`log-${log.id}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#16A34A]">{t(log.meal)}</span>
            <button data-testid={`delete-${log.id}`} onClick={() => del(log.id)} className="text-[#EF4444] active:scale-90 transition-transform">
              <Trash2 size={17} strokeWidth={2.5} />
            </button>
          </div>
          {log.items.map((it, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-[#F0F5ED] last:border-0">
              <div>
                <div className="font-semibold text-[#1A1A1A] text-sm">{lang === "id" ? it.name_id : it.name_en}</div>
                <div className="text-xs text-[#9aa39a]">{it.portion}</div>
              </div>
              <span className="font-bold text-sm text-[#1A1A1A]">{Math.round(it.calories)} kcal</span>
            </div>
          ))}
          <div className="flex justify-between mt-2 pt-2 text-sm">
            <span className="text-[#5C5C5C] font-semibold">{t("total")}</span>
            <span className="font-bold text-[#16A34A]">{sumLog(log.items, "calories")} kcal</span>
          </div>
        </div>
      ))}
    </div>
  );
}
