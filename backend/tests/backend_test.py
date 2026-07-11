"""Backend tests for NF-e Conference System - Intelligent Matching."""
import os
import io
import pytest
import requests
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def seeded(session):
    r = session.post(f"{API}/seed", timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    return data


@pytest.fixture(scope="module")
def sample_xml(session):
    r = session.get(f"{API}/sample-xml", timeout=30)
    assert r.status_code == 200
    return r.json()["xml"]


# ── Seed ───────────────────────────────────────────────────────────
class TestSeed:
    def test_seed_creates_data(self, seeded):
        assert seeded["produtos"] == 41
        assert seeded["fornecedores"] == 5

    def test_products_persisted(self, session, seeded):
        r = session.get(f"{API}/produtos", timeout=30)
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) == 41
        codes = {p["codigo"] for p in prods}
        assert "10001" in codes
        assert "20021" in codes

    def test_suppliers_persisted(self, session, seeded):
        r = session.get(f"{API}/fornecedores", timeout=30)
        assert r.status_code == 200
        forns = r.json()
        assert len(forns) == 5


# ── XML Import & Matching ──────────────────────────────────────────
class TestXmlImport:
    def test_importar_xml(self, session, seeded, sample_xml):
        # Ensure any existing notas removed to avoid dup key
        notas = session.get(f"{API}/notas").json()
        for n in notas:
            session.delete(f"{API}/notas/{n['id']}")

        files = {"file": ("sample.xml", io.BytesIO(sample_xml.encode()), "application/xml")}
        r = requests.post(f"{API}/notas/importar-xml", files=files, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "nota" in data and "itens" in data
        assert data["nota"]["total_itens"] == 4
        # At least items 1,2 should be identified by EAN
        identified_methods = [i["metodo_identificacao"] for i in data["itens"]]
        assert "ean" in identified_methods or "vinculo" in identified_methods
        pytest.nota_id = data["nota"]["id"]
        pytest.itens = data["itens"]

    def test_ean_match_confianca_100(self):
        # Item 1 has EAN 7891234567001 - should match product 10001
        item1 = [i for i in pytest.itens if i["numero_item"] == 1][0]
        assert item1["produto_interno_codigo"] == "10001"
        assert item1["confianca"] >= 95

    def test_get_nota(self, session):
        r = session.get(f"{API}/notas/{pytest.nota_id}", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data["itens"]) == 4


# ── Recognition Center ─────────────────────────────────────────────
class TestRecognition:
    def test_list_pending(self, session):
        r = session.get(f"{API}/reconhecimento", timeout=30)
        assert r.status_code == 200
        items = r.json()
        # Items without produto_interno_id
        for it in items:
            assert it.get("produto_interno_id") is None
        pytest.reco_items = items

    def test_confirm_binding(self, session):
        if not pytest.reco_items:
            pytest.skip("No pending items to bind")
        # Pick first pending item and bind to any product
        item = pytest.reco_items[0]
        prods = session.get(f"{API}/produtos").json()
        prod_id = prods[0]["id"]
        r = session.post(f"{API}/reconhecimento/confirmar", json={
            "item_nota_id": item["id"], "produto_interno_id": prod_id
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["produto_interno_id"] == prod_id
        assert data["metodo_identificacao"] == "manual"

    def test_learning_saved(self, session):
        r = session.get(f"{API}/historico-aprendizado", timeout=30)
        assert r.status_code == 200
        hist = r.json()
        assert len(hist) >= 1

    def test_ignore_item(self, session):
        r = session.get(f"{API}/reconhecimento").json()
        if not r:
            pytest.skip("No items to ignore")
        item_id = r[0]["id"]
        resp = session.post(f"{API}/reconhecimento/ignorar/{item_id}", timeout=30)
        assert resp.status_code == 200
        # Verify it no longer appears
        after = session.get(f"{API}/reconhecimento").json()
        assert all(i["id"] != item_id for i in after)


# ── Dashboard ──────────────────────────────────────────────────────
class TestDashboard:
    def test_dashboard_metrics(self, session):
        r = session.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200
        d = r.json()
        required = ["total_notas", "reconhecimento_por_metodo", "fornecedor_errors",
                    "total_aprendizado", "precisao_reconhecimento", "notas_por_dia",
                    "top_fornecedores", "total_equivalencias"]
        for k in required:
            assert k in d, f"Missing key {k}"
        rpm = d["reconhecimento_por_metodo"]
        for k in ["ean", "vinculo", "similaridade", "manual"]:
            assert k in rpm


# ── Conference / Justificativa ─────────────────────────────────────
class TestConference:
    def test_iniciar(self, session):
        r = session.post(f"{API}/conferencias/iniciar/{pytest.nota_id}", timeout=30)
        assert r.status_code == 200
        assert r.json()["nota"]["status"] == "em_conferencia"

    def test_justificativa(self, session):
        r = session.get(f"{API}/notas/{pytest.nota_id}").json()
        item_id = r["itens"][0]["id"]
        resp = session.post(f"{API}/conferencias/justificativa", json={
            "item_nota_id": item_id, "justificativa": "TEST_quantidade excedida"
        }, timeout=30)
        assert resp.status_code == 200
        # Verify persistence
        after = session.get(f"{API}/notas/{pytest.nota_id}").json()
        item = [i for i in after["itens"] if i["id"] == item_id][0]
        assert item["justificativa_divergencia"] == "TEST_quantidade excedida"
