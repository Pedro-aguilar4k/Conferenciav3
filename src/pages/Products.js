import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Plus, Pencil, Trash2, Package, FileSpreadsheet } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TEST_IDS } from '@/constants/testIds';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const emptyForm = { codigo: '', descricao: '', ean: '', unidade: 'UN', preco: 0, categoria: '' };

export default function Products() {
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchProdutos(); }, []);

  const fetchProdutos = async () => {
    try {
      const res = await axios.get(`${API}/produtos`, { params: search ? { search } : {} });
      setProdutos(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const t = setTimeout(fetchProdutos, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ codigo: p.codigo, descricao: p.descricao, ean: p.ean || '', unidade: p.unidade, preco: p.preco, categoria: p.categoria || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await axios.put(`${API}/produtos/${editing.id}`, form);
        toast.success('Produto atualizado');
      } else {
        await axios.post(`${API}/produtos`, form);
        toast.success('Produto criado');
      }
      setDialogOpen(false);
      fetchProdutos();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro'); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/produtos/${id}`);
      toast.success('Produto removido');
      fetchProdutos();
    } catch (e) { toast.error('Erro ao remover'); }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/produtos/exportar-excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const cd = res.headers['content-disposition'] || '';
      const match = cd.match(/filename=([^;]+)/);
      link.setAttribute('download', match ? match[1].trim() : 'produtos.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Planilha baixada!');
    } catch (e) {
      toast.error('Erro ao gerar planilha');
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#F4F4F5] tracking-tight">Produtos</h1>
        <div className="flex items-center gap-2">
          <button data-testid="export-excel-button" onClick={handleExportExcel} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white hover:bg-green-600 rounded-md text-sm transition-colors disabled:opacity-50">
            <FileSpreadsheet className="h-4 w-4" /> {exporting ? 'Gerando...' : 'Baixar Excel'}
          </button>
          <button data-testid={TEST_IDS.addProductButton} onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-md text-sm transition-colors">
            <Plus className="h-4 w-4" /> Novo Produto
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input data-testid={TEST_IDS.productSearchInput} value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por codigo, descricao ou EAN..."
          className="pl-10 bg-[#121212] border-[#27272A] text-[#F4F4F5] placeholder:text-zinc-600 focus:border-blue-500" />
      </div>

      <div className="bg-[#121212] border border-[#27272A] rounded-md overflow-hidden">
        {produtos.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <Table data-testid={TEST_IDS.productsTable}>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#27272A]">
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Codigo</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Descricao</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">EAN</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Unidade</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Preco</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Categoria</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map(p => (
                <TableRow key={p.id} className="border-[#1A1A1A] hover:bg-[#1A1A1A]/50">
                  <TableCell className="font-mono text-sm text-blue-400">{p.codigo}</TableCell>
                  <TableCell className="text-sm text-[#F4F4F5]">{p.descricao}</TableCell>
                  <TableCell className="font-mono text-sm text-zinc-400">{p.ean || '-'}</TableCell>
                  <TableCell className="text-sm text-zinc-400">{p.unidade}</TableCell>
                  <TableCell className="font-mono text-sm text-[#F4F4F5]">R$ {p.preco?.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-zinc-500">{p.categoria || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button data-testid={`edit-product-${p.id}`} onClick={() => openEdit(p)}
                        className="p-1.5 hover:bg-blue-600/20 rounded text-blue-400 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button data-testid={`delete-product-${p.id}`} onClick={() => handleDelete(p.id)}
                        className="p-1.5 hover:bg-red-600/20 rounded text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#121212] border-[#27272A] text-[#F4F4F5]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription className="text-zinc-500">Preencha os dados do produto</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Codigo *</label>
                <Input value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="product-form-codigo" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">EAN</label>
                <Input value={form.ean} onChange={e => setForm({...form, ean: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="product-form-ean" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Descricao *</label>
              <Input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})}
                className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="product-form-descricao" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Unidade</label>
                <Input value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="product-form-unidade" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Preco</label>
                <Input type="number" step="0.01" value={form.preco} onChange={e => setForm({...form, preco: parseFloat(e.target.value) || 0})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="product-form-preco" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Categoria</label>
                <Input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="product-form-categoria" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-[#F4F4F5] transition-colors">Cancelar</button>
            <button data-testid="product-form-save" onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-500 transition-colors">
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
