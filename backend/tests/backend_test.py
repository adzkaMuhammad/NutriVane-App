"""NutriVane backend API tests."""
import os
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://gizi-tracker-3.preview.emergentagent.com"
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@nutrivane.app"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def demo_token(s):
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == DEMO_EMAIL
    assert data["user"]["is_demo"] is True
    assert data["user"]["profile_complete"] is True
    assert "targets" in data["user"] and data["user"]["targets"]["calories"] > 0
    return data["token"]


@pytest.fixture(scope="session")
def demo_h(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_login_demo(self, demo_token):
        assert isinstance(demo_token, str) and len(demo_token) > 20

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_requires_auth(self, s):
        r = s.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me_with_token(self, s, demo_h):
        r = s.get(f"{API}/auth/me", headers=demo_h, timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == DEMO_EMAIL

    def test_register_and_profile_flow(self, s):
        email = f"test_{uuid.uuid4().hex[:8]}@nutrivane.app"
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "pass1234", "name": "Test User", "parental_consent": True
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        token = data["token"]
        assert data["user"]["profile_complete"] is False
        h = {"Authorization": f"Bearer {token}"}

        # Duplicate email
        r2 = s.post(f"{API}/auth/register", json={
            "email": email, "password": "pass1234", "name": "X", "parental_consent": True
        }, timeout=10)
        assert r2.status_code == 400

        # Update profile -> computes targets
        r3 = s.put(f"{API}/profile", headers=h, json={
            "age": 17, "gender": "male", "height_cm": 170, "weight_kg": 60,
            "goal": "maintain", "activity": "moderate", "language": "id"
        }, timeout=10)
        assert r3.status_code == 200
        u = r3.json()
        assert u["profile_complete"] is True
        assert u["targets"]["calories"] > 1500
        assert u["targets"]["bmi"] > 0
        assert u["targets"]["bmr"] > 0

        # Verify persistence
        r4 = s.get(f"{API}/auth/me", headers=h, timeout=10)
        assert r4.status_code == 200
        assert r4.json()["age"] == 17
        assert r4.json()["weight_kg"] == 60


# ---------------- Foods ----------------
class TestFoods:
    def test_list_foods(self, s):
        r = s.get(f"{API}/foods", timeout=10)
        assert r.status_code == 200
        foods = r.json()
        assert isinstance(foods, list) and len(foods) > 5
        assert "name_id" in foods[0]

    def test_search_foods(self, s):
        r = s.get(f"{API}/foods", params={"q": "nasi"}, timeout=10)
        assert r.status_code == 200
        assert any("Nasi" in f.get("name_id", "") for f in r.json())


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard_demo(self, s, demo_h):
        r = s.get(f"{API}/dashboard", headers=demo_h, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "totals" in data and "targets" in data and "week" in data
        assert len(data["week"]) == 7
        assert data["targets"]["calories"] > 0


# ---------------- Food logs CRUD ----------------
class TestFoodLogs:
    def test_create_list_delete_log(self, s, demo_h):
        item = {
            "name_id": "TEST_Nasi", "name_en": "TEST_Rice", "portion": "1 porsi",
            "grams": 100, "calories": 200, "protein_g": 5, "carbs_g": 40, "fat_g": 2,
            "sodium_mg": 100, "sugar_g": 1,
        }
        r = s.post(f"{API}/logs/food", headers=demo_h,
                   json={"items": [item], "meal": "snack"}, timeout=10)
        assert r.status_code == 200
        log = r.json()
        assert "id" in log and log["meal"] == "snack"
        lid = log["id"]

        r2 = s.get(f"{API}/logs/food", headers=demo_h, timeout=10)
        assert r2.status_code == 200
        assert any(l["id"] == lid for l in r2.json())

        r3 = s.delete(f"{API}/logs/food/{lid}", headers=demo_h, timeout=10)
        assert r3.status_code == 200

        r4 = s.get(f"{API}/logs/food", headers=demo_h, timeout=10)
        assert not any(l["id"] == lid for l in r4.json())


# ---------------- AI scan (Gemini) ----------------
# 1x1 PNG - tests the endpoint contract; AI may still return a response.
PNG_1PX = base64.b64encode(
    bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "89000000094944415478da6300010000000500010d0a2db40000000049454e44"
        "ae426082"
    )
).decode()


class TestScan:
    def test_scan_requires_auth(self, s):
        r = s.post(f"{API}/scan/food", json={"image_base64": PNG_1PX}, timeout=10)
        assert r.status_code == 401

    def test_scan_food_endpoint(self, s, demo_h):
        # Accept 200 (AI returned) or 502 (AI failed on tiny image) - contract check
        r = s.post(f"{API}/scan/food", headers=demo_h,
                   json={"image_base64": PNG_1PX, "language": "id"}, timeout=60)
        assert r.status_code in (200, 502), r.text
        if r.status_code == 200:
            data = r.json()
            assert "items" in data
