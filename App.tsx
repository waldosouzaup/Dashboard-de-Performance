import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingCart, 
  DollarSign, 
  Calendar, 
  BookOpen, 
  Share2, 
  RefreshCcw,
  TrendingUp,
  Upload,
  FileSpreadsheet,
  X,
  Tag,
  PieChart as PieChartIcon,
  Percent,
  ArrowRightLeft,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { SaleRecord } from './types.ts';
import { fetchSalesData, parseCSV } from './services/spreadsheetService.ts';
import { formatCurrency, formatNumber, getMonthName } from './utils/formatters.ts';
import KPICard from './components/KPICard.tsx';
import InsightCard from './components/InsightCard.tsx';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

const App: React.FC = () => {
  const [data, setData] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isManualUpload, setIsManualUpload] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productFilter, setProductFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!isManualUpload) {
        setLoading(true);
        try {
          const result = await fetchSalesData();
          if (Array.isArray(result)) {
            setData(result);
            if (result.length > 0) {
              const uniqueProds = Array.from(new Set(result.map(i => i.produto))).filter(Boolean).sort();
              setCompareA(uniqueProds[0] || '');
              setCompareB(uniqueProds[1] || uniqueProds[0] || '');
            }
          }
        } catch (e) {
          console.error("Erro ao carregar dados iniciais:", e);
        }
        setLoading(false);
      }
    };
    loadData();
  }, [refreshKey, isManualUpload]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const parsedData = parseCSV(text);
          if (parsedData && parsedData.length > 0) {
              setData(parsedData);
              const uniqueProds = Array.from(new Set(parsedData.map(i => i.produto))).filter(Boolean).sort();
              setCompareA(uniqueProds[0] || '');
              setCompareB(uniqueProds[1] || uniqueProds[0] || '');
              setIsManualUpload(true);
          } else {
              alert("Não foi possível extrair dados válidos. Verifique as colunas.");
              setFileName(null);
          }
        } catch (err) {
          alert("Erro ao processar o arquivo CSV.");
          setFileName(null);
        }
        setLoading(false);
      };
      reader.readAsText(file);
    }
  };

  const resetToLive = () => {
    setIsManualUpload(false);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setRefreshKey(prev => prev + 1);
  };

  const products = useMemo(() => {
    const unique = Array.from(new Set(data.map(item => item.produto))).filter(Boolean);
    return ['All', ...unique.sort()];
  }, [data]);

  const months = useMemo(() => {
    const unique = Array.from(new Set(data.map(item => {
      if (!item.data) return '';
      const d = new Date(item.data);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))).filter(Boolean);
    return ['All', ...unique.sort().reverse()];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesProduct = productFilter === 'All' || item.produto === productFilter;
      if (!item.data) return matchesProduct;
      const d = new Date(item.data);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const matchesMonth = monthFilter === 'All' || monthStr === monthFilter;
      return matchesProduct && matchesMonth;
    });
  }, [data, productFilter, monthFilter]);

  const comparisonStats = useMemo(() => {
    const getStatsForProduct = (prodName: string) => {
      const prodData = data.filter(item => {
        const matchesProduct = item.produto === prodName;
        if (!item.data) return matchesProduct;
        const d = new Date(item.data);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const matchesMonth = monthFilter === 'All' || monthStr === monthFilter;
        return matchesProduct && matchesMonth;
      });
      const revenue = prodData.reduce((acc, curr) => acc + curr.receita, 0);
      const sales = prodData.reduce((acc, curr) => acc + curr.quantidade_vendida, 0);
      return { revenue, sales, ticket: sales > 0 ? revenue / sales : 0 };
    };
    return {
      productA: getStatsForProduct(compareA),
      productB: getStatsForProduct(compareB)
    };
  }, [data, monthFilter, compareA, compareB]);

  const stats = useMemo(() => {
    const totals = filteredData.reduce((acc, curr) => {
      acc.totalSales += Number(curr.quantidade_vendida) || 0;
      acc.totalRevenue += Number(curr.receita) || 0;
      return acc;
    }, { totalSales: 0, totalRevenue: 0 });

    const averageTicket = totals.totalSales > 0 ? totals.totalRevenue / totals.totalSales : 0;
    const byMonth: Record<string, { value: number, count: number }> = {};
    const byProduct: Record<string, number> = {};
    const byProductQty: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    filteredData.forEach(item => {
      const monthKey = getMonthName(item.data) || 'Desconhecido';
      byMonth[monthKey] = {
        value: (byMonth[monthKey]?.value || 0) + (Number(item.receita) || 0),
        count: (byMonth[monthKey]?.count || 0) + (Number(item.quantidade_vendida) || 0)
      };
      if (item.produto) {
        byProduct[item.produto] = (byProduct[item.produto] || 0) + (Number(item.receita) || 0);
        byProductQty[item.produto] = (byProductQty[item.produto] || 0) + (Number(item.quantidade_vendida) || 0);
      }
      if (item.origem) bySource[item.origem] = (bySource[item.origem] || 0) + (Number(item.receita) || 0);
    });

    const sortedByVal = (obj: any) => Object.entries(obj).sort((a: any, b: any) => (b[1].value || b[1]) - (a[1].value || a[1]))[0];
    const sortedByQty = (obj: any) => Object.entries(obj).sort((a: any, b: any) => (b[1]) - (a[1]))[0];
    
    const bestMonthEntry = sortedByVal(byMonth);
    const bestProductEntry = sortedByVal(byProduct);
    const bestProductQtyEntry = sortedByQty(byProductQty);
    const bestSourceEntry = sortedByVal(bySource);

    return {
      ...totals,
      averageTicket,
      topProductShare: bestProductEntry ? (Number(bestProductEntry[1]) / (totals.totalRevenue || 1)) * 100 : 0,
      bestMonth: bestMonthEntry ? { month: String(bestMonthEntry[0]), value: Number((bestMonthEntry[1] as any).value), count: Number((bestMonthEntry[1] as any).count) } : { month: 'N/A', value: 0, count: 0 },
      bestProduct: bestProductEntry ? { name: String(bestProductEntry[0]), value: Number(bestProductEntry[1]) } : { name: 'N/A', value: 0 },
      bestProductQty: bestProductQtyEntry ? { name: String(bestProductQtyEntry[0]), count: Number(bestProductQtyEntry[1]) } : { name: 'N/A', count: 0 },
      bestSource: bestSourceEntry ? { name: String(bestSourceEntry[0]), value: Number(bestSourceEntry[1]) } : { name: 'N/A', value: 0 },
    };
  }, [filteredData]);

  const timelineData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach(item => {
      const d = new Date(item.data);
      if (isNaN(d.getTime())) return;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      grouped[label] = (grouped[label] || 0) + (Number(item.receita) || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const sourceData = useMemo(() => {
    const grouped: Record<string, { revenue: number, sales: number }> = {};
    filteredData.forEach(item => {
      const label = (item.origem || 'Desconhecido').trim();
      if (!grouped[label]) grouped[label] = { revenue: 0, sales: 0 };
      grouped[label].revenue += (Number(item.receita) || 0);
      grouped[label].sales += (Number(item.quantidade_vendida) || 0);
    });
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.revenue, sales: data.sales }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredData]);

  const productChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach(item => {
      const label = (item.produto || 'Produto Indefinido').trim();
      grouped[label] = (grouped[label] || 0) + (Number(item.receita) || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Inicializando App...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Sales Analytics
            <span className="bg-blue-100 text-blue-700 text-[10px] uppercase px-2 py-0.5 rounded-full font-black tracking-widest">Live</span>
          </h1>
          <p className="text-slate-500 font-medium">Controle de performance e canais</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" id="csv-upload" />
          {isManualUpload ? (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-sm">
              <FileSpreadsheet size={18} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-700 max-w-[150px] truncate">{fileName || 'Arquivo'}</span>
              <button onClick={resetToLive} className="ml-1 p-1 hover:bg-blue-200 rounded-full text-blue-600"><X size={14} /></button>
            </div>
          ) : (
            <label htmlFor="csv-upload" className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-dashed border-slate-300 shadow-sm hover:border-blue-400 cursor-pointer group">
              <Upload size={18} className="text-slate-400 group-hover:text-blue-600" />
              <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">Importar CSV</span>
            </label>
          )}
          <button onClick={() => setRefreshKey(k => k + 1)} disabled={isManualUpload} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm">
            <RefreshCcw size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-8 bg-slate-100/50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <BookOpen size={18} className="text-blue-600" />
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none pr-4">
            {products.map(p => <option key={p} value={p}>{p === 'All' ? 'Todos os Produtos' : p}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <Calendar size={18} className="text-blue-600" />
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none pr-4">
            <option value="All">Todos os Meses</option>
            {months.filter(m => m !== 'All').map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <CheckCircle2 size={12} className="text-emerald-500" />
          {filteredData.length} registros
        </div>
      </div>

      <section className="mb-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
              <ArrowRightLeft className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Comparativo</h2>
              <p className="text-sm text-slate-500 font-medium">Análise cruzada de performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="bg-white border border-slate-200 text-sm font-bold p-3 rounded-xl w-full md:w-48 shadow-sm outline-none">
              {products.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <span className="font-black text-slate-300">VS</span>
            <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="bg-white border border-slate-200 text-sm font-bold p-3 rounded-xl w-full md:w-48 shadow-sm outline-none">
              {products.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-6">
               <div className="p-4 rounded-2xl border-2 transition-all bg-blue-50/30 border-blue-100">
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Receita A</p>
                  <span className="text-lg font-extrabold text-slate-900">{formatCurrency(comparisonStats.productA.revenue || 0)}</span>
               </div>
               <div className="p-4 rounded-2xl border-2 transition-all bg-blue-50/30 border-blue-100">
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Vendas A</p>
                  <span className="text-lg font-extrabold text-slate-900">{formatNumber(comparisonStats.productA.sales || 0)}</span>
               </div>
             </div>
             <div className="space-y-6">
               <div className="p-4 rounded-2xl border-2 transition-all bg-indigo-50/30 border-indigo-100">
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Receita B</p>
                  <span className="text-lg font-extrabold text-slate-900">{formatCurrency(comparisonStats.productB.revenue || 0)}</span>
               </div>
               <div className="p-4 rounded-2xl border-2 transition-all bg-indigo-50/30 border-indigo-100">
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Vendas B</p>
                  <span className="text-lg font-extrabold text-slate-900">{formatNumber(comparisonStats.productB.sales || 0)}</span>
               </div>
             </div>
          </div>
          <div className="bg-slate-50 rounded-3xl p-6 flex flex-col justify-center border border-slate-200 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                    data={[
                      { name: 'Prod A', value: Number(comparisonStats.productA.revenue) || 0.0001 },
                      { name: 'Prod B', value: Number(comparisonStats.productB.revenue) || 0.0001 }
                    ]}
                    innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none"
                  >
                    <Cell fill="#3b82f6" /><Cell fill="#6366f1" />
                  </Pie>
                  <Tooltip />
                  <Legend />
               </PieChart>
             </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard title="Vendas Totais" value={formatNumber(stats.totalSales || 0)} icon={<ShoppingCart size={22} className="text-emerald-600" />} />
        <KPICard title="Faturamento" value={formatCurrency(stats.totalRevenue || 0)} icon={<DollarSign size={22} className="text-blue-600" />} />
        <KPICard title="Ticket Médio" value={formatCurrency(stats.averageTicket || 0)} icon={<Tag size={22} className="text-indigo-600" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <InsightCard title="Recorde" mainValue={String(stats.bestMonth.month || 'N/A')} subValue={formatCurrency(stats.bestMonth.value || 0)} icon={<Calendar size={20} className="text-amber-600" />} />
        <InsightCard title="Destaque" mainValue={String(stats.bestProductQty.name || 'N/A')} subValue={`${formatNumber(stats.bestProductQty.count || 0)} unidades`} icon={<BookOpen size={20} className="text-blue-600" />} />
        <InsightCard title="Market Share" mainValue={`${(Number(stats.topProductShare) || 0).toFixed(1)}%`} subValue={`do faturamento total`} icon={<Percent size={20} className="text-indigo-600" />} />
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8">
        <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2"><TrendingUp size={24} className="text-blue-600" /> Histórico de Receita</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={0.1} fill="#3b82f6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <footer className="mt-20 mb-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
        Netlify Production Deployment • v2.0
      </footer>
    </div>
  );
};

export default App;