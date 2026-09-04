import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, Tooltip,
} from 'recharts';

const METRIC_FORMATS = {
  Revenue:              { prefix: '$', decimals: 0, suffix: '' },
  'Purchase Frequency': { prefix: '',  decimals: 0, suffix: ' ord/day' },
  'Average Order Value':{ prefix: '$', decimals: 2, suffix: '' },
  'Checkout Error Rate':{ prefix: '',  decimals: 2, suffix: '%', scale: 100 },
  'Marketing Spend':    { prefix: '$', decimals: 0, suffix: '/day' },
  'Conversion Rate':    { prefix: '',  decimals: 2, suffix: '%' },
};

function formatValue(kpi, value) {
  if (value === null || value === undefined) return '—';
  const fmt = METRIC_FORMATS[kpi] || { prefix: '', decimals: 2, suffix: '' };
  const v = (fmt.scale ? value * fmt.scale : value);
  return `${fmt.prefix}${v.toFixed(fmt.decimals)}${fmt.suffix}`;
}

const SPARK_COLORS = {
  alert:  { stroke: '#ef4444', fill: '#fee2e2', gradient: ['#ef4444', '#fee2e2'] },
  normal: { stroke: '#6366f1', fill: '#eef2ff', gradient: ['#6366f1', '#eef2ff'] },
};

const CustomTooltipContent = ({ active, payload, label, kpi }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <div className="text-slate-500 mb-0.5">{label}</div>
      <div className="font-bold text-slate-900">{formatValue(kpi, payload[0]?.value)}</div>
    </div>
  );
};

export default function KpiCard({ data, trendData }) {
  const { kpi, status, current_value, pct_change, region, week_start, owner } = data;
  const isAlert = status === 'alert';
  const isUp = pct_change > 0;
  const isZero = pct_change === 0;

  // For Checkout Error Rate, up is BAD; for others, up is good
  const isCheckoutError = kpi === 'Checkout Error Rate';
  const isBadMove = isCheckoutError ? isUp : !isUp;

  const colors = isAlert
    ? SPARK_COLORS.alert
    : SPARK_COLORS.normal;

  const trendSeries = trendData && trendData.length > 0
    ? trendData.slice(-14)
    : null;

  const TrendIcon = isZero ? Minus : isUp ? TrendingUp : TrendingDown;
  const trendColor = isAlert
    ? 'text-rose-600'
    : isZero
    ? 'text-slate-400'
    : isBadMove
    ? 'text-rose-500'
    : 'text-emerald-500';

  const pctDisplay = isZero ? '±0%' : `${isUp ? '+' : ''}${pct_change?.toFixed(1)}%`;

  const caseLink = `/case/${encodeURIComponent(region)}/${week_start}`;

  return (
    <div className={`
      relative bg-white rounded-2xl border overflow-hidden transition-all duration-200
      hover:shadow-md hover:-translate-y-0.5 group cursor-pointer
      ${isAlert
        ? 'border-rose-200 shadow-sm shadow-rose-50'
        : 'border-slate-200 shadow-sm'
      }
    `}>
      {isAlert && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-red-400" />
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                {kpi}
              </span>
              {isAlert && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[10px] font-bold shrink-0">
                  <AlertTriangle size={9} />
                  ALERT
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate">{region}</div>
          </div>

          {/* Trend Badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold shrink-0 ml-2 ${
            isAlert
              ? 'bg-rose-50 text-rose-600 border border-rose-100'
              : isZero
              ? 'bg-slate-50 text-slate-500 border border-slate-100'
              : isBadMove
              ? 'bg-rose-50 text-rose-500 border border-rose-100'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            <TrendIcon size={12} />
            {pctDisplay}
          </div>
        </div>

        {/* Current Value */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-slate-900 animate-count-up">
            {formatValue(kpi, current_value)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Week of {week_start}</div>
        </div>

        {/* Sparkline */}
        {trendSeries && trendSeries.length > 2 ? (
          <div className="h-14 -mx-1 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendSeries} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <defs>
                  <linearGradient id={`grad-${kpi.replace(/\s/g,'-')}-${region}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={colors.stroke} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={colors.stroke} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                  fill={`url(#grad-${kpi.replace(/\s/g,'-')}-${region})`}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
                <Tooltip
                  content={<CustomTooltipContent kpi={kpi} />}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-14 mb-3 bg-slate-50 rounded-lg flex items-center justify-center">
            <span className="text-[10px] text-slate-300 font-medium">Loading trend…</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="text-[10px] text-slate-400 font-medium">
            Owner: {owner || '—'}
          </div>
          {isAlert && (
            <Link
              to={caseLink}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Inspect <ArrowRight size={10} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
