"""Matching engine: normalization, similarity and multi-criteria product matching."""

import re
import unicodedata
from difflib import SequenceMatcher

# ── Abbreviation dictionary ────────────────────────────────────────────────────
ABBREVIATIONS = {
    'AMORT.': 'AMORTECEDOR', 'AMORT': 'AMORTECEDOR',
    'DT': 'DIANTEIRO', 'DIANT.': 'DIANTEIRO', 'DIANT': 'DIANTEIRO',
    'TR': 'TRASEIRO', 'TRAS.': 'TRASEIRO', 'TRAS': 'TRASEIRO',
    'ESQ.': 'ESQUERDO', 'ESQ': 'ESQUERDO',
    'DIR.': 'DIREITO', 'DIR': 'DIREITO',
    'SUP.': 'SUPERIOR', 'SUP': 'SUPERIOR',
    'INF.': 'INFERIOR', 'INF': 'INFERIOR',
    'PAST.': 'PASTILHA', 'PAST': 'PASTILHA',
    'FILT.': 'FILTRO', 'FILT': 'FILTRO',
    'CJ.': 'CONJUNTO', 'CJ': 'CONJUNTO',
    'CX.': 'CAIXA', 'CX': 'CAIXA',
    'UN.': 'UNIDADE', 'UN': 'UNIDADE',
    'JG.': 'JOGO', 'JG': 'JOGO',
    'PC.': 'PECA', 'PC': 'PECA',
    'CPL.': 'COMPLETO', 'CPL': 'COMPLETO',
    'COMPR.': 'COMPRIMENTO', 'COMPR': 'COMPRIMENTO',
    'CIL.': 'CILINDRICO', 'CIL': 'CILINDRICO',
    'COMB.': 'COMBUSTIVEL', 'COMB': 'COMBUSTIVEL',
    'DISTR.': 'DISTRIBUICAO', 'DISTR': 'DISTRIBUICAO',
    'TRANSF.': 'TRANSFERENCIA', 'TRANSF': 'TRANSFERENCIA',
    'REP.': 'REPARO', 'REP': 'REPARO',
    'RET.': 'RETENTOR', 'RET': 'RETENTOR',
    'ROL.': 'ROLAMENTO', 'ROL': 'ROLAMENTO',
    'EMBRG.': 'EMBREAGEM', 'EMBRG': 'EMBREAGEM',
    'CAMBIO': 'CAMBIO',
    'RAD.': 'RADIADOR', 'RAD': 'RADIADOR',
    'TANQ.': 'TANQUE', 'TANQ': 'TANQUE',
    'FECH.': 'FECHADURA', 'FECH': 'FECHADURA',
    'CONEX.': 'CONEXAO', 'CONEX': 'CONEXAO',
    'REDUT.': 'REDUTORA', 'REDUT': 'REDUTORA',
    'MANG.': 'MANGUEIRA', 'MANG': 'MANGUEIRA',
    'RESERV.': 'RESERVATORIO', 'RESERV': 'RESERVATORIO',
    'ESTIC.': 'ESTICADOR', 'ESTIC': 'ESTICADOR',
    'LTS': 'LITROS',
    'PLAST.': 'PLASTICO', 'PLAST': 'PLASTICO',
}

STOP_WORDS = {
    'DE', 'DO', 'DA', 'DOS', 'DAS', 'O', 'A', 'OS', 'AS',
    'UM', 'UMA', 'E', 'OU', 'COM', 'SEM', 'PARA', 'POR',
    'NO', 'NA', 'NOS', 'NAS', 'AO', 'AOS', 'EM',
}


# ── Text normalization ─────────────────────────────────────────────────────────

def strip_manufacturer_code(text: str) -> str:
    """Strip manufacturer code prefix from NF-e descriptions.

    Examples:
        '403 997 02 30 - BUJAO CARTER...' → 'BUJAO CARTER...'
        '2T2145299A - ESTICADOR...'       → 'ESTICADOR...'
    """
    if not text:
        return text
    match = re.match(r'^[A-Za-z0-9][A-Za-z0-9\s\.\/]{2,30}?\s*[-]\s+(.+)$', text.strip())
    if match:
        return match.group(1).strip()
    return text


def normalize_text(text: str) -> str:
    """Remove accents, uppercase, expand abbreviations, remove stop words."""
    if not text:
        return ""
    text = strip_manufacturer_code(text)
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')
    text = text.upper().strip()
    for abbr, full in sorted(ABBREVIATIONS.items(), key=lambda x: -len(x[0])):
        text = re.sub(r'\b' + re.escape(abbr) + r'\b', full, text)
    text = re.sub(r'[^A-Z0-9\s]', ' ', text)
    words = [w for w in text.split() if w not in STOP_WORDS and len(w) > 1]
    return ' '.join(words)


# ── Similarity ─────────────────────────────────────────────────────────────────

def calculate_similarity(text1: str, text2: str) -> float:
    """Combined sequence + token similarity (0–100)."""
    if not text1 or not text2:
        return 0.0
    seq_ratio = SequenceMatcher(None, text1, text2).ratio() * 100
    tokens1, tokens2 = set(text1.split()), set(text2.split())
    if not tokens1 or not tokens2:
        return seq_ratio
    overlap = tokens1 & tokens2
    token_ratio = len(overlap) / max(len(tokens1), len(tokens2)) * 100
    return round(seq_ratio * 0.4 + token_ratio * 0.6, 1)


def extract_manufacturer_code(text: str):
    """Extract manufacturer/part code from the beginning of a description.

    Patterns: '403 997 02 30 - BUJAO...', '2T2145299A - ESTICADOR...', 'BG1X9K614AA - TOMADA AR'
    """
    if not text:
        return None
    text = text.strip()
    match = re.match(r'^([A-Za-z0-9][A-Za-z0-9\s\.\/]{2,30}?)\s*[-]\s+', text)
    if match:
        code = match.group(1).strip()
        code_clean = re.sub(r'[\s\.\-\/]', '', code.upper())
        if len(code_clean) >= 4:
            return code_clean
    return None


# ── Matching engine ────────────────────────────────────────────────────────────

async def match_product(db, Produto, item_desc: str, item_ean, item_cprod: str,
                        fornecedor_cnpj: str, quantidade: float = 0, _cache=None):
    """Multi-criteria intelligent matching engine with weighted scoring.

    Parameters
    ----------
    db:
        AsyncIOMotorDatabase instance (injected to keep this module DB-agnostic).
    Produto:
        The Pydantic model class used to deserialise product documents.
    _cache:
        Optional dict shared across items of the same NF-e to avoid N×M queries
        (products list, supplier bindings, supplier nota count).
    """
    from datetime import datetime, timezone

    # ── Criterion 1: EAN exact match → weight 100 ─────────────────────────────
    if item_ean and item_ean not in ('SEM GTIN', '', 'None', '0'):
        product = await db.produtos.find_one({'ean': item_ean, 'ativo': True})
        if product:
            p = Produto.from_mongo(product)
            return {
                'produto': {'id': p.id, 'codigo': p.codigo, 'descricao': p.descricao},
                'metodo': 'ean',
                'confianca': 100,
                'sugestoes': [],
                'criterios': [{'criterio': 'EAN Identico', 'peso': 100}],
            }

    # ── Criterion 2: Supplier + cProd binding → weight 95-99 ──────────────────
    if fornecedor_cnpj and item_cprod:
        binding = await db.equivalencia_produtos.find_one({
            'fornecedor_cnpj': fornecedor_cnpj, 'codigo_fornecedor': item_cprod
        })
        if binding:
            product = await db.produtos.find_one({'codigo': binding['produto_interno_codigo'], 'ativo': True})
            if product:
                p = Produto.from_mongo(product)
                usage = binding.get('utilizacoes', 0)
                score = 95
                if usage >= 10:
                    score = 99
                elif usage >= 5:
                    score = 98
                elif usage >= 2:
                    score = 97
                elif usage >= 1:
                    score = 96
                await db.equivalencia_produtos.update_one(
                    {'_id': binding['_id']},
                    {'$inc': {'utilizacoes': 1},
                     '$set': {'ultima_utilizacao': datetime.now(timezone.utc).isoformat()}}
                )
                return {
                    'produto': {'id': p.id, 'codigo': p.codigo, 'descricao': p.descricao},
                    'metodo': 'vinculo',
                    'confianca': score,
                    'sugestoes': [],
                    'criterios': [{'criterio': 'Vinculo Fornecedor+Codigo', 'peso': score}],
                }

    # ── Multi-criteria scoring ─────────────────────────────────────────────────
    if _cache is not None and 'all_products' in _cache:
        all_products = _cache['all_products']
    else:
        all_products = await db.produtos.find({'ativo': True}).to_list(2000)
        if _cache is not None:
            _cache['all_products'] = all_products

    normalized_desc = normalize_text(item_desc)
    mfg_code = extract_manufacturer_code(item_desc)

    # Pre-fetch supplier bindings for bonus calculation
    if _cache is not None and 'binding_codes' in _cache:
        existing_binding_codes = _cache['binding_codes']
    else:
        existing_binding_codes = set()
        if fornecedor_cnpj:
            async for b in db.equivalencia_produtos.find(
                {'fornecedor_cnpj': fornecedor_cnpj}, {'produto_interno_codigo': 1}
            ):
                existing_binding_codes.add(b.get('produto_interno_codigo', ''))
        if _cache is not None:
            _cache['binding_codes'] = existing_binding_codes

    # Check if supplier is recurring
    if _cache is not None and 'supplier_nota_count' in _cache:
        supplier_nota_count = _cache['supplier_nota_count']
    else:
        supplier_nota_count = 0
        if fornecedor_cnpj:
            supplier_nota_count = await db.notas.count_documents({'fornecedor_cnpj': fornecedor_cnpj})
        if _cache is not None:
            _cache['supplier_nota_count'] = supplier_nota_count

    # Pre-fetch similar-quantity codes (single query instead of one per candidate)
    similar_qty_codes = set()
    if quantidade > 0 and item_cprod:
        qty_min = quantidade * 0.8
        qty_max = quantidade * 1.2
        async for it in db.itens_nota.find(
            {
                'cprod': item_cprod,
                'produto_interno_codigo': {'$ne': None},
                'quantidade': {'$gte': qty_min, '$lte': qty_max},
            },
            {'produto_interno_codigo': 1},
        ):
            code = it.get('produto_interno_codigo')
            if code:
                similar_qty_codes.add(code)

    suggestions = []
    for prod in all_products:
        p = Produto.from_mongo(prod)
        best_score = 0
        criterios = []

        # Criterion 3: Manufacturer code match → weight 90
        if mfg_code:
            prod_mfg_code = extract_manufacturer_code(p.descricao)
            if prod_mfg_code and mfg_code == prod_mfg_code:
                best_score = 90
                criterios.append({'criterio': 'Codigo Fabricante', 'peso': 90})

        # Criterion 4: Description similarity → variable weight
        sim = calculate_similarity(normalized_desc, normalize_text(p.descricao))
        if sim > best_score:
            best_score = sim
        if sim >= 30:
            criterios.append({'criterio': 'Similaridade', 'peso': round(sim, 1)})

        # Bonuses
        if p.codigo in existing_binding_codes:
            best_score += 5
            criterios.append({'criterio': 'Vinculo Anterior', 'peso': 5, 'bonus': True})

        if supplier_nota_count >= 3:
            best_score += 3
            criterios.append({'criterio': 'Fornecedor Recorrente', 'peso': 3, 'bonus': True})

        if p.codigo in similar_qty_codes:
            best_score += 2
            criterios.append({'criterio': 'Quantidade Similar', 'peso': 2, 'bonus': True})

        best_score = min(best_score, 99)

        if best_score >= 40:
            suggestions.append({
                'produto': {'id': p.id, 'codigo': p.codigo, 'descricao': p.descricao, 'ean': p.ean},
                'similaridade': round(best_score, 1),
                'criterios': criterios,
            })

    suggestions.sort(key=lambda x: x['similaridade'], reverse=True)
    top = suggestions[:5]

    if top and top[0]['similaridade'] >= 95:
        return {
            'produto': top[0]['produto'], 'metodo': 'vinculo_aprendido',
            'confianca': top[0]['similaridade'], 'sugestoes': top,
            'criterios': top[0].get('criterios', []),
        }
    elif top and top[0]['similaridade'] >= 90:
        return {
            'produto': top[0]['produto'], 'metodo': 'similaridade',
            'confianca': top[0]['similaridade'], 'sugestoes': top,
            'criterios': top[0].get('criterios', []),
        }
    elif top:
        return {
            'produto': None, 'metodo': 'sugestao',
            'confianca': top[0]['similaridade'], 'sugestoes': top,
            'criterios': [],
        }
    return {'produto': None, 'metodo': 'nenhum', 'confianca': 0, 'sugestoes': [], 'criterios': []}
