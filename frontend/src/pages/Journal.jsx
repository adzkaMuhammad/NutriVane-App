import React, { useEffect, useRef, useState, useCallback } from "react";
import api, { apiErr } from "@/api";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, BookOpen, Send } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TAGS = [
  { id: "food", key: "tagFood" },
  { id: "sport", key: "tagSport" },
  { id: "emotion", key: "tagEmotion" },
];

export default function Journal() {
  const { t } = useI18n();
  const fileRef = useRef();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [photoPath, setPhotoPath] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const token = localStorage.getItem("nv_token");

  const load = useCallback(() => api.get("/journal").then((r) => setEntries(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const toggleTag = (id) => setTags((ts) => (ts.includes(id) ? ts.filter((x) => x !== id) : [...ts, id]));

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setPreview(reader.result); setUploading(true);
      try {
        const { data } = await api.post("/journal/upload", { image_base64: reader.result, filename: file.name });
        setPhotoPath(data.path);
      } catch (err) { toast.error(apiErr(err.response?.data?.detail) || err.message); setPreview(null); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.post("/journal", { content, tags, photo_path: photoPath });
      toast.success(t("entrySaved"));
      setContent(""); setTags([]); setPhotoPath(null); setPreview(null);
      load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const del = async (id) => { await api.delete(`/journal/${id}`); load(); };

  const imgUrl = (path) => `${API}/files/${path}?auth=${token}`;

  return (
    <div className="min-h-screen bg-[#F9F9F6] px-4 pt-12 pb-32">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]" style={{ fontFamily: "Nunito" }}>{t("journalTitle")}</h2>
      <p className="text-[#5C5C5C] text-sm mb-4">{t("journalHint")}</p>

      <div className="bg-white rounded-3xl p-4 border border-green-900/5 mb-6">
        <textarea data-testid="journal-content" value={content} onChange={(e) => setContent(e.target.value)} rows={4}
          placeholder={t("journalPlaceholder")}
          className="w-full p-1 outline-none resize-none text-[#1A1A1A] bg-transparent" />

        {preview && (
          <div className="relative mt-2">
            <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-2xl" />
            {uploading && <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white gap-2"><Loader2 className="animate-spin" size={18} /> {t("uploading")}</div>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {TAGS.map((tag) => (
            <button key={tag.id} data-testid={`tag-${tag.id}`} onClick={() => toggleTag(tag.id)}
              className={`px-3 h-9 rounded-full text-sm font-semibold border active:scale-95 transition-transform ${tags.includes(tag.id) ? "bg-[#22C55E] text-white border-[#22C55E]" : "bg-white text-[#5C5C5C] border-green-900/10"}`}>
              {t(tag.key)}
            </button>
          ))}
        </div>

        <input ref={fileRef} data-testid="journal-photo-input" type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <div className="flex gap-2 mt-3">
          <button data-testid="add-photo" onClick={() => fileRef.current?.click()}
            className="h-11 px-4 rounded-full bg-[#F0F5ED] text-[#16A34A] font-bold text-sm active:scale-95 transition-transform flex items-center gap-2">
            <ImagePlus size={16} strokeWidth={2.5} /> {t("addPhoto")}
          </button>
          <button data-testid="save-entry" onClick={save} disabled={saving || uploading || !content.trim()}
            className="flex-1 h-11 rounded-full bg-[#22C55E] text-white font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_8px_20px_rgba(34,197,94,0.35)]">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} strokeWidth={2.5} />} {t("saveEntry")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3" data-testid="journal-list">
        {entries.length === 0 && (
          <div className="bg-[#F0F5ED] rounded-3xl p-8 text-center">
            <BookOpen size={32} color="#22C55E" className="mx-auto mb-2" strokeWidth={2} />
            <p className="text-sm text-[#5C5C5C]">{t("noJournal")}</p>
          </div>
        )}
        {entries.map((e) => (
          <div key={e.id} data-testid={`journal-${e.id}`} className="bg-white rounded-3xl p-4 border border-green-900/5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[#1A1A1A] whitespace-pre-wrap flex-1">{e.content}</p>
              <button data-testid={`delete-journal-${e.id}`} onClick={() => del(e.id)} className="text-[#EF4444] active:scale-90 transition-transform shrink-0"><Trash2 size={16} strokeWidth={2.5} /></button>
            </div>
            {e.photo_path && <img src={imgUrl(e.photo_path)} alt="journal" className="w-full h-44 object-cover rounded-2xl mt-3" />}
            <div className="flex items-center gap-2 mt-3">
              {(e.tags || []).map((tg) => (
                <span key={tg} className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0F5ED] text-[#16A34A] font-semibold">{t(`tag${tg.charAt(0).toUpperCase() + tg.slice(1)}`)}</span>
              ))}
              <span className="text-[11px] text-[#9aa39a] ml-auto">{e.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
