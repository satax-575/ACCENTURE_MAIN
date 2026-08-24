import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';

export default function ForecastChart({ data }) {
  if (!data || !data.historical) return null;

  const chartData = [
    ...data.historical.map(d => ({ date: d.date, actual: d.value })),
    ...data.forecast.map(d => ({ date: d.date, forecast: d.value, range: [d.lower, d.upper] }))
  ];

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="range" fill="#e0e7ff" stroke="none" />
          <Line type="monotone" dataKey="actual" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="forecast" stroke="#4f46e5" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
