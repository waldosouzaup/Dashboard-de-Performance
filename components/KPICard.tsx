
import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, trend, trendPositive }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md flex flex-col justify-between h-36">
      <div className="flex items-center gap-3 text-slate-500 font-medium">
        <div className="p-2 rounded-lg bg-slate-50">
          {icon}
        </div>
        <span className="text-sm">{title}</span>
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${trendPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trendPositive ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default KPICard;
