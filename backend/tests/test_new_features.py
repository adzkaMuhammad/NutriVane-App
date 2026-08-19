"""Backend tests for NutriVane new features: Mood analyze-text, Mood log, Journal (with upload+file serve), Weekly analysis."""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@nutrivane.app"
DEMO_PASSWORD = "demo1234"

# Tiny valid JPEG (a real 8x8 red image) - decoded from base64
JPEG_8X8_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy"
    "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIA"
    "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA"
    "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3"
    "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm"
    "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMB"
    "AAIRAxEAPwD3+iiigD//2Q=="
)


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def h(s):
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    return r.json()["token"]


# ---------------- Mood log CRUD ----------------
class TestMoodLog:
    def test_log_requires_auth(self, s):
        r = s.post(f"{API}/mood/log", json={"mood": "senang"}, timeout=10)
        assert r.status_code == 401

    def test_create_list_delete_mood(self, s, h):
        r = s.post(f"{API}/mood/log", headers=h, json={
            "mood": "senang", "mood_label": "Senang", "emoji": "😄", "source": "emoji", "note": "TEST_mood"
        }, timeout=10)
        assert r.status_code == 200
        m = r.json()
        assert m["mood"] == "senang" and m["emoji"] == "😄" and "id" in m and "_id" not in m
        mid = m["id"]

        r2 = s.get(f"{API}/mood/logs", headers=h, timeout=10)
        assert r2.status_code == 200
        assert any(x["id"] == mid for x in r2.json())

        r3 = s.delete(f"{API}/mood/log/{mid}", headers=h, timeout=10)
        assert r3.status_code == 200

        r4 = s.get(f"{API}/mood/logs", headers=h, timeout=10)
        assert not any(x["id"] == mid for x in r4.json())


# ---------------- Mood analyze-text (Gemini) ----------------
class TestMoodAnalyzeText:
    def test_requires_auth(self, s):
        r = s.post(f"{API}/mood/analyze-text", json={"story": "hi"}, timeout=10)
        assert r.status_code == 401

    def test_analyze_text(self, s, h):
        r = s.post(f"{API}/mood/analyze-text", headers=h, json={
            "story": "Hari ini aku merasa lelah sekali karena banyak PR", "language": "id"
        }, timeout=45)
        assert r.status_code in (200, 502), r.text
        if r.status_code == 200:
            data = r.json()
            assert "mood" in data
            assert data["mood"] in ["senang", "biasa", "lelah", "sedih", "stres", "cemas", "marah"]


# ---------------- Journal ----------------
class TestJournal:
    def test_journal_requires_auth(self, s):
        r = s.get(f"{API}/journal", timeout=10)
        assert r.status_code == 401

    def test_upload_and_journal_flow(self, s, h, token):
        # Upload photo -> object storage
        up = s.post(f"{API}/journal/upload", headers=h, json={
            "image_base64": f"data:image/jpeg;base64,{JPEG_8X8_B64}",
            "filename": "test.jpg",
        }, timeout=30)
        assert up.status_code == 200, up.text
        path = up.json()["path"]
        assert path.startswith("nutrivane/uploads/")

        # Serve file requires auth token via ?auth=
        r_noauth = s.get(f"{API}/files/{path}", timeout=15)
        assert r_noauth.status_code == 401

        r_file = s.get(f"{API}/files/{path}", params={"auth": token}, timeout=15)
        assert r_file.status_code == 200
        assert r_file.headers.get("content-type", "").startswith("image/")
        assert len(r_file.content) > 100

        # Create journal referencing photo
        cr = s.post(f"{API}/journal", headers=h, json={
            "content": "TEST_journal entry", "tags": ["food", "emotion"], "photo_path": path
        }, timeout=10)
        assert cr.status_code == 200
        j = cr.json()
        assert j["content"] == "TEST_journal entry"
        assert set(j["tags"]) == {"food", "emotion"}
        assert j["photo_path"] == path
        assert "id" in j and "_id" not in j
        jid = j["id"]

        # List
        lst = s.get(f"{API}/journal", headers=h, timeout=10)
        assert lst.status_code == 200
        assert any(x["id"] == jid for x in lst.json())

        # Delete
        de = s.delete(f"{API}/journal/{jid}", headers=h, timeout=10)
        assert de.status_code == 200
        lst2 = s.get(f"{API}/journal", headers=h, timeout=10)
        assert not any(x["id"] == jid for x in lst2.json())


# ---------------- Weekly analysis (Claude Haiku 4.5) ----------------
class TestWeeklyAnalysis:
    def test_requires_auth(self, s):
        r = s.get(f"{API}/analysis/weekly", timeout=10)
        assert r.status_code == 401
        r2 = s.post(f"{API}/analysis/weekly", json={"language": "id"}, timeout=10)
        assert r2.status_code == 401

    def test_run_and_fetch_weekly(self, s, h):
        r = s.post(f"{API}/analysis/weekly", headers=h, json={"language": "id"}, timeout=90)
        assert r.status_code in (200, 502), r.text
        if r.status_code == 200:
            data = r.json()
            assert "summary" in data and isinstance(data["summary"], str)
            assert "patterns" in data and isinstance(data["patterns"], list)
            assert "recommendations" in data and isinstance(data["recommendations"], list)
            assert len(data["recommendations"]) >= 1
            assert "nutrition_summary" in data

            # GET should return the latest saved report
            g = s.get(f"{API}/analysis/weekly", headers=h, timeout=10)
            assert g.status_code == 200
            gd = g.json()
            assert gd.get("summary") == data["summary"]
