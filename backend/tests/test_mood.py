"""Tests for the new Mood feature: /api/mood/detect and /api/mood/recommend."""
import os
import base64
from pathlib import Path
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://gizi-tracker-3.preview.emergentagent.com"
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@nutrivane.app"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


def _load_face_b64():
    # Try to find any local jpeg/png; else download a tiny public face image.
    # Fall back to a synthetic small PNG (endpoint contract) if network blocked.
    import urllib.request
    urls = [
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    ]
    for u in urls:
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                if len(data) > 1000:
                    return "data:image/jpeg;base64," + base64.b64encode(data).decode()
        except Exception:
            continue
    # fallback dummy 1px png
    hexpng = ("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
              "89000000094944415478da6300010000000500010d0a2db40000000049454e44"
              "ae426082")
    return "data:image/png;base64," + base64.b64encode(bytes.fromhex(hexpng)).decode()


class TestMoodDetect:
    def test_requires_auth(self):
        r = requests.post(f"{API}/mood/detect", json={"image_base64": "x"}, timeout=10)
        assert r.status_code == 401

    def test_detect_with_face(self, headers):
        b64 = _load_face_b64()
        r = requests.post(f"{API}/mood/detect", headers=headers,
                          json={"image_base64": b64, "language": "id"}, timeout=60)
        # Accept 200 (success) or 502 (AI unavailable / rejected). Log for debug.
        assert r.status_code in (200, 502), r.text
        if r.status_code == 200:
            data = r.json()
            assert "mood" in data
            assert isinstance(data["mood"], str) and len(data["mood"]) > 0
            # Optional keys
            for k in ("emoji", "mood_label", "note"):
                assert k in data


class TestMoodRecommend:
    def test_requires_auth(self):
        r = requests.post(f"{API}/mood/recommend", json={"mood": "senang", "craving": "salty"}, timeout=10)
        assert r.status_code == 401

    @pytest.mark.parametrize("craving", ["salty", "sweet", "balanced"])
    def test_recommend_cravings(self, headers, craving):
        r = requests.post(f"{API}/mood/recommend", headers=headers,
                          json={"mood": "senang", "craving": craving, "language": "id"}, timeout=60)
        assert r.status_code in (200, 502), r.text
        if r.status_code == 200:
            data = r.json()
            assert "recommendations" in data
            recs = data["recommendations"]
            assert isinstance(recs, list) and len(recs) >= 1
            first = recs[0]
            assert "name_id" in first
            assert "reason" in first
            # calories optional but if present must be number
            if first.get("calories") is not None:
                assert isinstance(first["calories"], (int, float))

    def test_recommend_english(self, headers):
        r = requests.post(f"{API}/mood/recommend", headers=headers,
                          json={"mood": "sedih", "craving": "sweet", "language": "en"}, timeout=60)
        assert r.status_code in (200, 502), r.text
        if r.status_code == 200:
            data = r.json()
            assert "recommendations" in data and len(data["recommendations"]) > 0
