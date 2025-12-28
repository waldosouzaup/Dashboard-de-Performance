
export interface SaleRecord {
  data: string;
  produto: string;
  quantidade_vendida: number;
  receita: number;
  origem: string;
  custo_aquisicao: number;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  bestMonth: { month: string; value: number; count: number };
  bestProduct: { name: string; value: number };
  bestSource: { name: string; value: number };
}

export interface ChartDataPoint {
  name: string;
  value: number;
}
