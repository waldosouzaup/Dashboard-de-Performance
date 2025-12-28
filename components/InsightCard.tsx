
import React from 'react';

interface InsightCardProps {
  title: string;
  mainValue: string;
  subValue: string;
  icon: React.ReactNode;
}

const InsightCard: React.FC<InsightCardProps> = ({ title, mainValue, subValue, icon }) => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md flex items-start gap-4">
      <div className="p-2.5 rounded-xl bg-slate-50 mt-1">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h4 className="text-base font-bold text-slate-800 line-clamp-1">{mainValue}</h4>
        <p className="text-sm text-slate-500 font-medium">{subValue}</p>
      </div>
    </div>
  );
};

export default InsightCard;
