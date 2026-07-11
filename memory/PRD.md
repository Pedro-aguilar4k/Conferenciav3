# PRD — NF-e Check (Sistema de Conferência de NF-e)

## Problema Original
Auditoria e otimização não-invasiva de projeto React + Node/Express (na verdade
FastAPI) + MongoDB Atlas hospedado na Vercel. Regras absolutas: sem alterar
funcionalidade, fluxo, rotas, endpoints, nomes de arquivo, estrutura de pastas,
package.json, bibliotecas, configuração Vercel/React/Express, ou forma de uso do
MongoDB. Build da Vercel obrigatoriamente compatível.

## Arquitetura
- Frontend: React 19 + CRA/Craco + Tailwind + shadcn/ui em `/app/src`
- Backend: FastAPI + motor (MongoDB async) em `/app/backend/server.py`
- Deploy Vercel: `api/index.py` reexporta `app` FastAPI (função serverless)
- MongoDB Atlas via `MONGO_URL_2` + `DB_NAME_2` (env vars da Vercel)

## Personas
- Estoquista: bipa códigos de barra no fluxo de conferência de NF-e
- Operador/Administrador: gerencia produtos, fornecedores, equivalências, revisa
  reconhecimento pendente e imprime relatórios de conferência

## Requisitos Estáticos (preservados)
- Importar XML NF-e → parse → matching automático via motor multi-critério
- Vinculação manual do que ficou pendente
- Conferência com scanner (contagem +1 por bipe)
- Relatório A4 imprimível com assinaturas
- Central de Reconhecimento (batch)
- CRUD de produtos e fornecedores, exportação Excel
- Dashboard com KPIs, gráficos e taxa de erro por fornecedor

## Sessão atual — 11/07/2026 (Auditoria/Otimização)
Alterações aplicadas, todas non-breaking:

**Backend `/app/backend/server.py`:**
- Fix N+1 em `match_product`: pré-fetch único de `similar_qty_codes` fora do loop.
- Cache de request (`_cache` opcional) para produtos/bindings/count por importação.
- `/api/dashboard`: laço Python de 2N `count_documents` substituído por aggregation.
- +9 índices MongoDB idempotentes no `startup`.

**Frontend `/app/src/pages/`:**
- `Products.js`, `Suppliers.js`, `Equivalences.js`: `useEffect` duplicados unificados.
- `Dashboard.js`, `NfeImport.js`, `Conference.js`, `RecognitionCenter.js`: `useMemo`
  em derivações caras.
- `Dashboard.js`: imports e constante mortas removidas.

**Validação:**
- ✅ `yarn build` = `Compiled successfully · 270,74 kB gzip`
- ✅ `python ast.parse` OK para server.py e api/index.py
- ✅ Contrato do `/api/dashboard` idêntico (todas 16 chaves preservadas)
- ✅ Fluxo end-to-end seed → importar-xml → dashboard → reconhecimento testado

## Backlog / Ideias (não implementadas, respeitando escopo)
- P2 — code splitting por rota via `React.lazy` (fora do escopo: pode adicionar
  flash entre navegações)
- P2 — mover `db.produtos.find({'ativo': True})` para cache global entre requests
  (fora do escopo: mudaria a forma de usar o MongoDB)
- P2 — configurar `maxPoolSize` / `serverSelectionTimeoutMS` no
  `AsyncIOMotorClient` (fora do escopo: mudaria a configuração do cliente)
- P2 — connection warm-up endpoint para reduzir cold start Vercel

## Enhancement sugerido (visibilidade/UX)
Adicionar um card no Dashboard com "Tempo médio de importação XML" (ms) usando
os índices/otimizações já colocados — evidencia o ganho para o operador e cria
métrica de acompanhamento sem esforço adicional de infra.
