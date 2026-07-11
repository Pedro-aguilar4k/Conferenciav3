"""
Inicializa a estrutura do banco de dados MongoDB para o ConferenciaV2.
Cria as colecoes e os indices otimizados para os padroes de consulta do app.
Nao insere nenhum dado (estrutura vazia).

Uso:
    python backend/init_db.py
"""
import os
import asyncio
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure
from dotenv import load_dotenv

# Carrega variaveis de ambiente (.env.development.local tem prioridade em dev)
ROOT = Path(__file__).resolve().parent.parent
for env_file in [".env.development.local", ".env.local", ".env"]:
    p = ROOT / env_file
    if p.exists():
        load_dotenv(p, override=False)

MONGO_URL = os.environ.get("MONGO_URL_2") or os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME_2") or os.environ.get("DB_NAME")

# Colecoes usadas pela aplicacao
COLLECTIONS = [
    "produtos",
    "fornecedores",
    "notas",
    "itens_nota",
    "equivalencia_produtos",
    "historico_leituras",
    "historico_aprendizado",
]

# Indices por colecao: (chaves, opcoes) - nomes padrao para evitar conflitos
INDEXES = {
    "produtos": [
        ([("id", 1)], {"unique": True}),
        ([("codigo", 1)], {}),
        ([("codigo_barras", 1)], {"sparse": True}),
    ],
    "fornecedores": [
        ([("id", 1)], {"unique": True}),
        ([("cnpj", 1)], {}),
        ([("nome", 1)], {}),
    ],
    "notas": [
        ([("id", 1)], {"unique": True}),
        ([("chave_acesso", 1)], {"sparse": True}),
        ([("numero", 1)], {}),
        ([("status", 1)], {}),
        ([("created_at", -1)], {}),
    ],
    "itens_nota": [
        ([("id", 1)], {"unique": True}),
        ([("nota_id", 1)], {}),
        ([("produto_id", 1)], {"sparse": True}),
        ([("codigo_fornecedor", 1)], {}),
    ],
    "equivalencia_produtos": [
        ([("id", 1)], {"unique": True}),
        ([("produto_id", 1)], {}),
        ([("codigo_fornecedor", 1)], {}),
        ([("fornecedor_id", 1)], {"sparse": True}),
    ],
    "historico_leituras": [
        ([("id", 1)], {"unique": True}),
        ([("nota_id", 1)], {"sparse": True}),
        ([("created_at", -1)], {}),
    ],
    "historico_aprendizado": [
        ([("id", 1)], {"unique": True}),
        ([("codigo_fornecedor", 1)], {}),
        ([("produto_id", 1)], {"sparse": True}),
        ([("created_at", -1)], {}),
    ],
}


async def main():
    if not MONGO_URL or not DB_NAME:
        raise SystemExit(
            "MONGO_URL_2/DB_NAME_2 nao definidos. Verifique as variaveis de ambiente."
        )

    print(f"Conectando ao banco '{DB_NAME}'...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Testa conexao
    await client.admin.command("ping")
    print("Conexao OK.\n")

    existing = await db.list_collection_names()

    for coll in COLLECTIONS:
        if coll in existing:
            print(f"[=] Colecao '{coll}' ja existe.")
        else:
            await db.create_collection(coll)
            print(f"[+] Colecao '{coll}' criada.")

        for keys, opts in INDEXES.get(coll, []):
            try:
                name = await db[coll].create_index(keys, **opts)
                print(f"      indice: {name}")
            except OperationFailure as e:
                # indice ja existe (possivelmente com outro nome) - ignora
                if e.code in (85, 86):
                    print(f"      indice ja existe para {keys} (ignorado)")
                else:
                    raise
        print()

    print("Resumo do banco:")
    for coll in COLLECTIONS:
        count = await db[coll].count_documents({})
        print(f"  {coll}: {count} documento(s)")

    client.close()
    print("\nEstrutura do banco inicializada com sucesso.")


if __name__ == "__main__":
    asyncio.run(main())
