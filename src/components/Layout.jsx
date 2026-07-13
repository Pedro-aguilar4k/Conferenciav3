import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ClipboardCheck, Package, Truck, Link2, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEST_IDS } from '@/constants/testIds';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', testId: TEST_IDS.navDashboard },
  { path: '/notas', icon: FileText, label: 'Notas Fiscais', testId: TEST_IDS.navNotas },
  { path: '/conferencia', icon: ClipboardCheck, label: 'Conferencia', testId: TEST_IDS.navConferencia },
  { path: '/reconhecimento', icon: Brain, label: 'Reconhecimento', testId: TEST_IDS.navReconhecimento },
  { path: '/produtos', icon: Package, label: 'Produtos', testId: TEST_IDS.navProdutos },
  { path: '/fornecedores', icon: Truck, label: 'Fornecedores', testId: TEST_IDS.navFornecedores },
  { path: '/equivalencias', icon: Link2, label: 'Equivalencias', testId: TEST_IDS.navEquivalencias },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      <aside data-testid={TEST_IDS.sidebar} className={`${collapsed ? 'w-16' : 'w-56'} bg-[#121212] border-r border-[#27272A] flex flex-col transition-all duration-150 flex-shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-[#27272A] min-h-[56px]">
          {!collapsed && <h1 className="font-heading text-lg font-semibold text-[#F4F4F5] tracking-tight whitespace-nowrap">NF-e Check</h1>}
          <button data-testid={TEST_IDS.sidebarToggle} onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-[#1A1A1A] rounded transition-colors">
            {collapsed ? <ChevronRight className="h-4 w-4 text-[#A1A1AA]" /> : <ChevronLeft className="h-4 w-4 text-[#A1A1AA]" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} data-testid={item.testId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                    : 'text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-[#F4F4F5]'
                }`}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[#27272A]">
          {!collapsed && <p className="text-[10px] text-[#71717A] tracking-wider uppercase">NF-e Conference v2.0</p>}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
