import React, { createContext, useContext, useState } from "react";

const STR = {
  id: {
    appName: "NutriVane",
    tagline: "Teman gizi, mood & masak sehatmu",
    login: "Masuk", register: "Daftar", email: "Email", password: "Kata sandi",
    name: "Nama", logout: "Keluar", loading: "Memuat...",
    needAccount: "Belum punya akun?", haveAccount: "Sudah punya akun?",
    parentalConsent: "Saya (di bawah 18) sudah mendapat izin orang tua/wali untuk memakai aplikasi ini",
    tryDemo: "Coba Akun Demo",
    // onboarding
    setupProfile: "Lengkapi Profil", age: "Usia", gender: "Jenis Kelamin",
    male: "Laki-laki", female: "Perempuan", height: "Tinggi (cm)", weight: "Berat (kg)",
    goal: "Tujuan", maintain: "Jaga berat", gain: "Naik berat", lose: "Turun berat", healthier: "Lebih sehat",
    activity: "Aktivitas", low: "Rendah", light: "Ringan", moderate: "Sedang", high: "Tinggi",
    save: "Simpan", saved: "Tersimpan!",
    // tabs
    home: "Beranda", scan: "Scan", history: "Riwayat", profile: "Profil",
    // dashboard
    hi: "Halo", todayIntake: "Asupan Hari Ini", calories: "Kalori", protein: "Protein",
    carbs: "Karbo", fat: "Lemak", sodium: "Natrium", sugar: "Gula",
    weeklyCalories: "Kalori Mingguan", weeklySodium: "Natrium & Gula Mingguan",
    goalKcal: "Target harian", remaining: "sisa", over: "lewat",
    warnSodium: "Natrium hari ini melewati batas WHO", warnSugar: "Gula hari ini melewati batas WHO",
    emptyLog: "Belum ada makanan hari ini. Yuk scan makananmu!",
    bmi: "BMI", bmr: "BMR", target: "Target",
    // scan
    scanTitle: "Scan Makanan", scanHint: "Foto atau unggah makananmu, AI akan menghitung gizinya",
    takePhoto: "Ambil / Pilih Foto", analyzing: "Menganalisis dengan AI...",
    detected: "Terdeteksi", confidence: "Keyakinan", meal: "Waktu makan",
    breakfast: "Sarapan", lunch: "Makan siang", dinner: "Makan malam", snack: "Camilan",
    addToLog: "Simpan ke Log", editItem: "Koreksi", portion: "Porsi",
    scanAgain: "Scan Lagi", noItems: "Tidak ada makanan terdeteksi. Coba foto lain.",
    // history
    historyTitle: "Riwayat Makan", noHistory: "Belum ada catatan untuk tanggal ini.",
    delete: "Hapus", total: "Total",
    // profile
    language: "Bahasa", yourTargets: "Target Gizimu", editProfile: "Edit Profil",
    demoBadge: "Akun Demo",
    // mood-based food
    moodTab: "Mood", moodTitle: "Rekomendasi dari Mood",
    moodHint: "Ambil foto wajahmu, AI menebak mood-mu lalu menyarankan makanan yang pas",
    moodDisclaimer: "Deteksi mood ini eksperimental — hasilnya bisa meleset. Kamu yang paling tahu perasaanmu 💚",
    detectMood: "Ambil / Pilih Foto Wajah", detectingMood: "Membaca mood...",
    yourMood: "Mood kamu", craving: "Lagi pengen rasa apa?",
    salty: "Asin", sweet: "Manis", balanced: "Seimbang",
    getRecs: "Lihat Rekomendasi", gettingRecs: "Menyiapkan rekomendasi...",
    recsTitle: "Rekomendasi untukmu", detectAgain: "Deteksi Lagi",
    moodFailed: "Gagal membaca mood. Coba foto lain.",
  },
  en: {
    appName: "NutriVane",
    tagline: "Your nutrition, mood & healthy cooking buddy",
    login: "Log in", register: "Sign up", email: "Email", password: "Password",
    name: "Name", logout: "Log out", loading: "Loading...",
    needAccount: "No account yet?", haveAccount: "Already have an account?",
    parentalConsent: "I (under 18) have my parent/guardian's consent to use this app",
    tryDemo: "Try Demo Account",
    setupProfile: "Complete Profile", age: "Age", gender: "Gender",
    male: "Male", female: "Female", height: "Height (cm)", weight: "Weight (kg)",
    goal: "Goal", maintain: "Maintain", gain: "Gain", lose: "Lose", healthier: "Be healthier",
    activity: "Activity", low: "Low", light: "Light", moderate: "Moderate", high: "High",
    save: "Save", saved: "Saved!",
    home: "Home", scan: "Scan", history: "History", profile: "Profile",
    hi: "Hi", todayIntake: "Today's Intake", calories: "Calories", protein: "Protein",
    carbs: "Carbs", fat: "Fat", sodium: "Sodium", sugar: "Sugar",
    weeklyCalories: "Weekly Calories", weeklySodium: "Weekly Sodium & Sugar",
    goalKcal: "Daily target", remaining: "left", over: "over",
    warnSodium: "Sodium today exceeds WHO limit", warnSugar: "Sugar today exceeds WHO limit",
    emptyLog: "No food logged today. Scan your meal!",
    bmi: "BMI", bmr: "BMR", target: "Target",
    scanTitle: "Scan Food", scanHint: "Snap or upload your meal, AI estimates the nutrition",
    takePhoto: "Take / Choose Photo", analyzing: "Analyzing with AI...",
    detected: "Detected", confidence: "Confidence", meal: "Meal",
    breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
    addToLog: "Save to Log", editItem: "Correct", portion: "Portion",
    scanAgain: "Scan Again", noItems: "No food detected. Try another photo.",
    historyTitle: "Meal History", noHistory: "No records for this date.",
    delete: "Delete", total: "Total",
    language: "Language", yourTargets: "Your Targets", editProfile: "Edit Profile",
    demoBadge: "Demo Account",
    // mood-based food
    moodTab: "Mood", moodTitle: "Mood-based Picks",
    moodHint: "Snap your face, AI reads your mood then suggests food that fits",
    moodDisclaimer: "This mood detection is experimental — it can be wrong. You know your feelings best 💚",
    detectMood: "Take / Choose Face Photo", detectingMood: "Reading your mood...",
    yourMood: "Your mood", craving: "Craving which taste?",
    salty: "Salty", sweet: "Sweet", balanced: "Balanced",
    getRecs: "See Recommendations", gettingRecs: "Preparing recommendations...",
    recsTitle: "Picks for you", detectAgain: "Detect Again",
    moodFailed: "Couldn't read mood. Try another photo.",
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("nv_lang") || "id");
  const change = (l) => { setLang(l); localStorage.setItem("nv_lang", l); };
  const t = (k) => (STR[lang] && STR[lang][k]) || STR.id[k] || k;
  return <I18nContext.Provider value={{ lang, setLang: change, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
