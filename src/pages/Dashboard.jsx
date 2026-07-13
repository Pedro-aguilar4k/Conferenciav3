import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileCheck, Clock, AlertTriangle, Link2, Target, Zap, Brain } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { TEST_IDS } from '@/constants/testIds';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/dashboard`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Derived data — memoized so it only recomputes when `data` actually changes.
  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Conferidas Hoje', value: data.conferidas_hoje, icon: FileCheck, color: 'text-green-400', border: 'border-green-500/20', testId: TEST_IDS.statConferidas },
      { label: 'Pendentes', value: data.pendentes, icon: Clock, color: 'text-yellow-400', border: 'border-yellow-500/20', testId: TEST_IDS.statPendentes },
      { label: 'Tempo Medio', value: `${data.tempo_medio_min}m`, icon: Clock, color: 'text-blue-400', border: 'border-blue-500/20', testId: TEST_IDS.statTempoMedio },
      { label: 'Divergencias', value: data.divergentes, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20', testId: TEST_IDS.statDivergencias },
      { label: 'Sem Vinculo', value: data.sem_vinculo, icon: Link2, color: 'text-orange-400', border: 'border-orange-500/20', testId: TEST_IDS.statSemVinculo },
      { label: 'Automacao', value: `${data.pct_identificacao_auto}%`, icon: Target, color: 'text-emerald-400', border: 'border-emerald-500/20', testId: TEST_IDS.statPrecisao },
    ];
  }, [data]);

  const methodData = useMemo(() => {
    if (!data?.reconhecimento_por_metodo) return [];
    return [
      { name: 'EAN', value: data.reconhecimento_por_metodo.ean, color: '#22C55E' },
      { name: 'Vinculo', value: data.reconhecimento_por_metodo.vinculo, color: '#3B82F6' },
      { name: 'Similaridade', value: data.reconhecimento_por_metodo.similaridade, color: '#A855F7' },
      { name: 'Manual', value: data.reconhecimento_por_metodo.manual, color: '#71717A' },
    ].filter(d => d.value > 0);
  }, [data]);

  const totalMethodItems = useMemo(
    () => methodData.reduce((acc, d) => acc + d.value, 0),
    [methodData]
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-[#71717A]">Carregando dashboard...</div>;
  if (!data) return <div className="text-[#71717A]">Erro ao carregar dashboard</div>;

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#F4F4F5] tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#71717A] text-xs">
            <Brain className="h-3 w-3 text-blue-400" />
            <span>{data.total_aprendizado || 0} aprendizados</span>
          </div>
          <div className="flex items-center gap-2 text-[#71717A] text-xs">
            <Zap className="h-3 w-3 text-emerald-400" />
            <span>{data.total_equivalencias} equivalencias</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} data-testid={s.testId} className={`bg-[#121212] border ${s.border} rounded-md p-4 transition-all duration-150 hover:bg-[#1A1A1A]`}>
            <div className={`flex items-center gap-2 mb-3 ${s.color}`}>
              <s.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] tracking-[0.12em] uppercase text-zinc-500">{s.label}</span>
            </div>
            <p className="text-2xl font-mono font-semibold text-[#F4F4F5]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Intelligent Recognition Engine */}
      <div className="bg-[#121212] border border-[#27272A] rounded-md p-5">
        <h3 className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-4 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-blue-400" />
          Motor de Reconhecimento Inteligente
        </h3>
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Precisao do Reconhecimento</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress value={Math.min(data.precisao_reconhecimento, 100)} className="h-2.5 bg-[#1A1A1A]" />
              </div>
              <span className="font-mono text-sm text-[#F4F4F5] w-12 text-right">{data.precisao_reconhecimento}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Identificacao Automatica</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress value={Math.min(data.pct_identificacao_auto, 100)} className="h-2.5 bg-[#1A1A1A]" />
              </div>
              <span className="font-mono text-sm text-[#F4F4F5] w-12 text-right">{data.pct_identificacao_auto}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Total de Equivalencias</p>
            <p className="text-3xl font-mono font-semibold text-[#F4F4F5]">{data.total_equivalencias}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Itens Pendentes</p>
            <p className="text-3xl font-mono font-semibold text-orange-400">{data.sem_vinculo}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recognition by Method */}
        <div className="bg-[#121212] border border-[#27272A] rounded-md p-5">
          <h3 className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-4">Reconhecimento por Metodo</h3>
          {methodData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #27272A', borderRadius: '4px', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {methodData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-zinc-400">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-[#F4F4F5]">{d.value}</span>
                      <span className="text-xs text-zinc-500">({totalMethodItems > 0 ? Math.round(d.value / totalMethodItems * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-zinc-600 text-sm">Nenhum dado disponivel</div>
          )}
        </div>

        {/* Notes per day chart */}
        <div className="bg-[#121212] border border-[#27272A] rounded-md p-5">
          <h3 className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-4">Notas por Dia (Ultimos 7 dias)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.notas_por_dia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis dataKey="data" stroke="#71717A" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis stroke="#71717A" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #27272A', borderRadius: '4px', fontSize: 12 }} labelStyle={{ color: '#A1A1AA' }} />
              <Bar dataKey="quantidade" fill="#3B82F6" radius={[2, 2, 0, 0]} name="Notas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <div className="bg-[#121212] border border-[#27272A] rounded-md p-5">
          <h3 className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-4">Top Fornecedores por Volume</h3>
          {data.top_fornecedores.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.top_fornecedores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis type="number" stroke="#71717A" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" stroke="#71717A" tick={{ fontSize: 9 }} width={150} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #27272A', borderRadius: '4px', fontSize: 12 }} />
                <Bar dataKey="quantidade" fill="#22C55E" radius={[0, 2, 2, 0]} name="Notas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-zinc-600 text-sm">Nenhum dado disponivel</div>
          )}
        </div>

        {/* Supplier Error Rates */}
        <div className="bg-[#121212] border border-[#27272A] rounded-md p-5">
          <h3 className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-4">Fornecedores - Taxa de Erro</h3>
          {data.fornecedor_errors?.length > 0 ? (
            <div className="space-y-3">
              {data.fornecedor_errors.map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm text-[#F4F4F5] truncate">{f.nome}</p>
                    <p className="text-xs text-zinc-500">{f.sem_vinculo}/{f.total} sem vinculo</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20">
                      <Progress value={f.taxa_erro} className="h-2 bg-[#1A1A1A]" />
                    </div>
                    <span className={`font-mono text-sm w-12 text-right ${f.taxa_erro > 50 ? 'text-red-400' : f.taxa_erro > 20 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {f.taxa_erro}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-zinc-600 text-sm">Nenhum dado disponivel</div>
          )}
        </div>
      </div>
    </div>
  );
}
