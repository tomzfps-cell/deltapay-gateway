import React from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const mockData = [
  { date: 'Lun', sales: 2400000, withdrawals: 400 },
  { date: 'Mar', sales: 1398000, withdrawals: 300 },
  { date: 'Mie', sales: 9800000, withdrawals: 1200 },
  { date: 'Jue', sales: 3908000, withdrawals: 800 },
  { date: 'Vie', sales: 4800000, withdrawals: 900 },
  { date: 'Sab', sales: 3800000, withdrawals: 600 },
  { date: 'Dom', sales: 4300000, withdrawals: 700 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        <p className="text-sm text-success">
          Ventas: ${(payload[0].value / 1000000).toFixed(2)}M ARS
        </p>
      </div>
    );
  }
  return null;
};

export const SalesChart: React.FC = () => {
  const { t } = useApp();

  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ventas Semanales</h3>
          <p className="text-sm text-muted-foreground">
            Últimos 7 días
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Ventas</span>
          </div>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={mockData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(187, 92%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(187, 92%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(222, 30%, 16%)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="hsl(187, 92%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSales)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
