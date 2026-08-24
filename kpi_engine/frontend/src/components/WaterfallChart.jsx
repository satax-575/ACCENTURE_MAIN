import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function WaterfallChart({ data, startValue }) {
  if (!data || !data.components) return null;

  // Prepare data for floating waterfall chart
  let runningTotal = startValue;
  const chartData = [
    { name: 'Start', start: 0, end: startValue, val: startValue, isTotal: true },
  ];

  data.components.forEach(comp => {
    const endTotal = runningTotal + comp.value;
    chartData.push({
      name: comp.name,
      start: Math.min(runningTotal, endTotal),
      end: Math.max(runningTotal, endTotal),
      val: comp.value,
      isTotal: false
    });
    runningTotal = endTotal;
  });

  chartData.push({
    name: 'End', start: 0, end: runningTotal, val: runningTotal, isTotal: true
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded">
          <p className="font-semibold">{data.name}</p>
          <p>{data.isTotal ? 'Value: ' : 'Change: '}{data.val}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="end" fill="#8884d8">
            {chartData.map((entry, index) => {
              let color = '#94a3b8'; // default gray for totals
              if (!entry.isTotal) {
                color = entry.val >= 0 ? '#10b981' : '#f43f5e'; // green if pos, red if neg
              } else if (index === chartData.length - 1) {
                color = '#4f46e5'; // end total color
              }
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
