import React, { useMemo } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';

interface SalesChartProps {
  data?: Record<string, number>;
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        <p className="text-sm text-success">
          Ventas: {payload[0].value.toFixed(2)} USDT
        </p>
      </div>
    );
  }
  return null;
};

const defaultDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

export const SalesChart: React.FC<SalesChartProps> = ({ data, isLoading }) => {
  const { t } = useApp();

  const chartData = useMemo(() => {
    if (!data) {
      return defaultDays.map((date) => ({ date, sales: 0 }));
    }
    // Convert object to array, maintaining day order
    return defaultDays.map((date) => ({
      date,
      sales: data[date] || 0,
    }));
  }, [data]);

  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ventas Semanales</h3>
          <p className="text-sm text-muted-foreground">
            Últimos 7 días (USDT)
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
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
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
                tickFormatter={(value) => value.toFixed(0)}
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
        )}
      </div>
    </div>
  );
};
