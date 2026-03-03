import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

interface KPIChartProps {
  data: any[];
  title: string;
  series: ChartSeries[];
  type?: 'line' | 'bar';
  showLegend?: boolean;
  currencyFormat?: boolean;
}

const formatTooltipValue = (value: any, _name: string, _props: any, isCurrency: boolean) => {
  if (typeof value !== 'number') return value;
  if (isCurrency) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const KPIChart = ({ data, title, series, type = 'line', showLegend = true, currencyFormat = false }: KPIChartProps) => {
  const formattedData = useMemo(() => {
    return data.map(d => {
      if (d.dateFormatted) return d; // Respect pre-formatted dates
      if (!d.date) {
        return {
          ...d,
          dateFormatted: d.monthLabel || d.month || d.name || ''
        };
      }
      const dObj = new Date(d.date);
      return {
        ...d,
        dateFormatted: isNaN(dObj.getTime()) ? d.date : dObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
      };
    });
  }, [data]);

  const tooltipFormatter = (value: any, name: string, props: any) =>
    formatTooltipValue(value, name, props, currencyFormat);

  const renderChart = () => {
    const commonProps = {
      data: formattedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    if (type === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="dateFormatted" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
            formatter={tooltipFormatter}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          {showLegend && <Legend />}
          {series.map(s => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="dateFormatted" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        {showLegend && <Legend />}
        {series.map(s => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <Card className="animate-fade-in h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPIChart;

