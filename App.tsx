import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingCart, 
  DollarSign, 
  Calendar, 
  BookOpen, 
  Share2, 
  Filter, 
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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Cell, PieChart, Pie, Legend, Sector
} from 'recharts';
import { SaleRecord, DashboardStats } from './types';
import { fetchSalesData, parseCSV } from './services/spreadsheetService';
import { formatCurrency, formatNumber, getMonthName } from './utils/formatters';
import KPICard from './components/KPICard';
import InsightCard from './components/InsightCard';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

const App: React.FC = () => {
  const [data, setData] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isManualUpload, setIsManualUpload] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main Filters
  const [productFilter, setProductFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');

  // Comparison State
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!isManualUpload) {
        setLoading(true);
        const result = await fetchSalesData();
        setData(result);
        if (result.length > 0) {
          const uniqueProds = Array.from(new Set(result.map(i => i.produto))).filter(Boolean).sort();
          setCompareA(uniqueProds[0] || '');
          setCompareB(uniqueProds[1] || uniqueProds[0] || '');
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
          if (parsedData.length > 0) {
              setData(parsedData);
              const uniqueProds = Array.from(new Set(parsedData.map(i => i.produto))).filter(Boolean).sort();
              setCompareA(uniqueProds[0] || '');
              setCompareB(uniqueProds[1] || uniqueProds[0] || '');
              setIsManualUpload(true);
          } else {
              alert("Não foi possível extrair dados válidos desta planilha. Verifique se as colunas estão corretas (Data, Produto, Receita, Quantidade).");
              setFileName(null);
          }
        } catch (err) {
          console.error("Erro ao processar arquivo:", err);
          alert("Erro crítico ao processar o arquivo CSV.");
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
      acc.totalSales += curr.quantidade_vendida;
      acc.totalRevenue += curr.receita;
      return acc;
    }, { totalSales: 0, totalRevenue: 0 });

    const averageTicket = totals.totalSales > 0 ? totals.totalRevenue / totals.totalSales : 0;

    const byMonth: Record<string, { value: number, count: number }> = {};
    const byProduct: Record<string, number> = {};
    const byProductQty: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    filteredData.forEach(item => {
      const monthKey = getMonthName(item.data);
      byMonth[monthKey] = {
        value: (byMonth[monthKey]?.value || 0) + item.receita,
        count: (byMonth[monthKey]?.count || 0) + item.quantidade_vendida
      };
      if (item.produto) {
        byProduct[item.produto] = (byProduct[item.produto] || 0) + item.receita;
        byProductQty[item.produto] = (byProductQty[item.produto] || 0) + item.quantidade_vendida;
      }
      if (item.origem) bySource[item.origem] = (bySource[item.origem] || 0) + item.receita;
    });

    const sortedByVal = (obj: any) => Object.entries(obj).sort((a: any, b: any) => (b[1].value || b[1]) - (a[1].value || a[1]))[0];
    const sortedByQty = (obj: any) => Object.entries(obj).sort((a: any, b: any) => (b[1]) - (a[1]))[0];
    
    const bestMonthEntry = sortedByVal(byMonth);
    const bestProductEntry = sortedByVal(byProduct);
    const bestProductQtyEntry = sortedByQty(byProductQty);
    const bestSourceEntry = sortedByVal(bySource);

    const topProductShare = bestProductEntry ? (bestProductEntry[1] as number / (totals.totalRevenue || 1)) * 100 : 0;

    return {
      ...totals,
      averageTicket,
      topProductShare,
      bestMonth: bestMonthEntry ? { month: bestMonthEntry[0], value: (bestMonthEntry[1] as any).value, count: (bestMonthEntry[1] as any).count } : { month: 'N/A', value: 0, count: 0 },
      bestProduct: bestProductEntry ? { name: bestProductEntry[0], value: bestProductEntry[1] as number } : { name: 'N/A', value: 0 },
      bestProductQty: bestProductQtyEntry ? { name: bestProductQtyEntry[0], count: bestProductQtyEntry[1] } : { name: 'N/A', count: 0 },
      bestSource: bestSourceEntry ? { name: bestSourceEntry[0], value: bestSourceEntry[1] as number } : { name: 'N/A', value: 0 },
    };
  }, [filteredData]);

  const timelineData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach(item => {
      const d = new Date(item.data);
      if (isNaN(d.getTime())) return;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      grouped[label] = (grouped[label] || 0) + item.receita;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const sourceData = useMemo(() => {
    const grouped: Record<string, { revenue: number, sales: number }> = {};
    filteredData.forEach(item => {
      const label = (item.origem || 'Desconhecido').trim();
      if (!grouped[label]) {
        grouped[label] = { revenue: 0, sales: 0 };
      }
      grouped[label].revenue += item.receita;
      grouped[label].sales += item.quantidade_vendida;
    });
    return Object.entries(grouped)
      .map(([name, data]) => ({ 
        name, 
        value: data.revenue, 
        sales: data.sales 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  const productChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach(item => {
      const label = (item.produto || 'Produto Indefinido').trim();
      grouped[label] = (grouped[label] || 0) + item.receita;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Preparando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Dashboard de Performance
            <span className="bg-blue-100 text-blue-700 text-[10px] uppercase px-2 py-0.5 rounded-full font-black tracking-widest">v1.8</span>
          </h1>
          <p className="text-slate-500 font-medium">Análise de dados integrada e comparativa</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" id="csv-upload" />
            {isManualUpload ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-sm">
                <FileSpreadsheet size={18} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-700 max-w-[150px] truncate">{fileName}</span>
                <button onClick={resetToLive} className="ml-1 p-1 hover:bg-blue-200 rounded-full text-blue-600 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <label htmlFor="csv-upload" className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-dashed border-slate-300 shadow-sm hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group">
                <Upload size={18} className="text-slate-400 group-hover:text-blue-600" />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">Importar Planilha CSV</span>
              </label>
            )}
          </div>
          <button 
            onClick={handleRefresh} 
            disabled={isManualUpload || loading} 
            title="Atualizar dados do Google Sheets"
            className={`p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm transition-all ${isManualUpload || loading ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:shadow-md active:scale-95'}`}
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Seção de Filtros Globais */}
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
          {filteredData.length} entradas carregadas
        </div>
      </div>

      {/* Comparativo de Performance Lado a Lado */}
      <section className="mb-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <ArrowRightLeft size={120} />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <ArrowRightLeft className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Comparativo Direto</h2>
              <p className="text-sm text-slate-500 font-medium">Liderança e distribuição de resultados</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
             <select 
              value={compareA} 
              onChange={(e) => setCompareA(e.target.value)} 
              className="bg-white border border-slate-200 text-sm font-bold text-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-52 shadow-sm"
            >
              {products.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="bg-slate-900 text-white text-[10px] font-black p-1.5 rounded-lg hidden md:block">VS</div>
            <select 
              value={compareB} 
              onChange={(e) => setCompareB(e.target.value)} 
              className="bg-white border border-slate-200 text-sm font-bold text-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-52 shadow-sm"
            >
              {products.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-6">
               <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-center font-black text-[10px] uppercase tracking-widest truncate shadow-sm border border-blue-100">{compareA}</div>
               <div className={`p-5 rounded-2xl border-2 transition-all ${comparisonStats.productA.revenue >= comparisonStats.productB.revenue && comparisonStats.productA.revenue > 0 ? 'bg-emerald-50 border-emerald-200 scale-105 shadow-md shadow-emerald-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Receita</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-extrabold text-slate-900">{formatCurrency(comparisonStats.productA.revenue)}</span>
                    {comparisonStats.productA.revenue > comparisonStats.productB.revenue && <Trophy size={16} className="text-emerald-600" />}
                  </div>
               </div>
               <div className={`p-5 rounded-2xl border-2 transition-all ${comparisonStats.productA.sales >= comparisonStats.productB.sales && comparisonStats.productA.sales > 0 ? 'bg-emerald-50 border-emerald-200 scale-105 shadow-md shadow-emerald-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Vendas</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-extrabold text-slate-900">{formatNumber(comparisonStats.productA.sales)}</span>
                    {comparisonStats.productA.sales > comparisonStats.productB.sales && <Trophy size={16} className="text-emerald-600" />}
                  </div>
               </div>
             </div>
             <div className="space-y-6">
               <div className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-center font-black text-[10px] uppercase tracking-widest truncate shadow-sm border border-indigo-100">{compareB}</div>
               <div className={`p-5 rounded-2xl border-2 transition-all ${comparisonStats.productB.revenue > comparisonStats.productA.revenue ? 'bg-emerald-50 border-emerald-200 scale-105 shadow-md shadow-emerald-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Receita</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-extrabold text-slate-900">{formatCurrency(comparisonStats.productB.revenue)}</span>
                    {comparisonStats.productB.revenue > comparisonStats.productA.revenue && <Trophy size={16} className="text-emerald-600" />}
                  </div>
               </div>
               <div className={`p-5 rounded-2xl border-2 transition-all ${comparisonStats.productB.sales > comparisonStats.productA.sales ? 'bg-emerald-50 border-emerald-200 scale-105 shadow-md shadow-emerald-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
                  <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">Vendas</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-extrabold text-slate-900">{formatNumber(comparisonStats.productB.sales)}</span>
                    {comparisonStats.productB.sales > comparisonStats.productA.sales && <Trophy size={16} className="text-emerald-600" />}
                  </div>
               </div>
             </div>
          </div>
          <div className="bg-slate-50 rounded-3xl p-6 flex flex-col justify-center border border-slate-200">
            <h4 className="text-[10px] font-black text-slate-500 mb-6 text-center uppercase tracking-[0.2em]">Market Share Relativo</h4>
            <div className="h-[220px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={[
                        { name: compareA, value: comparisonStats.productA.revenue || 0.0001 },
                        { name: compareB, value: comparisonStats.productB.revenue || 0.0001 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#6366f1" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} 
                      formatter={(val: number) => formatCurrency(val)} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                 </PieChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard title="Volume de Vendas" value={formatNumber(stats.totalSales)} icon={<ShoppingCart size={22} className="text-emerald-600" />} />
        <KPICard title="Faturamento Bruto" value={formatCurrency(stats.totalRevenue)} icon={<DollarSign size={22} className="text-blue-600" />} />
        <KPICard title="Ticket Médio" value={formatCurrency(stats.averageTicket)} icon={<Tag size={22} className="text-indigo-600" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <InsightCard title="Recorde Histórico" mainValue={stats.bestMonth.month} subValue={formatCurrency(stats.bestMonth.value)} icon={<Calendar size={20} className="text-amber-600" />} />
        <InsightCard title="Produto Estrela" mainValue={stats.bestProductQty.name} subValue={`${formatNumber(stats.bestProductQty.count)} unidades`} icon={<BookOpen size={20} className="text-blue-600" />} />
        <InsightCard title="Concentração" mainValue={`${stats.topProductShare.toFixed(1)}%`} subValue={`do faturamento total`} icon={<Percent size={20} className="text-indigo-600" />} />
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8 overflow-hidden">
        <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
          <TrendingUp size={24} className="text-blue-600" /> 
          Histórico de Receita
        </h3>
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }} 
                formatter={(value: number) => [formatCurrency(value), 'Faturamento']} 
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" animationDuration={2000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
            <Share2 size={20} className="text-blue-600" />
            Vendas por Canal de Origem
          </h3>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#475569', fontSize: 11, fontWeight: 'bold'}}
                  width={140}
                  interval={0}
                />
                <Tooltip 
                  cursor={{fill: 'rgba(241, 245, 249, 0.5)'}} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
                          <p className="font-black text-slate-900 mb-2 text-xs uppercase tracking-widest">{data.name}</p>
                          <div className="space-y-1">
                            <p className="text-sm text-blue-600 font-bold">Faturamento: {formatCurrency(data.value)}</p>
                            <p className="text-xs text-slate-500 font-semibold">Total de Vendas: {formatNumber(data.sales)}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} animationDuration={1500}>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
            <PieChartIcon size={20} className="text-blue-600" />
            Composição do Faturamento
          </h3>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productChartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={85}
                  outerRadius={130}
                  paddingAngle={6}
                  dataKey="value"
                  animationDuration={2000}
                  stroke="none"
                >
                  {productChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '10px' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={100} 
                  formatter={(value) => <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <footer className="mt-20 mb-10 text-center flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          <span>Netlify Production Ready</span>
          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
          <span>Google Sheets Real-time</span>
        </div>
        <p className="text-slate-300 text-xs font-medium">Dashboard de Performance Comercial • Gerado com Tecnologia de IA</p>
      </footer>
    </div>
  );
};

export default App;