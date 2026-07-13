"""NF-e XML parser — extracts header and item list from a NF-e 4.00 XML file."""

import re
import xml.etree.ElementTree as ET

NFE_NS = 'http://www.portalfiscal.inf.br/nfe'


def parse_nfe_xml(xml_content: bytes | str) -> tuple[dict, list[dict]]:
    """Parse a NF-e XML and return ``(header, items)``.

    Parameters
    ----------
    xml_content:
        Raw bytes or str of the NF-e XML file.

    Returns
    -------
    header: dict
        Keys: chave, numero, serie, data_emissao, fornecedor_cnpj,
              fornecedor_nome, valor_total.
    items: list[dict]
        Each item has: numero_item, cprod, ean, descricao_nfe, ncm, cfop,
        quantidade, unidade, valor_unitario, valor_total.
    """
    if isinstance(xml_content, bytes):
        xml_str = xml_content.decode('utf-8', errors='replace')
    else:
        xml_str = xml_content

    root = ET.fromstring(xml_str)
    ns = {'nfe': NFE_NS}

    def fe(parent, path):
        if parent is None:
            return None
        el = parent.find(f'nfe:{path}', ns)
        if el is None:
            el = parent.find(path)
        return el

    def ft(parent, path):
        el = fe(parent, path)
        return el.text if el is not None else None

    infNFe = root.find('.//nfe:infNFe', ns)
    if infNFe is None:
        infNFe = root.find('.//infNFe')
    if infNFe is None:
        # Fallback: strip namespace declarations and retry
        xml_clean = re.sub(r'\sxmlns[^"]*"[^"]*"', '', xml_str)
        root = ET.fromstring(xml_clean)
        infNFe = root.find('.//infNFe')
    if infNFe is None:
        raise ValueError("XML invalido: elemento infNFe nao encontrado")

    ide = fe(infNFe, 'ide')
    emit = fe(infNFe, 'emit')
    total = fe(infNFe, 'total')
    icms_tot = fe(total, 'ICMSTot') if total else None
    chave = infNFe.get('Id', '').replace('NFe', '')

    header = {
        'chave': chave,
        'numero': ft(ide, 'nNF'),
        'serie': ft(ide, 'serie'),
        'data_emissao': ft(ide, 'dhEmi'),
        'fornecedor_cnpj': ft(emit, 'CNPJ'),
        'fornecedor_nome': ft(emit, 'xNome'),
        'valor_total': float(ft(icms_tot, 'vNF') or 0),
    }

    items = []
    det_list = infNFe.findall('nfe:det', ns) or infNFe.findall('det')
    for det in det_list:
        prod = fe(det, 'prod')
        if prod is None:
            continue
        ean_raw = ft(prod, 'cEAN') or ''
        if ean_raw in ('SEM GTIN', '', 'None'):
            ean_raw = ft(prod, 'cEANTrib') or ''
        if ean_raw in ('SEM GTIN', ''):
            ean_raw = None
        items.append({
            'numero_item': int(det.get('nItem', 0)),
            'cprod': ft(prod, 'cProd') or '',
            'ean': ean_raw,
            'descricao_nfe': ft(prod, 'xProd') or '',
            'ncm': ft(prod, 'NCM'),
            'cfop': ft(prod, 'CFOP'),
            'quantidade': float(ft(prod, 'qCom') or 0),
            'unidade': ft(prod, 'uCom') or 'UN',
            'valor_unitario': float(ft(prod, 'vUnCom') or 0),
            'valor_total': float(ft(prod, 'vProd') or 0),
        })

    return header, items
