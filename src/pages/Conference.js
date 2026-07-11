import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ScanBarcode, ArrowLeft, PlayCircle, StopCircle, CheckCircle2, XCircle, SkipForward, PackageCheck, Printer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

export default function Conference() {
  const { notaId } = useParams();
  if (!notaId) return <NotaSelector />;
  return <ConferenceGame notaId={notaId} />;
}

function NotaSelector() {
  const [notas, setNotas] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/notas`).then(r => setNotas(r.data)).catch(console.error);
  }, []);

  const available = notas.filter(n => ['pendente', 'em_conferencia'].includes(n.status));

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#F4F4F5] tracking-tight">Conferencia</h1>
      <p className="text-zinc-500 text-sm">Selecione uma nota para iniciar a conferencia</p>
      {available.length === 0 ? (
        <div className="bg-[#121212] border border-[#27272A] rounded-md p-12 text-center text-zinc-600">
          <ScanBarcode className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma nota pendente</p>
          <p className="text-xs mt-1">Importe uma NF-e na aba Notas Fiscais</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {available.map(nota => (
            <button key={nota.id} data-testid={`select-nota-${nota.id}`}
              onClick={() => navigate(`/conferencia/${nota.id}`)}
              className="bg-[#121212] border border-[#27272A] rounded-md p-4 text-left hover:border-blue-500/40 transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[#F4F4F5] text-lg">NF-e {nota.numero || '-'}</span>
                  <span className="text-zinc-500 text-sm ml-3">{nota.fornecedor_nome}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-zinc-400">{nota.itens_identificados}/{nota.total_itens} identificados</span>
                  <PlayCircle className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConferenceGame({ notaId }) {
  const [nota, setNota] = useState(null);
  const [itens, setItens] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // {kind: 'erro'|'aviso'|'completo', title, sub}
  const [scanValue, setScanValue] = useState('');
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [operadorNome, setOperadorNome] = useState('');
  const scannerRef = useRef(null);
  const feedbackTimer = useRef(null);
  const completeTimer = useRef(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/notas/${notaId}`);
      setNota(res.data.nota);
      setItens(res.data.itens);
      const pendingItems = res.data.itens.filter(i => !i.produto_interno_id && !i.ignorado);
      if (pendingItems.length > 0 && !['conferida', 'divergente', 'em_conferencia'].includes(res.data.nota.status)) {
        navigate(`/vinculacao/${notaId}`, { replace: true });
      }
    } catch (e) {
      toast.error('Erro ao carregar nota');
      navigate('/conferencia');
    }
  }, [notaId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keep scanner input always focused during conference (pause when dialog open)
  useEffect(() => {
    if (nota?.status !== 'em_conferencia' || finalizeDialogOpen) return;
    const t = setInterval(() => {
      if (document.activeElement !== scannerRef.current) scannerRef.current?.focus();
    }, 800);
    scannerRef.current?.focus();
    return () => clearInterval(t);
  }, [nota?.status, finalizeDialogOpen]);

  useEffect(() => () => { clearTimeout(feedbackTimer.current); clearTimeout(completeTimer.current); }, []);

  const showFeedback = (fb, ms = 2600) => {
    clearTimeout(feedbackTimer.current);
    setFeedback(fb);
    feedbackTimer.current = setTimeout(() => setFeedback(null), ms);
  };

  const handleStart = async () => {
    try {
      const res = await axios.post(`${API}/conferencias/iniciar/${notaId}`);
      setNota(res.data.nota);
      setItens(res.data.itens);
      setActiveItem(null);
      toast.success('Conferencia iniciada! Bipe o primeiro produto.');
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao iniciar'); }
  };

  const refreshItens = async () => {
    try {
      const res = await axios.get(`${API}/notas/${notaId}`);
      setItens(res.data.itens);
      setNota(res.data.nota);
    } catch (e) { /* ignore */ }
  };

  const handleScan = async (e) => {
    if (e.key !== 'Enter' || !scanValue.trim()) return;
    const code = scanValue.trim();
    setScanValue('');
    try {
      const res = await axios.post(`${API}/conferencias/leitura`, {
        nota_id: notaId, codigo_barras: code, item_ativo_id: activeItem?.id || null,
      });
      const d = res.data;
      if (d.success) {
        clearTimeout(completeTimer.current);
        setActiveItem(d.item);
        setFeedback(null);
        if (d.tipo === 'completo') {
          showFeedback({ kind: 'completo', title: 'ITEM CONFERIDO', sub: d.item.produto_interno_codigo }, 1500);
          completeTimer.current = setTimeout(() => setActiveItem(null), 1500);
        }
      } else {
        if (d.tipo === 'produto_errado') {
          showFeedback({ kind: 'erro', title: 'PRODUTO NAO E O INDICADO', sub: `Bipado: ${d.scanned?.produto_interno_codigo || d.scanned?.codigo || code} - ${d.scanned?.descricao_nfe || d.scanned?.descricao || ''}` });
        } else if (d.tipo === 'ja_conferido') {
          showFeedback({ kind: 'aviso', title: 'ITEM JA CONFERIDO', sub: `${d.item?.produto_interno_codigo || code} ja foi contado por completo` });
        } else if (d.tipo === 'nao_pertence') {
          showFeedback({ kind: 'erro', title: 'PRODUTO NAO PERTENCE A ESTA NOTA', sub: `${d.scanned?.codigo || code} - ${d.scanned?.descricao || ''}` });
        } else {
          showFeedback({ kind: 'erro', title: 'CODIGO NAO ENCONTRADO', sub: `Codigo bipado: ${code}` });
        }
      }
      refreshItens();
    } catch (e) {
      showFeedback({ kind: 'erro', title: 'ERRO NA LEITURA', sub: 'Tente novamente' });
    }
  };

  const handleSkip = () => {
    setActiveItem(null);
    setFeedback(null);
    toast.info('Item pulado. Bipe o proximo produto.');
    scannerRef.current?.focus();
  };

  const handleFinalize = () => {
    const incomplete = itens.filter(i => i.quantidade_conferida < i.quantidade);
    if (incomplete.length > 0 && !window.confirm(`Existem ${incomplete.length} item(ns) incompletos. Finalizar mesmo assim?`)) return;
    setOperadorNome('');
    setFinalizeDialogOpen(true);
  };

  const handleConfirmFinalize = async () => {
    if (!operadorNome.trim()) return;
    try {
      const res = await axios.post(`${API}/conferencias/finalizar/${notaId}`, { operador: operadorNome.trim() });
      setNota(res.data);
      setFinalizeDialogOpen(false);
      toast.success('Conferencia finalizada!');
    } catch (e) { toast.error('Erro ao finalizar'); }
  };

  if (!nota) return <div className="text-zinc-500">Carregando...</div>;

  const isActive = nota.status === 'em_conferencia';
  const isDone = ['conferida', 'divergente'].includes(nota.status);
  const itensCompletos = itens.filter(i => i.quantidade > 0 && i.quantidade_conferida >= i.quantidade).length;
  const progressPct = itens.length > 0 ? Math.round((itensCompletos / itens.length) * 100) : 0;
  const allComplete = itens.length > 0 && itensCompletos === itens.length;

  // ── Start screen ──
  if (!isActive && !isDone) {
    return (
      <div className="space-y-6">
        <Header nota={nota} navigate={navigate} />
        <div className="bg-[#121212] border border-[#27272A] rounded-lg p-16 text-center">
          <ScanBarcode className="h-16 w-16 mx-auto mb-6 text-blue-400" />
          <h2 className="text-2xl text-[#F4F4F5] font-semibold mb-2">Pronto para conferir</h2>
          <p className="text-zinc-500 mb-8">{itens.length} itens vinculados. Pegue o leitor de codigo de barras e clique em iniciar.</p>
          <button data-testid="start-conference-button" onClick={handleStart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-lg hover:bg-blue-500 transition-colors">
            <PlayCircle className="h-7 w-7" /> Iniciar Conferencia
          </button>
        </div>
      </div>
    );
  }

  // ── Done screen ──
  if (isDone) {
    return (
      <div className="space-y-6">
        <Header nota={nota} navigate={navigate} />
        <div className="bg-[#121212] border border-[#27272A] rounded-lg p-16 text-center">
          <PackageCheck className={`h-16 w-16 mx-auto mb-6 ${nota.status === 'conferida' ? 'text-green-400' : 'text-red-400'}`} />
          <h2 className="text-3xl text-[#F4F4F5] font-bold mb-2">
            {nota.status === 'conferida' ? 'NOTA CONFERIDA!' : 'FINALIZADA COM DIVERGENCIA'}
          </h2>
          <p className="text-zinc-500 mb-2">{itensCompletos} de {itens.length} itens conferidos</p>
          {nota.operador_conferencia && <p className="text-zinc-400 mb-6 text-sm">Conferido por: <span className="text-[#F4F4F5] font-semibold">{nota.operador_conferencia}</span></p>}
          <div className="flex items-center justify-center gap-3">
            <button data-testid="print-report-button" onClick={() => navigate(`/relatorio/${notaId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors font-semibold">
              <Printer className="h-5 w-5" /> Imprimir Relatorio
            </button>
            <button onClick={() => navigate('/conferencia')}
              className="px-6 py-3 bg-[#1A1A1A] border border-zinc-700 text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors">
              Voltar para Conferencias
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Game screen ──
  const pctItem = activeItem && activeItem.quantidade > 0
    ? Math.min(100, Math.round((activeItem.quantidade_conferida / activeItem.quantidade) * 100)) : 0;

  return (
    <div className="space-y-4" onClick={() => scannerRef.current?.focus()}>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/conferencia')} className="p-1.5 hover:bg-[#1A1A1A] rounded transition-colors">
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-semibold text-[#F4F4F5]">NF-e {nota.numero || '-'}</h1>
          <p className="text-zinc-500 text-xs">{nota.fornecedor_nome}</p>
        </div>
        <div className="ml-auto">
          <button data-testid="finalize-button" onClick={handleFinalize}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
              allComplete ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-[#1A1A1A] text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
            }`}>
            <StopCircle className="h-4 w-4" /> Finalizar
          </button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-[#121212] border border-[#27272A] rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Progresso da Conferencia</span>
          <span className="font-mono text-lg text-[#F4F4F5] font-bold" data-testid="overall-progress">{itensCompletos} / {itens.length} itens</span>
        </div>
        <Progress value={progressPct} className={`h-4 bg-[#1A1A1A] ${progressPct === 100 ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`} />
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div data-testid="feedback-banner" className={`rounded-lg p-5 flex items-center gap-4 border-2 ${
          feedback.kind === 'erro' ? 'bg-red-500/10 border-red-500 text-red-400' :
          feedback.kind === 'aviso' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' :
          'bg-green-500/10 border-green-500 text-green-400'
        }`}>
          {feedback.kind === 'completo' ? <CheckCircle2 className="h-10 w-10 shrink-0" /> : <XCircle className="h-10 w-10 shrink-0" />}
          <div>
            <p className="text-2xl font-bold tracking-wide">{feedback.title}</p>
            {feedback.sub && <p className="text-sm opacity-80 mt-0.5">{feedback.sub}</p>}
          </div>
        </div>
      )}

      {/* Main game display */}
      <div className={`bg-[#121212] border-2 rounded-lg min-h-[380px] flex flex-col items-center justify-center p-8 text-center transition-colors ${
        feedback?.kind === 'erro' ? 'border-red-500/60' : activeItem ? 'border-blue-500/50' : allComplete ? 'border-green-500/60' : 'border-[#27272A]'
      }`}>
        {activeItem ? (
          <div className="w-full max-w-3xl space-y-5" data-testid="active-item-display">
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-400">Codigo Interno</p>
            <p className="font-mono text-6xl sm:text-8xl font-bold text-[#F4F4F5] leading-none" data-testid="active-item-codigo">
              {activeItem.produto_interno_codigo}
            </p>
            <p className="text-2xl sm:text-3xl text-zinc-300" data-testid="active-item-descricao">
              {activeItem.produto_interno_descricao || activeItem.descricao_nfe}
            </p>
            <div className="flex items-end justify-center gap-3">
              <span className="font-mono text-7xl sm:text-8xl font-bold text-blue-400" data-testid="active-item-contagem">
                {Number(activeItem.quantidade_conferida)}
              </span>
              <span className="font-mono text-4xl text-zinc-500 pb-2">/ {Number(activeItem.quantidade)} {activeItem.unidade}</span>
            </div>
            <Progress value={pctItem} className="h-5 bg-[#1A1A1A] [&>div]:bg-blue-500 max-w-xl mx-auto" />
            <div className="pt-3 border-t border-[#27272A] flex items-center justify-center gap-6 text-zinc-500">
              <span className="font-mono text-lg">Cod. Nota: <span className="text-zinc-300">{activeItem.cprod}</span></span>
              {activeItem.ean && <span className="font-mono text-lg">EAN: <span className="text-zinc-300">{activeItem.ean}</span></span>}
            </div>
            <button data-testid="skip-item-button" onClick={(e) => { e.stopPropagation(); handleSkip(); }}
              className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-[#1A1A1A] border border-zinc-700 text-zinc-400 rounded-md text-sm hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
              <SkipForward className="h-4 w-4" /> Pular (sem quantidade)
            </button>
          </div>
        ) : allComplete ? (
          <div className="space-y-5" data-testid="all-complete-display">
            <CheckCircle2 className="h-20 w-20 mx-auto text-green-400" />
            <p className="text-4xl sm:text-5xl font-bold text-green-400">TODOS OS ITENS CONFERIDOS!</p>
            <p className="text-zinc-400 text-lg">Clique em Finalizar para encerrar a conferencia.</p>
            <button onClick={(e) => { e.stopPropagation(); handleFinalize(); }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-lg hover:bg-green-500 transition-colors">
              <StopCircle className="h-6 w-6" /> Finalizar Conferencia
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="waiting-display">
            <ScanBarcode className="h-20 w-20 mx-auto text-blue-400 animate-pulse" />
            <p className="text-3xl sm:text-4xl font-bold text-[#F4F4F5]">BIPE UM PRODUTO</p>
            <p className="text-zinc-500 text-lg">Aponte o leitor para o codigo de barras de qualquer produto da nota</p>
          </div>
        )}
      </div>

      {/* Scanner input (always focused) */}
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-md p-3 flex items-center gap-3">
        <ScanBarcode className="h-5 w-5 text-blue-400 shrink-0" />
        <input ref={scannerRef} data-testid="scanner-input" value={scanValue}
          onChange={e => setScanValue(e.target.value)} onKeyDown={handleScan}
          placeholder="Leitor ativo - bipe o codigo de barras..."
          autoComplete="off"
          className="flex-1 bg-transparent font-mono text-zinc-300 focus:outline-none placeholder:text-zinc-700" />
        <span className="text-[10px] uppercase tracking-widest text-green-500">scanner ativo</span>
      </div>

      {/* Items status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {itens.map(item => {
          const complete = item.quantidade > 0 && item.quantidade_conferida >= item.quantidade;
          const partial = !complete && item.quantidade_conferida > 0;
          const active = activeItem?.id === item.id;
          return (
            <div key={item.id} data-testid={`item-chip-${item.id}`}
              className={`rounded-md border p-2.5 text-left ${
                active ? 'border-blue-500 bg-blue-500/10' :
                complete ? 'border-green-500/40 bg-green-500/5' :
                partial ? 'border-yellow-500/40 bg-yellow-500/5' :
                'border-[#27272A] bg-[#121212]'
              }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-[#F4F4F5] truncate">{item.produto_interno_codigo}</span>
                <span className={`font-mono text-xs shrink-0 ${complete ? 'text-green-400' : partial ? 'text-yellow-400' : 'text-zinc-500'}`}>
                  {Number(item.quantidade_conferida)}/{Number(item.quantidade)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.produto_interno_descricao || item.descricao_nfe}</p>
            </div>
          );
        })}
      </div>

      {/* Finalize dialog - ask operator name */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="bg-[#121212] border-[#27272A] text-[#F4F4F5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Finalizar Conferencia</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Informe o nome do estoquista responsavel pela conferencia. Essa informacao sera registrada no relatorio.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-blue-400 mb-2 block">Nome do Estoquista</label>
            <input data-testid="operador-nome-input" value={operadorNome} autoFocus
              onChange={e => setOperadorNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && operadorNome.trim()) handleConfirmFinalize(); }}
              placeholder="Digite seu nome..."
              className="w-full text-lg p-3 bg-black text-white border-2 border-blue-500/30 rounded-md focus:border-blue-500 focus:outline-none placeholder:text-zinc-700" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setFinalizeDialogOpen(false)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-[#F4F4F5] transition-colors">Cancelar</button>
            <button data-testid="confirm-finalize-button" onClick={handleConfirmFinalize} disabled={!operadorNome.trim()}
              className="px-5 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-500 disabled:opacity-50 transition-colors">
              Finalizar e Gerar Relatorio
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({ nota, navigate }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => navigate('/conferencia')} className="p-1.5 hover:bg-[#1A1A1A] rounded transition-colors">
        <ArrowLeft className="h-5 w-5 text-zinc-400" />
      </button>
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#F4F4F5] tracking-tight">NF-e {nota.numero || '-'}</h1>
        <p className="text-zinc-500 text-sm">{nota.fornecedor_nome} &middot; R$ {nota.valor_total?.toFixed(2)}</p>
      </div>
    </div>
  );
}
