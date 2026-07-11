import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Brain, Check, X, Eye, ChevronDown, ChevronUp, Filter, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { TEST_IDS } from '@/constants/testIds';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const confiancaBadge = (score) => {
  if (score >= 90) return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (score >= 70) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  if (score >= 50) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
};

export default function RecognitionCenter() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fornecedores, setFornecedores] = useState([]);
  const [filterCnpj, setFilterCnpj] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const fetchItems = useCallback(async () => {
    try {
      const params = {};
      if (filterCnpj && filterCnpj !== 'all') params.fornecedor_cnpj = filterCnpj;
      const res = await axios.get(`${API}/reconhecimento`, { params });
      setItems(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterCnpj]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    axios.get(`${API}/fornecedores`).then(r => setFornecedores(r.data)).catch(console.error);
  }, []);

  const handleConfirm = async (item, produtoId) => {
    try {
      await axios.post(`${API}/reconhecimento/confirmar`, {
        item_nota_id: item.id, produto_interno_id: produtoId,
      });
      toast.success('Vinculo confirmado e aprendido!');
      fetchItems();
    } catch (e) { toast.error('Erro ao confirmar vinculo'); }
  };

  const handleIgnore = async (itemId) => {
    try {
      await axios.post(`${API}/reconhecimento/ignorar/${itemId}`);
      toast.success('Item ignorado');
      fetchItems();
    } catch (e) { toast.error('Erro ao ignorar'); }
  };

  const openMatchDialog = (item) => {
    setSelectedItem(item);
    setSelectedProduct('');
    setProductSearch('');
    setSearchResults([]);
    setMatchDialogOpen(true);
  };

  const handleProductSearch = async (search) => {
    setProductSearch(search);
    if (search.length < 2) { setSearchResults([]); return; }
    try {
      const res = await axios.get(`${API}/produtos`, { params: { search } });
      setSearchResults(res.data.slice(0, 10));
    } catch (e) { console.error(e); }
  };

  const handleConfirmMatch = async () => {
    if (!selectedItem || !selectedProduct) return;
    await handleConfirm(selectedItem, selectedProduct);
    setMatchDialogOpen(false);
  };

  const pendingCount = items.length;
  const withSuggestions = useMemo(
    () => items.filter(i => i.sugestoes?.length > 0).length,
    [items]
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-[#71717A]">Carregando...</div>;

  return (
    <div data-testid="recognition-center-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#F4F4F5] tracking-tight">Central de Reconhecimento</h1>
          <p className="text-zinc-500 text-sm mt-1">Produtos pendentes de vinculacao inteligente</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-mono font-semibold text-[#F4F4F5]">{pendingCount}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Pendentes</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-semibold text-yellow-400">{withSuggestions}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Com Sugestoes</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-zinc-500" />
        <Select value={filterCnpj} onValueChange={setFilterCnpj}>
          <SelectTrigger className="w-[300px] bg-[#121212] border-[#27272A] text-[#F4F4F5]" data-testid={TEST_IDS.recognitionFilterFornecedor}>
            <SelectValue placeholder="Filtrar por fornecedor" />
          </SelectTrigger>
          <SelectContent className="bg-[#121212] border-[#27272A]">
            <SelectItem value="all" className="text-[#F4F4F5] focus:bg-[#1A1A1A] focus:text-[#F4F4F5]">Todos os fornecedores</SelectItem>
            {fornecedores.map(f => (
              <SelectItem key={f.cnpj} value={f.cnpj} className="text-[#F4F4F5] focus:bg-[#1A1A1A] focus:text-[#F4F4F5]">{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#121212] border border-[#27272A] rounded-md p-12 text-center">
          <Brain className="h-10 w-10 text-green-400 mx-auto mb-3 opacity-60" />
          <p className="text-[#F4F4F5] font-medium">Todos os produtos foram reconhecidos!</p>
          <p className="text-zinc-500 text-sm mt-1">Nenhum produto pendente de vinculacao</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const isExpanded = expandedId === item.id;
            const bestSuggestion = item.sugestoes?.[0];
            return (
              <div key={item.id} data-testid={`recognition-item-${item.id}`}
                className="bg-[#121212] border border-[#27272A] rounded-md overflow-hidden transition-all duration-150 hover:border-[#3f3f46]">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-500 text-xs">NF-e {item.nota_numero || '-'}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-zinc-500 text-xs">{item.fornecedor_nome || '-'}</span>
                      </div>
                      <p className="text-[#F4F4F5] text-sm font-medium truncate">{item.descricao_nfe}</p>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-zinc-500 text-xs font-mono">cProd: {item.cprod}</span>
                        <span className="text-zinc-500 text-xs font-mono">EAN: {item.ean || 'N/A'}</span>
                        <span className="text-zinc-500 text-xs font-mono">Qtd: {item.quantidade} {item.unidade}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {bestSuggestion && (
                        <Badge className={`${confiancaBadge(bestSuggestion.similaridade)} border text-xs`}>
                          {bestSuggestion.similaridade}%
                        </Badge>
                      )}
                      {bestSuggestion && bestSuggestion.similaridade >= 70 && (
                        <button data-testid={`confirm-best-${item.id}`}
                          onClick={() => handleConfirm(item, bestSuggestion.produto.id)}
                          className="p-1.5 bg-green-600/20 hover:bg-green-600/30 rounded text-green-400 transition-colors" title="Confirmar Sugestao">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button data-testid={`alter-match-${item.id}`}
                        onClick={() => openMatchDialog(item)}
                        className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded text-blue-400 transition-colors" title="Alterar / Buscar">
                        <Search className="h-4 w-4" />
                      </button>
                      <button data-testid={`ignore-item-${item.id}`}
                        onClick={() => handleIgnore(item.id)}
                        className="p-1.5 bg-zinc-600/20 hover:bg-zinc-600/30 rounded text-zinc-400 transition-colors" title="Ignorar">
                        <X className="h-4 w-4" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1.5 hover:bg-[#1A1A1A] rounded text-zinc-400 transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {bestSuggestion && !isExpanded && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Brain className="h-3 w-3 text-blue-400" />
                      <span className="text-zinc-500">Melhor sugestao:</span>
                      <span className="font-mono text-blue-400">{bestSuggestion.produto.codigo}</span>
                      <span className="text-zinc-400">{bestSuggestion.produto.descricao}</span>
                    </div>
                  )}
                </div>

                {isExpanded && item.sugestoes?.length > 0 && (
                  <div className="border-t border-[#27272A] bg-[#0A0A0A] p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-3">Sugestoes ({item.sugestoes.length})</p>
                    <div className="space-y-2">
                      {item.sugestoes.map((s, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#121212] border border-[#27272A] rounded p-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-blue-400">{s.produto.codigo}</span>
                            <span className="text-sm text-[#F4F4F5]">{s.produto.descricao}</span>
                            {s.criterios?.map((c, ci) => (
                              <Badge key={ci} className={`text-[9px] ${c.bonus ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'} border`}>
                                {c.criterio}: {c.peso}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${confiancaBadge(s.similaridade)} border text-xs`}>{s.similaridade}%</Badge>
                            <button data-testid={`confirm-suggestion-${item.id}-${i}`}
                              onClick={() => handleConfirm(item, s.produto.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 transition-colors">
                              Confirmar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && (!item.sugestoes || item.sugestoes.length === 0) && (
                  <div className="border-t border-[#27272A] bg-[#0A0A0A] p-4 text-center">
                    <AlertCircle className="h-5 w-5 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Nenhuma sugestao automatica</p>
                    <button onClick={() => openMatchDialog(item)}
                      className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 transition-colors">
                      Buscar Produto Manualmente
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="bg-[#121212] border-[#27272A] text-[#F4F4F5] max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Produto</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {selectedItem && `NF-e: ${selectedItem.descricao_nfe}`}
            </DialogDescription>
          </DialogHeader>

          {selectedItem?.sugestoes?.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-auto mb-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Sugestoes Automaticas</p>
              {selectedItem.sugestoes.map((s, i) => (
                <button key={i} onClick={() => setSelectedProduct(s.produto.id)}
                  data-testid={`dialog-suggestion-${i}`}
                  className={`w-full text-left p-3 rounded border transition-all ${
                    selectedProduct === s.produto.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#27272A] bg-[#0A0A0A] hover:border-zinc-600'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm text-blue-400 mr-2">{s.produto.codigo}</span>
                      <span className="text-sm text-[#F4F4F5]">{s.produto.descricao}</span>
                    </div>
                    <Badge className={`${confiancaBadge(s.similaridade)} border text-xs`}>{s.similaridade}%</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-2">Busca Manual</p>
            <Input value={productSearch} onChange={e => handleProductSearch(e.target.value)}
              placeholder="Buscar por codigo ou descricao..."
              className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5] mb-2" data-testid="recognition-product-search" />
            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-[200px] overflow-auto">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => setSelectedProduct(p.id)}
                    className={`w-full text-left p-2 rounded border transition-all text-sm ${
                      selectedProduct === p.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-[#27272A] bg-[#0A0A0A] hover:border-zinc-600'
                    }`}>
                    <span className="font-mono text-blue-400 mr-2">{p.codigo}</span>
                    <span className="text-[#F4F4F5]">{p.descricao}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setMatchDialogOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-[#F4F4F5] transition-colors">Cancelar</button>
            <button data-testid={TEST_IDS.recognitionConfirmButton} onClick={handleConfirmMatch} disabled={!selectedProduct}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-500 disabled:opacity-50 transition-colors">
              Confirmar Vinculo
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
