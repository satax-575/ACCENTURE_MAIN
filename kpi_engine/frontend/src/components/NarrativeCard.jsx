export default function NarrativeCard({ narrative }) {
  if (!narrative) return null;
  return (
    <div className="mb-4 text-lg p-4 bg-indigo-50 text-indigo-900 rounded-lg border border-indigo-100 shadow-inner">
      {narrative}
    </div>
  );
}
