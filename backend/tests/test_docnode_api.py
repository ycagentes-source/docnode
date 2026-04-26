"""Comprehensive Docnode API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://docnode-preview.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@docnode.com", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def user_a():
    email = f"TEST_a_{uuid.uuid4().hex[:8]}@docnode.com"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST A", "email": email, "password": "senha123"})
    assert r.status_code == 200, r.text
    login = requests.post(f"{API}/auth/login", json={"email": email, "password": "senha123"})
    assert login.status_code == 200
    return {"email": email, "token": login.json()["access_token"], "user": login.json()["user"]}


@pytest.fixture(scope="module")
def user_b():
    email = f"TEST_b_{uuid.uuid4().hex[:8]}@docnode.com"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST B", "email": email, "password": "senha123"})
    assert r.status_code == 200, r.text
    login = requests.post(f"{API}/auth/login", json={"email": email, "password": "senha123"})
    assert login.status_code == 200
    return {"email": email, "token": login.json()["access_token"], "user": login.json()["user"]}


# ---------------- Health & Meta ----------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["app"] == "Docnode"

    def test_meta(self):
        r = requests.get(f"{API}/meta")
        assert r.status_code == 200
        d = r.json()
        assert "tipos_documento" in d and "parentescos" in d and d["lembretes"] == [7, 15, 30, 60, 90]


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self, admin_token):
        assert admin_token

    def test_me(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=auth_headers(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == "admin@docnode.com"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@docnode.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_register_duplicate(self, user_a):
        r = requests.post(f"{API}/auth/register", json={"name": "Dup", "email": user_a["email"], "password": "senha123"})
        assert r.status_code == 400

    def test_forgot_and_reset_password(self):
        email = f"TEST_reset_{uuid.uuid4().hex[:8]}@docnode.com"
        requests.post(f"{API}/auth/register", json={"name": "Reset", "email": email, "password": "senha123"})
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        token = r.json().get("reset_token")
        assert token
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "novasenha456"})
        assert r2.status_code == 200
        # Login with new password
        lr = requests.post(f"{API}/auth/login", json={"email": email, "password": "novasenha456"})
        assert lr.status_code == 200

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "bogus", "new_password": "x123456"})
        assert r.status_code == 400

    def test_update_profile(self, user_a):
        r = requests.put(f"{API}/auth/profile", json={"name": "TEST A Updated"}, headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["name"] == "TEST A Updated"

    def test_change_password_wrong_current(self, user_a):
        r = requests.post(f"{API}/auth/change-password",
                          json={"current_password": "wrong", "new_password": "x123456"},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 400

    def test_logout(self, admin_token):
        r = requests.post(f"{API}/auth/logout", headers=auth_headers(admin_token))
        assert r.status_code == 200


# ---------------- Familiares ----------------
class TestFamiliares:
    fam_id = None

    def test_create(self, user_a):
        r = requests.post(f"{API}/familiares",
                          json={"nome": "TEST João", "parentesco": "filho"},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200, r.text
        TestFamiliares.fam_id = r.json()["id"]
        assert r.json()["nome"] == "TEST João"

    def test_create_invalid_parentesco(self, user_a):
        r = requests.post(f"{API}/familiares",
                          json={"nome": "X", "parentesco": "primo"},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 400

    def test_list(self, user_a):
        r = requests.get(f"{API}/familiares", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert any(f["id"] == TestFamiliares.fam_id for f in r.json())

    def test_get_single(self, user_a):
        r = requests.get(f"{API}/familiares/{TestFamiliares.fam_id}", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200

    def test_update(self, user_a):
        r = requests.put(f"{API}/familiares/{TestFamiliares.fam_id}",
                         json={"nome": "TEST João 2", "parentesco": "filho", "observacoes": "obs"},
                         headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["nome"] == "TEST João 2"

    def test_isolation(self, user_b):
        r = requests.get(f"{API}/familiares/{TestFamiliares.fam_id}", headers=auth_headers(user_b["token"]))
        assert r.status_code == 404
        rd = requests.delete(f"{API}/familiares/{TestFamiliares.fam_id}",
                             json={"apagar_documentos": False},
                             headers=auth_headers(user_b["token"]))
        assert rd.status_code == 404


# ---------------- Documentos ----------------
class TestDocumentos:
    doc_id = None

    def test_create_invalid_tipo(self, user_a):
        r = requests.post(f"{API}/documentos",
                          json={"nome": "X", "tipo": "invalid_tipo"},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 400

    def test_create_invalid_lembrete(self, user_a):
        r = requests.post(f"{API}/documentos",
                          json={"nome": "X", "tipo": "cpf", "lembretes": [{"dias_antes": 5, "ativo": True}]},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 400

    def test_create(self, user_a):
        from datetime import datetime, timedelta, timezone
        venc = (datetime.now(timezone.utc) + timedelta(days=15)).date().isoformat()
        r = requests.post(f"{API}/documentos",
                          json={"nome": "TEST CNH", "tipo": "cnh", "data_vencimento": venc,
                                "arquivo_base64": "aGVsbG8=", "arquivo_nome": "cnh.txt", "arquivo_tipo": "text/plain",
                                "lembretes": [{"dias_antes": 7, "ativo": True}]},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        TestDocumentos.doc_id = body["id"]
        assert body["status"] == "vencendo_em_breve"
        assert body["has_arquivo"] is True

    def test_create_vencido(self, user_a):
        from datetime import datetime, timedelta, timezone
        venc = (datetime.now(timezone.utc) - timedelta(days=5)).date().isoformat()
        r = requests.post(f"{API}/documentos",
                          json={"nome": "TEST Vencido", "tipo": "rg", "data_vencimento": venc},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "vencido"

    def test_create_ativo(self, user_a):
        from datetime import datetime, timedelta, timezone
        venc = (datetime.now(timezone.utc) + timedelta(days=120)).date().isoformat()
        r = requests.post(f"{API}/documentos",
                          json={"nome": "TEST Ativo", "tipo": "passaporte", "data_vencimento": venc},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "ativo"

    def test_create_sem_vencimento(self, user_a):
        r = requests.post(f"{API}/documentos",
                          json={"nome": "TEST SemVenc", "tipo": "outro"},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "sem_vencimento"

    def test_get_detail_includes_arquivo(self, user_a):
        r = requests.get(f"{API}/documentos/{TestDocumentos.doc_id}", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json().get("arquivo_base64") == "aGVsbG8="

    def test_list_excludes_arquivo(self, user_a):
        r = requests.get(f"{API}/documentos", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        for d in r.json():
            assert "arquivo_base64" not in d

    def test_filter_q(self, user_a):
        r = requests.get(f"{API}/documentos?q=CNH", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert any("CNH" in d["nome"] for d in r.json())

    def test_filter_status(self, user_a):
        r = requests.get(f"{API}/documentos?status_filter=vencido", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert all(d["status"] == "vencido" for d in r.json())

    def test_remove_arquivo(self, user_a):
        r = requests.delete(f"{API}/documentos/{TestDocumentos.doc_id}/arquivo",
                            headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        rd = requests.get(f"{API}/documentos/{TestDocumentos.doc_id}", headers=auth_headers(user_a["token"]))
        assert rd.json().get("arquivo_base64") in (None, "")
        assert rd.json()["has_arquivo"] is False

    def test_isolation(self, user_b):
        r = requests.get(f"{API}/documentos/{TestDocumentos.doc_id}", headers=auth_headers(user_b["token"]))
        assert r.status_code == 404
        rd = requests.delete(f"{API}/documentos/{TestDocumentos.doc_id}", headers=auth_headers(user_b["token"]))
        assert rd.status_code == 404


# ---------------- Dashboard / Vencimentos ----------------
class TestDashboard:
    def test_dashboard(self, user_a):
        r = requests.get(f"{API}/dashboard", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        d = r.json()
        for k in ("user_name", "familiares_count", "documentos_count", "documentos_vencidos",
                  "documentos_vencendo", "documentos_sem_vencimento", "proximos_vencimentos"):
            assert k in d
        assert d["documentos_count"] >= 1
        assert d["documentos_vencidos"] >= 1

    def test_vencimentos_buckets(self, user_a):
        r = requests.get(f"{API}/vencimentos", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        d = r.json()
        for k in ("vencidos", "proximos_7", "proximos_30", "depois"):
            assert k in d


# ---------------- Account deletion cascade ----------------
class TestAccountDeletion:
    def test_delete_account_cascades(self):
        email = f"TEST_del_{uuid.uuid4().hex[:8]}@docnode.com"
        requests.post(f"{API}/auth/register", json={"name": "Del", "email": email, "password": "senha123"})
        login = requests.post(f"{API}/auth/login", json={"email": email, "password": "senha123"}).json()
        token = login["access_token"]
        h = auth_headers(token)
        # Create familiar + documento
        fam = requests.post(f"{API}/familiares", json={"nome": "TEST X", "parentesco": "eu"}, headers=h).json()
        requests.post(f"{API}/documentos",
                      json={"nome": "TEST D", "tipo": "cpf", "familiar_id": fam["id"]}, headers=h)
        # Delete account
        rd = requests.delete(f"{API}/auth/account", headers=h)
        assert rd.status_code == 200
        # /me should now fail
        rme = requests.get(f"{API}/auth/me", headers=h)
        assert rme.status_code == 401
