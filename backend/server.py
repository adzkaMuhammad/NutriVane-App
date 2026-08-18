from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone, timedelta, date
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import bcrypt
import jwt

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

ACTIVITY_FACTORS = {"low": 1.2, "light": 1.375, "moderate": 1.55, "high": 1.725}
GOAL_ADJUST = {"maintain": 0, "gain": 350, "lose": -400, "healthier": 0}

def compute_targets(profile: dict) -> dict:
    w = float(profile.get("weight_kg") or 60)
    h = float(profile.get("height_cm") or 165)
    age = int(profile.get("age") or 16)
    gender = profile.get("gender", "male")
    activity = profile.get("activity", "light")
    goal = profile.get("goal", "maintain")
    bmr = 10 * w + 6.25 * h - 5 * age + (5 if gender == "male" else -161)
    tdee = bmr * ACTIVITY_FACTORS.get(activity, 1.375)
    calories = round(tdee + GOAL_ADJUST.get(goal, 0))
    protein_g = round(1.6 * w)
    fat_g = round((calories * 0.25) / 9)
    carbs_g = round((calories - (protein_g * 4 + fat_g * 9)) / 4)
    bmi = round(w / ((h / 100) ** 2), 1)
    return {
        "bmr": round(bmr), "tdee": round(tdee), "bmi": bmi,
        "calories": calories, "protein_g": protein_g,
        "carbs_g": max(carbs_g, 0), "fat_g": fat_g,
        "sodium_mg": 2000, "sugar_g": 25, "salt_g": 5,
    }

def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ---------------- models ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    parental_consent: bool = False

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileIn(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    goal: Optional[str] = None
    activity: Optional[str] = None
    language: Optional[str] = None

class FoodItem(BaseModel):
    name_id: str
    name_en: str
    portion: str
    grams: float = 0
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    sodium_mg: float = 0
    sugar_g: float = 0

class LogFoodIn(BaseModel):
    items: List[FoodItem]
    meal: str = "snack"
    date: Optional[str] = None

class ScanIn(BaseModel):
    image_base64: str
    language: str = "id"

def public_user(user: dict) -> dict:
    targets = compute_targets(user)
    return {
        "id": user["id"], "email": user["email"], "name": user.get("name"),
        "age": user.get("age"), "gender": user.get("gender"),
        "height_cm": user.get("height_cm"), "weight_kg": user.get("weight_kg"),
        "goal": user.get("goal"), "activity": user.get("activity"),
        "language": user.get("language", "id"),
        "profile_complete": user.get("profile_complete", False),
        "is_demo": user.get("is_demo", False),
        "targets": targets,
    }

# ---------------- auth routes ----------------
@api_router.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    doc = {
        "email": email, "password_hash": hash_password(body.password),
        "name": body.name, "parental_consent": body.parental_consent,
        "language": "id", "profile_complete": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    token = create_access_token(doc["id"], email)
    return {"token": token, "user": public_user(doc)}

@api_router.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    user["id"] = str(user["_id"])
    token = create_access_token(user["id"], email)
    return {"token": token, "user": public_user(user)}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)

@api_router.put("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["profile_complete"] = True
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    fresh["id"] = str(fresh["_id"])
    return public_user(fresh)

# ---------------- foods ----------------
@api_router.get("/foods")
async def get_foods(q: Optional[str] = None):
    query = {}
    if q:
        query = {"$or": [{"name_id": {"$regex": q, "$options": "i"}},
                         {"name_en": {"$regex": q, "$options": "i"}}]}
    foods = await db.foods.find(query, {"_id": 0}).to_list(200)
    return foods

# ---------------- AI scan ----------------
def parse_json_block(text: str) -> Any:
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    m = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)

@api_router.post("/scan/food")
async def scan_food(body: ScanIn, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI key not configured")
    lang = "Bahasa Indonesia" if body.language == "id" else "English"
    system = (
        "You are a nutrition expert specialized in Indonesian foods. "
        "Identify each distinct food/drink in the image, estimate portion size and nutrition. "
        "Return ONLY valid JSON, no markdown."
    )
    prompt = (
        f"Analyze this food photo. Reply in {lang} for the readable fields. "
        "Return a JSON object: {\"items\": [{\"name_id\": string (Indonesian name), "
        "\"name_en\": string (English name), \"portion\": short human portion description, "
        "\"grams\": number, \"calories\": number (kcal), \"protein_g\": number, "
        "\"carbs_g\": number, \"fat_g\": number, \"sodium_mg\": number, \"sugar_g\": number}], "
        "\"confidence\": \"low\"|\"medium\"|\"high\"}. "
        "Estimate realistic values for typical Indonesian portions. If unsure, still give best estimate."
    )
    img_b64 = body.image_base64
    if "," in img_b64 and img_b64.strip().startswith("data:"):
        img_b64 = img_b64.split(",", 1)[1]
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"scan-{user['id']}", system_message=system)
        chat.with_model("gemini", "gemini-3-flash-preview")
        msg = UserMessage(text=prompt, file_contents=[ImageContent(image_base64=img_b64)])
        resp = await chat.send_message(msg)
        data = parse_json_block(resp if isinstance(resp, str) else str(resp))
    except Exception as e:
        logger.exception("scan failed")
        raise HTTPException(status_code=502, detail=f"AI scan gagal: {str(e)[:120]}")
    items = data.get("items", []) if isinstance(data, dict) else data
    return {"items": items, "confidence": (data.get("confidence") if isinstance(data, dict) else "low")}

@api_router.post("/scan/spice")
async def scan_spice(body: ScanIn, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI key not configured")
    lang = "Bahasa Indonesia" if body.language == "id" else "English"
    system = ("You estimate seasoning amounts (salt, sugar, oil) from a photo. "
              "This is a rough experimental estimate, not precise. Return ONLY JSON.")
    prompt = (
        f"Reply readable fields in {lang}. Estimate the seasoning shown. Return JSON: "
        "{\"spice\": \"salt\"|\"sugar\"|\"oil\"|other, \"grams\": number, "
        "\"teaspoons\": number, \"advice\": short suggestion string, "
        "\"accuracy\": \"low\"|\"medium\"}."
    )
    img_b64 = body.image_base64
    if "," in img_b64 and img_b64.strip().startswith("data:"):
        img_b64 = img_b64.split(",", 1)[1]
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"spice-{user['id']}", system_message=system)
        chat.with_model("gemini", "gemini-3-flash-preview")
        msg = UserMessage(text=prompt, file_contents=[ImageContent(image_base64=img_b64)])
        resp = await chat.send_message(msg)
        data = parse_json_block(resp if isinstance(resp, str) else str(resp))
    except Exception as e:
        logger.exception("spice failed")
        raise HTTPException(status_code=502, detail=f"AI estimasi gagal: {str(e)[:120]}")
    return data

# ---------------- mood-based food ----------------
class MoodRecommendIn(BaseModel):
    mood: str
    craving: str = "balanced"
    language: str = "id"

@api_router.post("/mood/detect")
async def mood_detect(body: ScanIn, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI key not configured")
    lang = "Bahasa Indonesia" if body.language == "id" else "English"
    system = ("You read facial emotion from a selfie for a wellness app for teens. "
              "Be gentle and non-clinical. Return ONLY JSON, no markdown.")
    prompt = (
        f"Look at the person's face and estimate their current mood. Reply readable fields in {lang}. "
        "Return JSON: {\"mood\": one of [senang, biasa, lelah, sedih, stres, cemas, marah] "
        "(use exactly these Indonesian keys), \"mood_label\": friendly label in the target language, "
        "\"emoji\": single emoji, \"confidence\": \"low\"|\"medium\"|\"high\", "
        "\"note\": one short warm sentence}. If no clear face, set mood to \"biasa\" and confidence \"low\"."
    )
    img = body.image_base64
    if "," in img and img.strip().startswith("data:"):
        img = img.split(",", 1)[1]
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"mood-{user['id']}", system_message=system)
        chat.with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=prompt, file_contents=[ImageContent(image_base64=img)]))
        data = parse_json_block(resp if isinstance(resp, str) else str(resp))
    except Exception as e:
        logger.exception("mood detect failed")
        raise HTTPException(status_code=502, detail=f"AI deteksi mood gagal: {str(e)[:120]}")
    return data

@api_router.post("/mood/recommend")
async def mood_recommend(body: MoodRecommendIn, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI key not configured")
    lang = "Bahasa Indonesia" if body.language == "id" else "English"
    craving_map = {"salty": "asin/gurih", "sweet": "manis", "balanced": "seimbang"}
    craving = craving_map.get(body.craving, body.craving)
    goal = user.get("goal", "healthier")
    system = ("You are a friendly Indonesian nutrition buddy for teens/santri. Suggest healthy, affordable, "
              "pesantren-friendly Indonesian foods/drinks. Warm, not preachy. Return ONLY JSON, no markdown.")
    prompt = (
        f"User mood: {body.mood}. Craving taste: {craving}. Health goal: {goal}. "
        f"Reply readable fields in {lang}. Suggest 4 foods/drinks that fit the mood and the craving "
        "but are still a healthier choice. Return JSON: "
        "{\"message\": one short encouraging sentence about the mood, "
        "\"recommendations\": [{\"name_id\": Indonesian name, \"name_en\": English name, "
        "\"emoji\": single food emoji, \"reason\": short why it helps this mood/craving, "
        "\"calories\": approx kcal number}]}."
    )
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"moodrec-{user['id']}", system_message=system)
        chat.with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        data = parse_json_block(resp if isinstance(resp, str) else str(resp))
    except Exception as e:
        logger.exception("mood recommend failed")
        raise HTTPException(status_code=502, detail=f"AI rekomendasi gagal: {str(e)[:120]}")
    return data

# ---------------- diet plan ----------------
class DietPlanIn(BaseModel):
    target_weight_kg: float
    days: int = 30
    intensity: str = "santai"      # santai | ekstrem
    meals_per_day: str = "3"       # "2" | "3" | "4" | "flex"
    budget: str = "terjangkau"     # terjangkau | sedang | mahal
    language: str = "id"

def compute_diet(user: dict, target_weight: float, days: int, intensity: str) -> dict:
    base = compute_targets(user)
    tdee = base["tdee"]
    w = float(user.get("weight_kg") or 60)
    gender = user.get("gender", "male")
    delta = w - target_weight  # >0 lose, <0 gain
    direction = "lose" if delta > 0.5 else ("gain" if delta < -0.5 else "maintain")
    total_kcal = abs(delta) * 7700.0
    days = max(int(days or 1), 1)
    daily_change = total_kcal / days
    cap = 1000.0 if intensity == "ekstrem" else 500.0
    safe = daily_change <= cap + 1
    applied = min(daily_change, cap)
    days_min_safe = int((total_kcal / cap) + 0.999) if cap > 0 else days
    floor = 1500 if gender == "male" else 1200
    if direction == "lose":
        calories = max(round(tdee - applied), floor)
    elif direction == "gain":
        calories = round(tdee + min(applied, 700))
    else:
        calories = round(tdee)
    protein_g = round(1.8 * w) if direction != "maintain" else base["protein_g"]
    fat_g = round(calories * 0.25 / 9)
    carbs_g = max(round((calories - (protein_g * 4 + fat_g * 9)) / 4), 0)
    return {
        "direction": direction, "current_weight": w, "target_weight": target_weight,
        "days": days, "days_min_safe": days_min_safe, "safe": safe, "intensity": intensity,
        "daily_targets": {
            "calories": calories, "protein_g": protein_g, "carbs_g": carbs_g,
            "fat_g": fat_g, "sodium_mg": 2000, "sugar_g": 25, "salt_g": 5,
        },
    }

@api_router.get("/diet/plan")
async def get_diet_plan(user: dict = Depends(get_current_user)):
    return user.get("diet_plan")

@api_router.delete("/diet/plan")
async def delete_diet_plan(user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$unset": {"diet_plan": ""}})
    return {"ok": True}

@api_router.post("/diet/plan")
async def create_diet_plan(body: DietPlanIn, user: dict = Depends(get_current_user)):
    calc = compute_diet(user, body.target_weight_kg, body.days, body.intensity)
    lang = "Bahasa Indonesia" if body.language == "id" else "English"
    meals_desc = {"2": "2 meals a day", "3": "3 meals a day", "4": "4 meals a day",
                  "flex": "flexible / irregular small meals"}.get(body.meals_per_day, "3 meals a day")
    budget_desc = {"terjangkau": "very affordable / cheap warung food", "sedang": "medium budget",
                   "mahal": "slightly more expensive / premium"}.get(body.budget, "affordable")
    dt = calc["daily_targets"]
    system = ("You are an Indonesian nutrition & fitness coach for teens/santri. Build a realistic, "
              "affordable, pesantren-friendly daily plan. Return ONLY JSON, no markdown.")
    prompt = (
        f"Goal: {calc['direction']} weight to {body.target_weight_kg} kg. "
        f"Daily budget: {dt['calories']} kcal, protein {dt['protein_g']} g. "
        f"Meals: {meals_desc}. Menu budget level: {budget_desc}. Intensity: {body.intensity}. "
        f"Reply readable fields in {lang}. Return JSON: {{"
        "\"menu\": [{\"meal\": label (Sarapan/Makan Siang/Makan Malam/Camilan), "
        "\"items\": [{\"name_id\": string, \"name_en\": string, \"portion\": string, "
        "\"calories\": number, \"protein_g\": number}]}], "
        "\"exercises\": [{\"name_id\": string, \"name_en\": string, \"duration\": string (e.g. '20 menit'), "
        "\"calories_burn\": number, \"note\": short string}], "
        "\"tips\": [string, string, string]}. "
        "Make total menu calories roughly match the daily budget. Suggest 3-4 exercises doable without a gym."
    )
    ai = {"menu": [], "exercises": [], "tips": []}
    if EMERGENT_LLM_KEY:
        try:
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"diet-{user['id']}", system_message=system)
            chat.with_model("gemini", "gemini-3-flash-preview")
            resp = await chat.send_message(UserMessage(text=prompt))
            parsed = parse_json_block(resp if isinstance(resp, str) else str(resp))
            if isinstance(parsed, dict):
                ai = {"menu": parsed.get("menu", []), "exercises": parsed.get("exercises", []),
                      "tips": parsed.get("tips", [])}
        except Exception:
            logger.exception("diet plan AI failed")
    plan = {
        **calc, "meals_per_day": body.meals_per_day, "budget": body.budget,
        "menu": ai["menu"], "exercises": ai["exercises"], "tips": ai["tips"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"diet_plan": plan}})
    return plan

# ---------------- food logs ----------------
@api_router.post("/logs/food")
async def log_food(body: LogFoodIn, user: dict = Depends(get_current_user)):
    d = body.date or today_str()
    doc = {
        "user_id": user["id"], "date": d, "meal": body.meal,
        "items": [i.model_dump() for i in body.items],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.food_logs.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.delete("/logs/food/{log_id}")
async def delete_food_log(log_id: str, user: dict = Depends(get_current_user)):
    await db.food_logs.delete_one({"_id": ObjectId(log_id), "user_id": user["id"]})
    return {"ok": True}

@api_router.get("/logs/food")
async def list_food_logs(date: Optional[str] = None, user: dict = Depends(get_current_user)):
    d = date or today_str()
    logs = await db.food_logs.find({"user_id": user["id"], "date": d}).sort("created_at", -1).to_list(200)
    for l in logs:
        l["id"] = str(l["_id"]); l.pop("_id", None)
    return logs

def sum_items(items):
    keys = ["calories", "protein_g", "carbs_g", "fat_g", "sodium_mg", "sugar_g"]
    return {k: round(sum(float(i.get(k, 0) or 0) for i in items), 1) for k in keys}

@api_router.get("/dashboard")
async def dashboard(date: Optional[str] = None, user: dict = Depends(get_current_user)):
    d = date or today_str()
    logs = await db.food_logs.find({"user_id": user["id"], "date": d}).to_list(500)
    all_items = [i for l in logs for i in l.get("items", [])]
    totals = sum_items(all_items)
    plan = user.get("diet_plan")
    targets = plan["daily_targets"] if plan else compute_targets(user)
    # weekly
    week = []
    base = datetime.strptime(d, "%Y-%m-%d")
    for offset in range(6, -1, -1):
        day = (base - timedelta(days=offset)).strftime("%Y-%m-%d")
        day_logs = await db.food_logs.find({"user_id": user["id"], "date": day}).to_list(500)
        di = [i for l in day_logs for i in l.get("items", [])]
        s = sum_items(di)
        week.append({"date": day, "calories": s["calories"], "protein_g": s["protein_g"],
                     "sodium_mg": s["sodium_mg"], "sugar_g": s["sugar_g"]})
    return {"date": d, "totals": totals, "targets": targets, "week": week, "diet_plan": plan}

# ---------------- seed ----------------
INDO_FOODS = [
    {"name_id": "Nasi Putih", "name_en": "White Rice", "portion": "1 centong (100g)", "grams": 100, "calories": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3, "sodium_mg": 1, "sugar_g": 0.1},
    {"name_id": "Ayam Goreng", "name_en": "Fried Chicken", "portion": "1 potong (100g)", "grams": 100, "calories": 260, "protein_g": 24, "carbs_g": 8, "fat_g": 15, "sodium_mg": 400, "sugar_g": 0},
    {"name_id": "Tempe Goreng", "name_en": "Fried Tempeh", "portion": "2 potong (50g)", "grams": 50, "calories": 120, "protein_g": 9, "carbs_g": 6, "fat_g": 7, "sodium_mg": 150, "sugar_g": 0.5},
    {"name_id": "Tahu Goreng", "name_en": "Fried Tofu", "portion": "2 potong (60g)", "grams": 60, "calories": 110, "protein_g": 8, "carbs_g": 3, "fat_g": 8, "sodium_mg": 120, "sugar_g": 0.3},
    {"name_id": "Telur Dadar", "name_en": "Omelette", "portion": "1 butir (60g)", "grams": 60, "calories": 95, "protein_g": 7, "carbs_g": 1, "fat_g": 7, "sodium_mg": 160, "sugar_g": 0.4},
    {"name_id": "Sayur Bayam", "name_en": "Spinach Soup", "portion": "1 mangkok (150g)", "grams": 150, "calories": 40, "protein_g": 3, "carbs_g": 5, "fat_g": 1, "sodium_mg": 300, "sugar_g": 1},
    {"name_id": "Mie Goreng", "name_en": "Fried Noodles", "portion": "1 porsi (200g)", "grams": 200, "calories": 380, "protein_g": 9, "carbs_g": 55, "fat_g": 14, "sodium_mg": 900, "sugar_g": 4},
    {"name_id": "Gado-gado", "name_en": "Gado-gado Salad", "portion": "1 porsi (250g)", "grams": 250, "calories": 300, "protein_g": 12, "carbs_g": 25, "fat_g": 17, "sodium_mg": 550, "sugar_g": 8},
    {"name_id": "Soto Ayam", "name_en": "Chicken Soto", "portion": "1 mangkok (300g)", "grams": 300, "calories": 250, "protein_g": 18, "carbs_g": 20, "fat_g": 10, "sodium_mg": 800, "sugar_g": 3},
    {"name_id": "Rendang", "name_en": "Beef Rendang", "portion": "1 potong (100g)", "grams": 100, "calories": 290, "protein_g": 22, "carbs_g": 6, "fat_g": 20, "sodium_mg": 500, "sugar_g": 3},
    {"name_id": "Pisang", "name_en": "Banana", "portion": "1 buah (120g)", "grams": 120, "calories": 105, "protein_g": 1.3, "carbs_g": 27, "fat_g": 0.3, "sodium_mg": 1, "sugar_g": 14},
    {"name_id": "Es Teh Manis", "name_en": "Sweet Iced Tea", "portion": "1 gelas (250ml)", "grams": 250, "calories": 90, "protein_g": 0, "carbs_g": 23, "fat_g": 0, "sodium_mg": 10, "sugar_g": 22},
    {"name_id": "Bakso", "name_en": "Meatball Soup", "portion": "1 mangkok (300g)", "grams": 300, "calories": 320, "protein_g": 16, "carbs_g": 30, "fat_g": 15, "sodium_mg": 1000, "sugar_g": 3},
    {"name_id": "Nasi Goreng", "name_en": "Fried Rice", "portion": "1 porsi (250g)", "grams": 250, "calories": 420, "protein_g": 12, "carbs_g": 60, "fat_g": 15, "sodium_mg": 950, "sugar_g": 5},
    {"name_id": "Roti Tawar", "name_en": "White Bread", "portion": "2 lembar (50g)", "grams": 50, "calories": 130, "protein_g": 4, "carbs_g": 25, "fat_g": 1.5, "sodium_mg": 230, "sugar_g": 2},
    {"name_id": "Susu Coklat", "name_en": "Chocolate Milk", "portion": "1 gelas (250ml)", "grams": 250, "calories": 190, "protein_g": 8, "carbs_g": 26, "fat_g": 6, "sodium_mg": 150, "sugar_g": 24},
]

async def seed_foods():
    if await db.foods.count_documents({}) == 0:
        await db.foods.insert_many([dict(f) for f in INDO_FOODS])
        logger.info("Seeded foods")

async def seed_demo():
    demo_email = os.environ.get("DEMO_EMAIL", "demo@nutrivane.app")
    demo_pw = os.environ.get("DEMO_PASSWORD", "demo1234")
    existing = await db.users.find_one({"email": demo_email})
    if existing is None:
        doc = {
            "email": demo_email, "password_hash": hash_password(demo_pw),
            "name": "Santri Demo", "age": 16, "gender": "male",
            "height_cm": 168, "weight_kg": 58, "goal": "healthier",
            "activity": "moderate", "language": "id", "profile_complete": True,
            "is_demo": True, "parental_consent": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.users.insert_one(doc)
        uid = str(res.inserted_id)
        base = datetime.now(timezone.utc)
        sample_days = [
            [{"meal": "breakfast", "items": [INDO_FOODS[0], INDO_FOODS[4], INDO_FOODS[10]]}],
            [{"meal": "lunch", "items": [INDO_FOODS[0], INDO_FOODS[1], INDO_FOODS[5]]},
             {"meal": "snack", "items": [INDO_FOODS[11]]}],
            [{"meal": "dinner", "items": [INDO_FOODS[13], INDO_FOODS[11]]}],
        ]
        logs = []
        for offset in range(0, 5):
            day = (base - timedelta(days=offset)).strftime("%Y-%m-%d")
            for entry in sample_days[offset % len(sample_days)]:
                logs.append({
                    "user_id": uid, "date": day, "meal": entry["meal"],
                    "items": [dict(i) for i in entry["items"]],
                    "created_at": (base - timedelta(days=offset)).isoformat(),
                })
        if logs:
            await db.food_logs.insert_many(logs)
        logger.info("Seeded demo user")
    else:
        if not verify_password(demo_pw, existing["password_hash"]):
            await db.users.update_one({"email": demo_email},
                                      {"$set": {"password_hash": hash_password(demo_pw)}})

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.food_logs.create_index([("user_id", 1), ("date", 1)])
    await seed_foods()
    await seed_demo()

@api_router.get("/")
async def root():
    return {"message": "NutriVane API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
