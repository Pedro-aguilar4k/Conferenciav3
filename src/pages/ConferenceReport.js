import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Printer, ArrowLeft, CheckCircle2, AlertTriangle, Save } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const fmtDateTime = (iso) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
};

const fmtQtd = (n) => Number(n) % 1 === 0 ? String(Number(n)) : Number(n).toFixed(2);

const handlePrint = () => {
  const styleId = 'print-a4-override';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body > * { display: none !important; }
        body > #root > * { display: none !important; }
        #report-a4-sheet { display: block !important; position: fixed !important; inset: 0 !important; }
      }
    `;
    document.head.appendChild(style);
  }
  window.print();
};

export default function ConferenceReport() {
  const { notaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    axios.get(`${API}/conferencias/relatorio/${notaId}`)
      .then(r => {
        setData(r.data);
        if (r.data?.nota?.relatorio_salvo?.salvo_em) {
          setSavedAt(r.data.nota.relatorio_salvo.salvo_em);
        }
      })
      .catch(() => setError('Erro ao carregar relatorio'));
  }, [notaId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.post(`${API}/conferencias/relatorio/${notaId}/salvar`);
      setSavedAt(res.data.salvo_em);
      toast.success('Relatorio salvo na nota com sucesso!');
    } catch {
      toast.error('Erro ao salvar relatorio');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="min-h-screen bg-white flex items-center justify-center text-red-600">{error}</div>;
  if (!data) return <div className="min-h-screen bg-white flex items-center justify-center text-gray-500">Carregando relatorio...</div>;

  const { nota, itens, resumo } = data;

  return (
    <div className="min-h-screen bg-gray-200 print:bg-white">
      {/* Toolbar - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-[#121212] border-b border-[#27272A] px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white text-sm">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <span className="text-zinc-500 text-sm">Relatorio de Conferencia - NF-e {nota.numero}</span>
        <div className="ml-auto flex items-center gap-2">
          {savedAt && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Salvo em {fmtDateTime(savedAt)}
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 text-zinc-100 rounded-md text-sm font-semibold hover:bg-zinc-600 transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar na Nota'}
          </button>
          <button data-testid="do-print-button" onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-500 transition-colors">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* A4 sheet */}
      <div id="report-a4-sheet" className="mx-auto my-6 print:my-0 bg-white text-black shadow-xl print:shadow-none"
        style={{ width: '210mm', minHeight: '297mm', padding: '14mm 12mm' }}>

        {/* Header */}
        <div className="border-b-2 border-black pb-3 mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RELATORIO DE CONFERENCIA</h1>
            <p className="text-sm text-gray-600">Conferencia de Recebimento de Mercadorias - NF-e</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-bold text-lg">NF-e {nota.numero}</p>
            {nota.serie && <p className="text-gray-600">Serie {nota.serie}</p>}
          </div>
        </div>

        {/* Result banner */}
        <div className={`border-2 rounded p-3 mb-4 flex items-center gap-3 ${resumo.tudo_ok ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
          {resumo.tudo_ok
            ? <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
            : <AlertTriangle className="h-8 w-8 text-red-600 shrink-0" />}
          <div>
            <p className={`text-lg font-bold ${resumo.tudo_ok ? 'text-green-700' : 'text-red-700'}`}>{resumo.resultado}</p>
            <p className="text-sm text-gray-700">
              {resumo.itens_ok} de {resumo.total_itens} itens conferidos corretamente
              {resumo.itens_falta > 0 && ` · ${resumo.itens_falta} com falta`}
              {resumo.itens_excedente > 0 && ` · ${resumo.itens_excedente} com excedente`}
            </p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
          <div className="col-span-2 font-bold uppercase text-xs tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-1">Dados da Conferencia</div>
          <p><span className="text-gray-600">Estoquista:</span> <span className="font-semibold">{nota.operador_conferencia || 'Nao informado'}</span></p>
          <p><span className="text-gray-600">Duracao:</span> <span className="font-semibold">{resumo.duracao_min != null ? `${resumo.duracao_min} min` : '-'}</span></p>
          <p><span className="text-gray-600">Inicio:</span> <span className="font-semibold">{fmtDateTime(nota.conferencia_inicio)}</span></p>
          <p><span className="text-gray-600">Fim:</span> <span className="font-semibold">{fmtDateTime(nota.conferencia_fim)}</span></p>
          <p><span className="text-gray-600">Total de bipagens:</span> <span className="font-semibold">{resumo.total_leituras}</span></p>
          <p><span className="text-gray-600">Emissao do relatorio:</span> <span className="font-semibold">{fmtDateTime(new Date().toISOString())}</span></p>

          <div className="col-span-2 font-bold uppercase text-xs tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-1 mt-3">Dados da Nota Fiscal</div>
          <p><span className="text-gray-600">Fornecedor:</span> <span className="font-semibold">{nota.fornecedor_nome || '-'}</span></p>
          <p><span className="text-gray-600">CNPJ:</span> <span className="font-semibold font-mono">{nota.fornecedor_cnpj || '-'}</span></p>
          <p><span className="text-gray-600">Data de emissao:</span> <span className="font-semibold">{nota.data_emissao ? fmtDateTime(nota.data_emissao) : '-'}</span></p>
          <p><span className="text-gray-600">Valor total:</span> <span className="font-semibold">R$ {Number(nota.valor_total || 0).toFixed(2)}</span></p>
          {nota.chave && <p className="col-span-2"><span className="text-gray-600">Chave de acesso:</span> <span className="font-mono text-xs">{nota.chave}</span></p>}
        </div>

        {/* Items table */}
        <div className="font-bold uppercase text-xs tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">Produtos Conferidos ({resumo.total_itens})</div>
        <table className="w-full text-xs border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100 border-y border-gray-400">
              <th className="text-left py-1.5 px-1.5 font-bold">#</th>
              <th className="text-left py-1.5 px-1.5 font-bold">Cod. Interno</th>
              <th className="text-left py-1.5 px-1.5 font-bold">Descricao</th>
              <th className="text-left py-1.5 px-1.5 font-bold">Cod. Nota</th>
              <th className="text-center py-1.5 px-1.5 font-bold">Qtd NF</th>
              <th className="text-center py-1.5 px-1.5 font-bold">Qtd Conf.</th>
              <th className="text-center py-1.5 px-1.5 font-bold">Dif.</th>
              <th className="text-center py-1.5 px-1.5 font-bold">Situacao</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i, idx) => (
              <tr key={idx} className={`border-b border-gray-200 ${i.situacao !== 'ok' ? 'bg-red-50' : ''}`}>
                <td className="py-1 px-1.5 text-gray-500">{i.numero_item || idx + 1}</td>
                <td className="py-1 px-1.5 font-mono font-semibold">{i.produto_interno_codigo || '-'}</td>
                <td className="py-1 px-1.5">{i.produto_interno_descricao || i.descricao_nfe}</td>
                <td className="py-1 px-1.5 font-mono">{i.cprod || '-'}</td>
                <td className="py-1 px-1.5 text-center font-mono">{fmtQtd(i.quantidade)}</td>
                <td className="py-1 px-1.5 text-center font-mono font-bold">{fmtQtd(i.quantidade_conferida)}</td>
                <td className={`py-1 px-1.5 text-center font-mono ${i.diferenca !== 0 ? 'font-bold text-red-700' : 'text-gray-400'}`}>
                  {i.diferenca > 0 ? `+${fmtQtd(i.diferenca)}` : fmtQtd(i.diferenca)}
                </td>
                <td className="py-1 px-1.5 text-center">
                  {i.situacao === 'ok'
                    ? <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-600">OK</span>
                    : i.situacao === 'falta'
                      ? <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-600">FALTA</span>
                      : <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-600">EXCEDENTE</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Divergence notes */}
        {itens.some(i => i.justificativa) && (
          <div className="mb-6 text-xs">
            <div className="font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-2">Justificativas de Divergencia</div>
            {itens.filter(i => i.justificativa).map((i, idx) => (
              <p key={idx} className="mb-1"><span className="font-mono font-semibold">{i.produto_interno_codigo}</span>: {i.justificativa}</p>
            ))}
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-16 mt-16 text-center text-sm">
          <div>
            <div className="border-t border-black pt-1">{nota.operador_conferencia || 'Estoquista'}</div>
            <p className="text-gray-500 text-xs">Conferente</p>
          </div>
          <div>
            <div className="border-t border-black pt-1">&nbsp;</div>
            <p className="text-gray-500 text-xs">Responsavel / Gerente</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-10">
          Documento gerado automaticamente pelo NF-e Check em {fmtDateTime(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
