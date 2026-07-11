"""Backend tests for mandatory Product Binding (Vinculacao) flow."""
import os
import io
import pytest
import requests
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def state():
    return {}


@pytest.fixture(scope="module", autouse=True)
def setup(state):
    # Reset seed
    r = requests.post(f"{API}/seed", timeout=60)
    assert r.status_code == 200
    # Delete existing notas
    notas = requests.get(f"{API}/notas").json()
    for n in notas:
        requests.delete(f"{API}/notas/{n['id']}")
    # Import sample XML
    xml = requests.get(f"{API}/sample-xml").json()["xml"]
    files = {"file": ("s.xml", io.BytesIO(xml.encode()), "application/xml")}
    r = requests.post(f"{API}/notas/importar-xml", files=files, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    state["nota_id"] = data["nota"]["id"]
    state["itens"] = data["itens"]
    yield


# ── Vinculacao endpoint ────────────────────────────────────────────
class TestVinculacaoEndpoint:
    def test_get_vinculacao_returns_counts(self, state):
        r = requests.get(f"{API}/vinculacao/{state['nota_id']}")
        assert r.status_code == 200
        d = r.json()
        assert "nota" in d and "pendentes" in d and "vinculados" in d
        assert "todos_vinculados" in d
        assert "total_pendentes" in d
        assert "total_vinculados" in d
        # 4 items: item 1,2 match by EAN; item 3 by learned; item 4 pending
        assert d["total_vinculados"] >= 2
        state["pendente"] = d["pendentes"][0] if d["pendentes"] else None
        state["initial_pendentes"] = d["total_pendentes"]

    def test_vinculacao_404_invalid_id(self):
        # Valid ObjectId format but non-existent
        r = requests.get(f"{API}/vinculacao/507f1f77bcf86cd799439011")
        assert r.status_code == 404


# ── Iniciar conferencia blocking ───────────────────────────────────
class TestIniciarBlocking:
    def test_iniciar_blocks_when_pending(self, state):
        # There should be at least 1 pending item
        if state.get("initial_pendentes", 0) == 0:
            pytest.skip("No pending items to test blocking")
        r = requests.post(f"{API}/conferencias/iniciar/{state['nota_id']}")
        assert r.status_code == 400
        assert "vinculo" in r.json().get("detail", "").lower()


# ── Buscar-codigo endpoint ─────────────────────────────────────────
class TestBuscarCodigo:
    def test_buscar_by_valid_code(self):
        r = requests.get(f"{API}/produtos/buscar-codigo/10018")
        assert r.status_code == 200
        d = r.json()
        assert d["codigo"] == "10018"
        assert "BUCHA" in d["descricao"].upper()

    def test_buscar_by_invalid_code(self):
        r = requests.get(f"{API}/produtos/buscar-codigo/ZZZ9999")
        assert r.status_code == 404


# ── Confirmar vinculo by code ──────────────────────────────────────
class TestConfirmVinculo:
    def test_confirm_by_codigo_string(self, state):
        pend = state.get("pendente")
        if not pend:
            pytest.skip("No pending item to bind")
        # Bind pending item (BUCHA BANDEJA) to product 10018
        r = requests.post(f"{API}/conferencias/confirmar-vinculo", json={
            "item_nota_id": pend["id"],
            "produto_interno_codigo": "10018",
            "origem_vinculo": "manual",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["produto_interno_codigo"] == "10018"
        assert d["metodo_identificacao"] == "manual"
        # Verify equivalencia saved with origem_vinculo
        eqs = requests.get(f"{API}/equivalencias").json()
        matches = [e for e in eqs if e["codigo_fornecedor"] == pend["cprod"]]
        assert len(matches) >= 1
        assert matches[0].get("origem_vinculo") in ("manual", "similaridade", "ean", "codigo_fornecedor")

    def test_confirm_invalid_code_returns_404(self, state):
        # Use the first item (already bound), any item_nota_id
        r = requests.get(f"{API}/notas/{state['nota_id']}")
        item_id = r.json()["itens"][0]["id"]
        r = requests.post(f"{API}/conferencias/confirmar-vinculo", json={
            "item_nota_id": item_id,
            "produto_interno_codigo": "NONEXISTENT_CODE",
        })
        assert r.status_code == 404


# ── After binding, iniciar should succeed ─────────────────────────
class TestIniciarAfterBinding:
    def test_todos_vinculados_true_after(self, state):
        r = requests.get(f"{API}/vinculacao/{state['nota_id']}").json()
        assert r["todos_vinculados"] is True

    def test_iniciar_succeeds(self, state):
        r = requests.post(f"{API}/conferencias/iniciar/{state['nota_id']}")
        assert r.status_code == 200, r.text
        assert r.json()["nota"]["status"] == "em_conferencia"
