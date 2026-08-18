"""Diet Planner backend tests (POST/GET/DELETE /api/diet/plan and dashboard integration)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://gizi-tracker-3.preview.emergentagent.com"
DEMO_EMAIL = "demo@nutrivane.app"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


class TestDietAuthGuards:
    def test_get_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/diet/plan", timeout=15).status_code == 401

    def test_post_requires_auth(self):
        assert requests.post(f"{BASE_URL}/api/diet/plan", json={"target_weight_kg": 52}, timeout=15).status_code == 401

    def test_delete_requires_auth(self):
        assert requests.delete(f"{BASE_URL}/api/diet/plan", timeout=15).status_code == 401


class TestDietFlow:
    def test_clear_plan_first(self, auth):
        r = requests.delete(f"{BASE_URL}/api/diet/plan", headers=auth, timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_get_empty_after_delete(self, auth):
        r = requests.get(f"{BASE_URL}/api/diet/plan", headers=auth, timeout=15)
        assert r.status_code == 200
        assert r.json() in (None, {})

    def test_dashboard_falls_back_to_profile_targets(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("diet_plan") in (None, {})
        assert d["targets"]["calories"] > 0

    def test_create_unsafe_plan(self, auth):
        """58 -> 52 in 30 days ekstrem should be unsafe, calories floored to >=1500 (male)."""
        payload = {"target_weight_kg": 52, "days": 30, "intensity": "ekstrem",
                   "meals_per_day": "3", "budget": "terjangkau", "language": "id"}
        r = requests.post(f"{BASE_URL}/api/diet/plan", json=payload, headers=auth, timeout=90)
        assert r.status_code == 200, r.text
        plan = r.json()
        assert plan["direction"] == "lose"
        assert plan["safe"] is False
        assert plan["days_min_safe"] >= 30
        assert plan["daily_targets"]["calories"] >= 1500
        assert plan["target_weight"] == 52
        assert plan["days"] == 30
        assert plan["intensity"] == "ekstrem"
        # AI content
        assert isinstance(plan.get("menu"), list)
        assert isinstance(plan.get("exercises"), list)
        assert isinstance(plan.get("tips"), list)

    def test_get_returns_saved_plan(self, auth):
        r = requests.get(f"{BASE_URL}/api/diet/plan", headers=auth, timeout=15)
        assert r.status_code == 200
        plan = r.json()
        assert plan is not None
        assert plan["target_weight"] == 52
        assert plan["daily_targets"]["calories"] >= 1500

    def test_dashboard_uses_plan_targets(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["diet_plan"] is not None
        assert d["targets"]["calories"] == d["diet_plan"]["daily_targets"]["calories"]

    def test_create_safe_plan(self, auth):
        """58 -> 55 in 90 days santai should be safe."""
        payload = {"target_weight_kg": 55, "days": 90, "intensity": "santai",
                   "meals_per_day": "3", "budget": "terjangkau", "language": "id"}
        r = requests.post(f"{BASE_URL}/api/diet/plan", json=payload, headers=auth, timeout=90)
        assert r.status_code == 200, r.text
        plan = r.json()
        assert plan["direction"] == "lose"
        assert plan["safe"] is True
        assert plan["daily_targets"]["calories"] >= 1500

    def test_delete_plan(self, auth):
        r = requests.delete(f"{BASE_URL}/api/diet/plan", headers=auth, timeout=15)
        assert r.status_code == 200
        # verify cleared
        r2 = requests.get(f"{BASE_URL}/api/diet/plan", headers=auth, timeout=15)
        assert r2.status_code == 200
        assert r2.json() in (None, {})
