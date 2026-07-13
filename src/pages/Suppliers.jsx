import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TEST_IDS } from '@/constants/testIds';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const emptyForm = { cnpj: '', nome: '', contato: '', email: '', telefone: '' };

export default function Suppliers() {
  const [fornecedores, setFornecedores] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchFornecedores = useCallback(async (term) => {
    try {
      const q = term !== undefined ? term : search;
      const res = await axios.get(`${API}/fornecedores`, { params: q ? { search: q } : {} });
      setFornecedores(res.data);
    } catch (e) { console.error(e); }
  }, [search]);

  // Single debounced effect: covers both mount and subsequent search changes.
  useEffect(() => {
    const t = setTimeout(() => fetchFornecedores(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchFornecedores]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (f) => { setEditing(f); setForm({ cnpj: f.cnpj, nome: f.nome, contato: f.contato || '', email: f.email || '', telefone: f.telefone || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await axios.put(`${API}/fornecedores/${editing.id}`, form);
        toast.success('Fornecedor atualizado');
      } else {
        await axios.post(`${API}/fornecedores`, form);
        toast.success('Fornecedor criado');
      }
      setDialogOpen(false);
      fetchFornecedores();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro'); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/fornecedores/${id}`);
      toast.success('Fornecedor removido');
      fetchFornecedores();
    } catch (e) { toast.error('Erro ao remover'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#F4F4F5] tracking-tight">Fornecedores</h1>
        <button data-testid={TEST_IDS.addSupplierButton} onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-md text-sm transition-colors">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input data-testid={TEST_IDS.supplierSearchInput} value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por CNPJ ou nome..."
          className="pl-10 bg-[#121212] border-[#27272A] text-[#F4F4F5] placeholder:text-zinc-600 focus:border-blue-500" />
      </div>

      <div className="bg-[#121212] border border-[#27272A] rounded-md overflow-hidden">
        {fornecedores.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
            <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum fornecedor encontrado</p>
          </div>
        ) : (
          <Table data-testid={TEST_IDS.suppliersTable}>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#27272A]">
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">CNPJ</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Nome</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Contato</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Telefone</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 bg-[#1A1A1A]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores.map(f => (
                <TableRow key={f.id} className="border-[#1A1A1A] hover:bg-[#1A1A1A]/50">
                  <TableCell className="font-mono text-sm text-[#F4F4F5]">{f.cnpj}</TableCell>
                  <TableCell className="text-sm text-[#F4F4F5]">{f.nome}</TableCell>
                  <TableCell className="text-sm text-zinc-400">{f.contato || '-'}</TableCell>
                  <TableCell className="text-sm text-zinc-400">{f.telefone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button data-testid={`edit-supplier-${f.id}`} onClick={() => openEdit(f)}
                        className="p-1.5 hover:bg-blue-600/20 rounded text-blue-400 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button data-testid={`delete-supplier-${f.id}`} onClick={() => handleDelete(f.id)}
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
            <DialogTitle>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            <DialogDescription className="text-zinc-500">Preencha os dados do fornecedor</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">CNPJ *</label>
                <Input value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="supplier-form-cnpj" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Nome *</label>
                <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="supplier-form-nome" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Contato</label>
              <Input value={form.contato} onChange={e => setForm({...form, contato: e.target.value})}
                className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="supplier-form-contato" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="supplier-form-email" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Telefone</label>
                <Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})}
                  className="bg-[#0A0A0A] border-[#27272A] text-[#F4F4F5]" data-testid="supplier-form-telefone" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-[#F4F4F5] transition-colors">Cancelar</button>
            <button data-testid="supplier-form-save" onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-500 transition-colors">
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
