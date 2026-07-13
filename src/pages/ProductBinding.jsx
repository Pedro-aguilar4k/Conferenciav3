import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Check, Link2, PlayCircle, Plus, Brain, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const isValidEan = (ean) => ean && /^\d{8,14}$/.test(ean);

export default function ProductBinding() {
  const { notaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/vinculacao/${notaId}`);
      setData(res.data);
    } catch (e) {
      toast.error('Erro ao carregar dados da nota');
      navigate('/notas');
    } finally { setLoading(false); }
  }, [notaId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { inputRef.current?.focus(); }, [data]);

  const current = data?.pendentes?.[0] || null;

  const handleCodeChange = (value) => {
    setCodeInput(value);
    setNotFound(false);
  };

  const confirmBinding = async (codigo) => {
    if (!current || saving) return;
    setSaving(true);
    try {
      await axios.post(`${API}/conferencias/confirmar-vinculo`, {
        item_nota_id: current.id,
        produto_interno_codigo: codigo,
        origem_vinculo: 'manual',
      });
      toast.success(`Vinculado: ${codigo}`);
      setCodeInput('');
      setNotFound(false);
      await fetchData();
    } catch (e) {
      if (e.response?.status === 404) setNotFound(true);
      else toast.error(e.response?.data?.detail || 'Erro ao vincular');
    } finally { setSaving(false); }
  };

  const handleEnter = async (e) => {
    if (e.key !== 'Enter' || !codeInput.trim()) return;
    await confirmBinding(codeInput.trim());
  };

  const handleCreateProduct = async () => {
    if (!current || !codeInput.trim() || saving) return;
    setSaving(true);
    try {
      await axios.post(`${API}/produtos`, {
        codigo: codeInput.trim(),
        descricao: current.descricao_nfe,
        ean: isValidEan(current.ean) ? current.ean : null,
        unidade: current.unidade || 'UN',
      });
      setSaving(false);
      await confirmBinding(codeInput.trim());
      toast.success('Produto cadastrado e vinculado!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao cadastrar produto');
      setSaving(false);
    }
  };

  const handleStartConference = async () => {
    try {
      await axios.post(`${API}/conferencias/iniciar/${notaId}`);
      toast.success('Conferencia iniciada!');
      navigate(`/conferencia/${notaId}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao iniciar conferencia');
    }
  };

  if (loading || !data) return <div className="text-zinc-500">Carregando...</div>;

  const { nota, vinculados, total_vinculados, total_pendentes } = data;
  const total = total_vinculados + total_pendentes;
  const pct = total > 0 ? Math.round((total_vinculados / total) * 100) : 0;
  const currentIndex = total_vinculados + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/notas')} className="p-1.5 hover:bg-[#1A1A1A] rounded transition-colors">
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </button>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#F4F4F5] tracking-tight">Vinculacao de Produtos</h1>
          <p className="text-zinc-500 text-sm">NF-e {nota.numero || '-'} &middot; {nota.fornecedor_nome}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-[#121212] border border-[#27272A] rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Produtos Vinculados</span>
          <span className="font-mono text-lg text-[#F4F4F5] font-bold" data-testid="binding-progress">{total_vinculados} / {total}</span>
        </div>
        <Progress value={pct} className={`h-4 bg-[#1A1A1A] ${pct === 100 ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`} />
      </div>

      {current ? (
        <div className="bg-[#121212] border-2 border-yellow-500/40 rounded-lg p-8" data-testid="current-binding-card">
          <div className="flex items-center justify-between mb-6">
            <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              Produto {currentIndex} de {total} &middot; sem cadastro
            </Badge>
            <span className="text-zinc-600 text-xs">{total_pendentes} restante(s)</span>
          </div>

          <div className="text-center space-y-4 mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Codigo da Nota</p>
            <p className="font-mono text-4xl sm:text-5xl font-bold text-[#F4F4F5]" data-testid="binding-cprod">{current.cprod || '-'}</p>
            <p className="text-xl sm:text-2xl text-zinc-300" data-testid="binding-descricao">{current.descricao_nfe}</p>
            <div className="flex items-center justify-center gap-6 text-zinc-500 font-mono text-sm">
              <span>Qtd: <span className="text-zinc-300">{Number(current.quantidade)} {current.unidade}</span></span>
              {isValidEan(current.ean) && <span>EAN: <span className="text-zinc-300">{current.ean}</span></span>}
            </div>
          </div>

          {/* Suggestions */}
          {current.sugestoes?.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 flex items-center gap-1">
                <Brain className="h-3 w-3" /> Sugestoes:
              </span>
              {current.sugestoes.slice(0, 3).map((s, i) => (
                <button key={i} data-testid={`suggestion-chip-${i}`}
                  onClick={() => handleCodeChange(s.produto.codigo)}
                  className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-mono hover:bg-blue-500/20 transition-colors">
                  {s.produto.codigo} &middot; {s.similaridade}%
                </button>
              ))}
            </div>
          )}

          {/* Internal code input */}
          <div className="max-w-xl mx-auto">
            <label className="text-[11px] uppercase tracking-[0.2em] text-blue-400 mb-2 block text-center">Digite o Codigo Interno</label>
            <input ref={inputRef} data-testid="internal-code-input" value={codeInput}
              onChange={e => handleCodeChange(e.target.value)} onKeyDown={handleEnter}
              placeholder="Codigo interno + ENTER"
              autoComplete="off"
              className="w-full text-3xl font-mono text-center p-4 bg-black text-white border-2 border-blue-500/30 rounded-md focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none placeholder:text-zinc-700 placeholder:text-xl transition-all" />

            {notFound && (
              <div className="mt-3 p-3 bg-red-500/5 border border-red-500/30 rounded-md" data-testid="code-not-found">
                <p className="text-red-400 text-sm mb-2">Codigo "{codeInput}" nao encontrado no cadastro de produtos.</p>
                <button data-testid="create-product-button" onClick={handleCreateProduct} disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500 disabled:opacity-50 transition-colors">
                  <Plus className="h-4 w-4" /> Cadastrar produto com codigo {codeInput}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#121212] border-2 border-green-500/50 rounded-lg p-12 text-center" data-testid="all-bound-card">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-400" />
          <h2 className="text-3xl font-bold text-green-400 mb-2">TODOS OS PRODUTOS VINCULADOS!</h2>
          <p className="text-zinc-400 mb-8">Todos os {total} itens da nota possuem codigo interno. Pronto para conferir.</p>
          <button data-testid="start-conference-button" onClick={handleStartConference}
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-lg hover:bg-green-500 transition-colors">
            <PlayCircle className="h-7 w-7" /> Iniciar Conferencia
          </button>
        </div>
      )}

      {/* Already bound items */}
      {vinculados.length > 0 && (
        <div className="bg-[#121212] border border-[#27272A] rounded-md p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-3 flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" /> Ja vinculados ({vinculados.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vinculados.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-[#0A0A0A] border border-[#27272A] rounded p-2.5">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#F4F4F5] truncate">
                    <span className="font-mono text-green-400 mr-2">{item.produto_interno_codigo}</span>
                    {item.descricao_nfe}
                  </p>
                  <p className="text-[11px] text-zinc-600 font-mono">cProd: {item.cprod} &middot; Qtd: {Number(item.quantidade)}</p>
                </div>
                <Badge className="bg-zinc-500/10 text-zinc-400 border border-zinc-700 text-[9px] shrink-0">
                  {item.metodo_identificacao === 'manual' ? 'Manual' : 'Auto'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
