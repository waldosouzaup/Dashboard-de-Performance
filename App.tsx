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
  Trophy
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
        const parsedData = parseCSV(text);
        if (parsedData.length > 0) {
            setData(parsedData);
            const uniqueProds = Array.from(new Set(parsedData.map(i => i.produto))).filter(Boolean).sort();
            setCompareA(uniqueProds[0] || '');
            setCompareB(uniqueProds[1] || uniqueProds[0] || '');
            setIsManualUpload(true);
        } else {
            alert("Não foi possível extrair dados válidos desta planilha. Verifique o formato.");
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium animate-pulse">Carregando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard de Performance</h1>
          <p className="text-slate-500 font-medium">Gestão baseada em dados reais</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" id="csv-upload" />
            {isManualUpload ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl">
                <FileSpreadsheet size={18} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-700 max-w-[120px] truncate">{fileName}</span>
                <button onClick={resetToLive} className="ml-1 p-0.5 hover:bg-blue-100 rounded-full text-blue-600"><X size={14} /></button>
              </div>
            ) : (
              <label htmlFor="csv-upload" className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-dashed border-slate-300 shadow-sm hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group">
                <Upload size={18} className="text-slate-400 group-hover:text-blue-500" />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-600">Importar CSV</span>
              </label>
            )}
          </div>
          <button onClick={handleRefresh} disabled={isManualUpload} className={`p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm transition-all ${isManualUpload ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-blue-500 hover:border-blue-200'}`}>
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Seção de Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <BookOpen size={18} className="text-blue-500" />
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="bg-transparent border-none text-sm font-semibold text-slate-700 outline-none pr-4">
            {products.map(p => <option key={p} value={p}>{p === 'All' ? 'Todos os Produtos' : p}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <Calendar size={18} className="text-blue-500" />
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="bg-transparent border-none text-sm font-semibold text-slate-700 outline-none pr-4">
            <option value="All">Todos os Meses</option>
            {months.filter(m => m !== 'All').map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs font-medium text-slate-400">{filteredData.length} registros exibidos</div>
      </div>

      {/* Comparativo Direto */}
      <section className="mb-12 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <ArrowRightLeft className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Comparativo de Produtos</h2>
              <p className="text-sm text-slate-400 font-medium">Comparação direta no período selecionado</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
             <select 
              value={compareA} 
              onChange={(e) => setCompareA(e.target.value)} 
              className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
            >
              {products.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <span className="text-slate-300 font-bold hidden md:inline">X</span>
            <select 
              value={compareB} 
              onChange={(e) => setCompareB(e.target.value)} 
              className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
            >
              {products.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-4">
               <div className="p-1 text-center font-bold text-blue-600 truncate text-xs uppercase">{compareA}</div>
               <div className={`p-4 rounded-2xl border ${comparisonStats.productA.revenue >= comparisonStats.productB.revenue && comparisonStats.productA.revenue > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">Receita</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-800">{formatCurrency(comparisonStats.productA.revenue)}</span>
                    {comparisonStats.productA.revenue > comparisonStats.productB.revenue && <Trophy size={14} className="text-emerald-500" />}
                  </div>
               </div>
               <div className={`p-4 rounded-2xl border ${comparisonStats.productA.sales >= comparisonStats.productB.sales && comparisonStats.productA.sales > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">Vendas</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-800">{formatNumber(comparisonStats.productA.sales)}</span>
                    {comparisonStats.productA.sales > comparisonStats.productB.sales && <Trophy size={14} className="text-emerald-500" />}
                  </div>
               </div>
             </div>
             <div className="space-y-4">
               <div className="p-1 text-center font-bold text-indigo-600 truncate text-xs uppercase">{compareB}</div>
               <div className={`p-4 rounded-2xl border ${comparisonStats.productB.revenue > comparisonStats.productA.revenue ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">Receita</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-800">{formatCurrency(comparisonStats.productB.revenue)}</span>
                    {comparisonStats.productB.revenue > comparisonStats.productA.revenue && <Trophy size={14} className="text-emerald-500" />}
                  </div>
               </div>
               <div className={`p-4 rounded-2xl border ${comparisonStats.productB.sales > comparisonStats.productA.sales ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">Vendas</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-800">{formatNumber(comparisonStats.productB.sales)}</span>
                    {comparisonStats.productB.sales > comparisonStats.productA.sales && <Trophy size={14} className="text-emerald-500" />}
                  </div>
               </div>
             </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center">
            <h4 className="text-[10px] font-bold text-slate-500 mb-4 text-center uppercase tracking-widest">Market Share (Entre os dois)</h4>
            <div className="h-[200px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={[
                        { name: compareA, value: comparisonStats.productA.revenue || 0.0001 },
                        { name: compareB, value: comparisonStats.productB.revenue || 0.0001 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#6366f1" />
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(val as number)} />
                    <Legend iconType="circle" />
                 </PieChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Principais KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard title="Vendas Totais" value={formatNumber(stats.totalSales)} icon={<ShoppingCart size={22} className="text-emerald-500" />} />
        <KPICard title="Receita Bruta" value={formatCurrency(stats.totalRevenue)} icon={<DollarSign size={22} className="text-blue-500" />} />
        <KPICard title="Ticket Médio" value={formatCurrency(stats.averageTicket)} icon={<Tag size={22} className="text-indigo-500" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <InsightCard title="Recorde Mensal" mainValue={stats.bestMonth.month} subValue={formatCurrency(stats.bestMonth.value)} icon={<Calendar size={20} className="text-amber-500" />} />
        <InsightCard title="Mais Vendido" mainValue={stats.bestProductQty.name} subValue={`${formatNumber(stats.bestProductQty.count)} unidades`} icon={<BookOpen size={20} className="text-blue-500" />} />
        <InsightCard title="Share do Líder" mainValue={`${stats.topProductShare.toFixed(1)}%`} subValue={`do faturamento total`} icon={<Percent size={20} className="text-indigo-500" />} />
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={22} className="text-blue-500" /> Evolução de Receita</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `R$ ${val / 1000}k`} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value: any) => [formatCurrency(value as number), 'Receita']} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Share2 size={18} className="text-blue-500" />
            Vendas e Receita por Canal
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}}
                  width={140}
                  interval={0}
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as any;
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100">
                          <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                          <p className="text-sm text-blue-600 font-semibold">Receita: {formatCurrency(data.value as number)}</p>
                          <p className="text-sm text-slate-500 font-medium">Vendas: {formatNumber(data.sales as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20} animationDuration={1000}>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChartIcon size={18} className="text-blue-500" />
            Share de Receita por Produto
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {productChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={80} 
                  formatter={(value: any) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <footer className="mt-16 mb-8 text-center text-slate-400 text-sm font-medium">Versão Produção • {isManualUpload ? `Local: ${fileName}` : 'Sincronizado via Google Sheets'}</footer>
    </div>
  );
};

export default App;