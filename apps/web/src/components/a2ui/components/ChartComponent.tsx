/**
 * Chart Component for A2UI
 * 用于数据可视化（使用 recharts）
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

interface ChartComponentProps {
  chartType: 'line' | 'bar' | 'pie' | 'area';
  title?: string;
  data: Array<Record<string, any>>;
  xAxis?: { dataKey: string; label?: string };
  yAxis?: { label?: string };
  series: ChartSeries[];
  legend?: boolean;
  tooltip?: boolean;
  onEvent?: (eventName: string, data: any) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ChartComponent({
  chartType,
  title,
  data,
  xAxis,
  yAxis,
  series,
  legend = true,
  tooltip = true,
  onEvent,
}: ChartComponentProps) {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            {xAxis && <XAxis dataKey={xAxis.dataKey} />}
            <YAxis />
            {tooltip && <Tooltip />}
            {legend && <Legend />}
            {series.map((s, index) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color || COLORS[index % COLORS.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            {xAxis && <XAxis dataKey={xAxis.dataKey} />}
            <YAxis />
            {tooltip && <Tooltip />}
            {legend && <Legend />}
            {series.map((s, index) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={s.color || COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={series[0]?.dataKey || 'value'}
              nameKey={xAxis?.dataKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {tooltip && <Tooltip />}
            {legend && <Legend />}
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            {xAxis && <XAxis dataKey={xAxis.dataKey} />}
            <YAxis />
            {tooltip && <Tooltip />}
            {legend && <Legend />}
            {series.map((s, index) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color || COLORS[index % COLORS.length]}
                fill={s.color || COLORS[index % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
