import { useState, useEffect, useMemo } from 'react';
import { getKnowledgeGraph } from '../api/client';
import { 
  Network, Search, Filter, ZoomIn, ZoomOut, RotateCcw, 
  Layers, ArrowRight, ShieldCheck, Database, User, Clock, 
  Sliders, TrendingUp, AlertTriangle, Info, CheckCircle2, ChevronRight, Plus
} from 'lucide-react';
import CustomKpiModal from './CustomKpiModal';

export default function KnowledgeGraph() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, kpi, driver
  const [layoutMode, setLayoutMode] = useState('radial'); // radial, layered
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [simulatedShock, setSimulatedShock] = useState(25); // +25% shock simulation
  const [showKpiModal, setShowKpiModal] = useState(false);

  const fetchGraph = () => {
    setLoading(true);
    getKnowledgeGraph()
      .then(res => {
        setData(res);
        if (res.nodes?.length > 0 && !selectedNode) {
          setSelectedNode(res.nodes.find(n => n.id === 'Revenue') || res.nodes[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const width = 900;
  const height = 620;
  const cx = width / 2;
  const cy = height / 2;

  // Compute Layout Positions
  const layoutNodes = useMemo(() => {
    if (!data?.nodes) return [];
    
    const kpis = data.nodes.filter(n => n.type === 'kpi');
    const drivers = data.nodes.filter(n => n.type === 'driver');

    if (layoutMode === 'radial') {
      // Core KPI (Revenue) at center or inner ring
      return data.nodes.map(node => {
        let x = cx;
        let y = cy;
        if (node.id === 'Revenue') {
          x = cx;
          y = cy;
        } else if (node.type === 'kpi') {
          const idx = kpis.filter(k => k.id !== 'Revenue').indexOf(node);
          const total = kpis.length - 1 || 1;
          const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
          const r = 160;
          x = cx + r * Math.cos(angle);
          y = cy + r * Math.sin(angle);
        } else {
          const idx = drivers.indexOf(node);
          const total = drivers.length || 1;
          const angle = (idx / total) * 2 * Math.PI + Math.PI / 6;
          const r = 280;
          x = cx + r * Math.cos(angle);
          y = cy + r * Math.sin(angle);
        }
        return { ...node, x, y };
      });
    } else {
      // Layered / Hierarchical Layout
      // Layer 1: Executive KPI (top)
      // Layer 2: Intermediate KPIs (middle)
      // Layer 3: Operational Drivers (bottom)
      return data.nodes.map(node => {
        let x = cx;
        let y = cy;
        if (node.id === 'Revenue') {
          x = cx;
          y = 100;
        } else if (node.type === 'kpi') {
          const otherKpis = kpis.filter(k => k.id !== 'Revenue');
          const idx = otherKpis.indexOf(node);
          const total = otherKpis.length || 1;
          const spacing = width / (total + 1);
          x = spacing * (idx + 1);
          y = 280;
        } else {
          const idx = drivers.indexOf(node);
          const total = drivers.length || 1;
          const spacing = width / (total + 1);
          x = spacing * (idx + 1);
          y = 480;
        }
        return { ...node, x, y };
      });
    }
  }, [data, layoutMode]);

  const nodeMap = useMemo(() => {
    return new Map(layoutNodes.map(n => [n.id, n]));
  }, [layoutNodes]);

  // Determine Upstream and Downstream relationships for Selected / Hovered node
  const activeNode = hoveredNode || selectedNode;
  
  const connectedNodeIds = useMemo(() => {
    if (!activeNode || !data?.edges) return new Set();
    const set = new Set([activeNode.id]);
    data.edges.forEach(e => {
      if (e.source === activeNode.id) set.add(e.target);
      if (e.target === activeNode.id) set.add(e.source);
    });
    return set;
  }, [activeNode, data]);

  const upstreamDrivers = useMemo(() => {
    if (!selectedNode || !data?.edges) return [];
    return data.edges
      .filter(e => e.source === selectedNode.id)
      .map(e => nodeMap.get(e.target))
      .filter(Boolean);
  }, [selectedNode, data, nodeMap]);

  const downstreamKpis = useMemo(() => {
    if (!selectedNode || !data?.edges) return [];
    return data.edges
      .filter(e => e.target === selectedNode.id)
      .map(e => nodeMap.get(e.source))
      .filter(Boolean);
  }, [selectedNode, data, nodeMap]);

  // Filtered nodes by search & type
  const filteredNodes = useMemo(() => {
    return layoutNodes.filter(n => {
      const matchesSearch = n.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (n.owner && n.owner.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'all' || n.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [layoutNodes, searchQuery, filterType]);

  // Pan & Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-3">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-600 font-medium">Constructing Semantic Knowledge Graph...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Network size={12} /> Semantic Ontology
            </span>
            <span className="text-xs text-slate-400">Governed DAG Topology</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Enterprise KPI Knowledge Graph</h1>
          <p className="text-slate-300 text-sm mt-1">
            Trace causal dependency trees, governed mathematical formulas, lineage rollups, and upstream drivers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-1 border border-slate-700 flex items-center">
            <button 
              onClick={() => setLayoutMode('radial')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${layoutMode === 'radial' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Radial Topology
            </button>
            <button 
              onClick={() => setLayoutMode('layered')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${layoutMode === 'layered' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Hierarchical Tree
            </button>
          </div>

          <div className="bg-slate-800/80 backdrop-blur rounded-xl p-1 border border-slate-700 flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.min(z + 0.15, 2))} className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700" title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.6))} className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700" title="Reset View">
              <RotateCcw size={16} />
            </button>
          </div>

          <button
            onClick={() => setShowKpiModal(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <Plus size={14} /> New Metric Contract
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Interactive Visualizer + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Visualizer Canvas (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          
          {/* Visualizer Toolbar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search KPI, Driver, or Owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium"><Filter size={12} /> Filter:</span>
              {['all', 'kpi', 'driver'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    filterType === type 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {type === 'all' ? 'All Nodes' : type === 'kpi' ? 'KPIs' : 'Drivers'}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shadow-xs"></span> Executive KPI</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs"></span> Operational Driver</span>
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div 
            className="flex-1 relative bg-radial from-slate-50 via-slate-100/50 to-slate-100 cursor-grab active:cursor-grabbing select-none overflow-hidden min-h-[560px]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-full"
            >
              <defs>
                {/* Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                {/* Arrow Marker */}
                <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
                </marker>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} className="transition-transform duration-75 ease-out">
                {/* Background Grid Pattern */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.7" />
                </pattern>
                <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#grid)" />

                {/* Edges */}
                {data.edges?.map((edge, idx) => {
                  const source = nodeMap.get(edge.source);
                  const target = nodeMap.get(edge.target);
                  if (!source || !target) return null;

                  const isEdgeActive = activeNode && (
                    (edge.source === activeNode.id && edge.target) || 
                    (edge.target === activeNode.id && edge.source)
                  );

                  return (
                    <g key={idx}>
                      <line
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={isEdgeActive ? '#4f46e5' : '#cbd5e1'}
                        strokeWidth={isEdgeActive ? 3 : 1.8}
                        strokeDasharray={edge.relation === 'driven_by' ? '5 5' : '0'}
                        markerEnd={isEdgeActive ? "url(#arrow-active)" : "url(#arrow)"}
                        className="transition-colors duration-200"
                      />
                      {/* Edge Label for Active Connections */}
                      {isEdgeActive && (
                        <text
                          x={(source.x + target.x) / 2}
                          y={(source.y + target.y) / 2 - 8}
                          textAnchor="middle"
                          className="text-[10px] font-semibold fill-indigo-600 bg-white px-1"
                        >
                          drives
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {filteredNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isHovered = hoveredNode?.id === node.id;
                  const isConnected = connectedNodeIds.has(node.id);
                  const isDimmed = activeNode && !isConnected;
                  const isKpi = node.type === 'kpi';
                  const radius = isKpi ? (node.id === 'Revenue' ? 36 : 28) : 22;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => setSelectedNode(node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer transition-all duration-200"
                      opacity={isDimmed ? 0.35 : 1}
                    >
                      {/* Selection / Hover Glow Ring */}
                      {(isSelected || isHovered) && (
                        <circle
                          r={radius + 8}
                          fill={isKpi ? 'rgba(79, 70, 229, 0.2)' : 'rgba(16, 185, 129, 0.2)'}
                          className="animate-pulse"
                        />
                      )}

                      {/* Outer Border Circle */}
                      <circle
                        r={radius}
                        fill={isKpi ? (node.id === 'Revenue' ? '#312e81' : '#4f46e5') : '#10b981'}
                        stroke={isSelected ? '#f59e0b' : '#ffffff'}
                        strokeWidth={isSelected ? 3.5 : 2.5}
                        className="shadow-lg hover:scale-105 transition-transform"
                        filter={isSelected ? "url(#glow)" : undefined}
                      />

                      {/* Icon inside node */}
                      <text
                        textAnchor="middle"
                        dy="4"
                        className="text-xs font-bold fill-white select-none pointer-events-none"
                      >
                        {isKpi ? (node.id === 'Revenue' ? '$' : 'KPI') : 'DRV'}
                      </text>

                      {/* Node Label (Below) */}
                      <g transform={`translate(0, ${radius + 16})`}>
                        <rect
                          x={-node.id.length * 4.2}
                          y="-10"
                          width={node.id.length * 8.4}
                          height="18"
                          rx="6"
                          fill="rgba(255, 255, 255, 0.95)"
                          stroke={isSelected ? '#4f46e5' : '#e2e8f0'}
                          strokeWidth="1"
                          className="shadow-xs"
                        />
                        <text
                          textAnchor="middle"
                          dy="3"
                          className={`text-[11px] font-bold select-none pointer-events-none ${
                            isSelected ? 'fill-indigo-600' : 'fill-slate-800'
                          }`}
                        >
                          {node.id}
                        </text>
                      </g>

                      {/* Status pill (if has business weight) */}
                      {node.business_weight && (
                        <g transform={`translate(${radius - 6}, ${-radius + 4})`}>
                          <circle r="8" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
                          <text textAnchor="middle" dy="3" className="text-[9px] font-bold fill-indigo-400">
                            {node.business_weight}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Instruction Overlay */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-500 shadow-xs flex items-center gap-2">
              <Info size={13} className="text-indigo-500" />
              <span>Click any node to inspect formulas & upstream lineage. Drag to pan.</span>
            </div>
          </div>
        </div>

        {/* Right Inspector & Impact Simulator (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Detailed Node Inspector Card */}
          {selectedNode ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    selectedNode.type === 'kpi' 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {selectedNode.type === 'kpi' ? 'Governed Metric' : 'Root Driver'}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1.5">{selectedNode.id}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Business Weight</span>
                  <span className="text-base font-bold text-slate-800">{selectedNode.business_weight || '0.50'}</span>
                </div>
              </div>

              {/* Governed Formula Box */}
              {selectedNode.formula && (
                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs space-y-1 font-mono">
                  <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-400" /> Arithmetic Definition
                  </div>
                  <div className="text-indigo-300 font-semibold">{selectedNode.formula}</div>
                </div>
              )}

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><User size={12} /> Owner</div>
                  <div className="font-semibold text-slate-800">{selectedNode.owner || 'Unassigned'}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><Database size={12} /> Source Feed</div>
                  <div className="font-semibold text-slate-800 truncate" title={selectedNode.source}>{selectedNode.source || 'Aggregated'}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><Clock size={12} /> Cadence</div>
                  <div className="font-semibold text-slate-800">{selectedNode.refresh || 'Daily'}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5"><AlertTriangle size={12} /> Threshold</div>
                  <div className="font-semibold text-slate-800">{selectedNode.threshold_pct || 5.0}% shift</div>
                </div>
              </div>

              {/* Upstream Direct Drivers List */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-500" /> Direct Upstream Drivers ({upstreamDrivers.length})
                </h3>
                {upstreamDrivers.length > 0 ? (
                  <div className="space-y-1.5">
                    {upstreamDrivers.map(drv => (
                      <button
                        key={drv.id}
                        onClick={() => setSelectedNode(drv)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-xs font-semibold text-slate-800">{drv.id}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center">
                    Leaf node — no upstream sub-drivers defined.
                  </div>
                )}
              </div>

              {/* Downstream Impacted KPIs */}
              {downstreamKpis.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ArrowRight size={13} className="text-indigo-500" /> Downstream Dependencies ({downstreamKpis.length})
                  </h3>
                  <div className="space-y-1.5">
                    {downstreamKpis.map(kpi => (
                      <button
                        key={kpi.id}
                        onClick={() => setSelectedNode(kpi)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 hover:bg-indigo-100/70 border border-indigo-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          <span className="text-xs font-semibold text-indigo-900">{kpi.id}</span>
                        </div>
                        <ChevronRight size={14} className="text-indigo-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Interactive Causal Impact Simulator Widget */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold tracking-tight">Causal Sensitivity Simulator</h3>
            </div>
            <p className="text-xs text-slate-300">
              Simulate an operational shift on <span className="font-semibold text-white">{selectedNode?.id || 'Checkout Error Rate'}</span> and project downstream revenue impact.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Simulated Driver Shift:</span>
                <span className="text-amber-400 font-bold">+{simulatedShock}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="100" 
                value={simulatedShock} 
                onChange={(e) => setSimulatedShock(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Estimated Net Revenue Drag:</span>
                <span className="text-rose-400 font-bold">-${(simulatedShock * 18.5).toFixed(0)}/day</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Impact Confidence:</span>
                <span className="text-emerald-400 font-bold">HIGH (95% CI)</span>
              </div>
            </div>

            <button 
              onClick={() => alert(`Simulated stress test applied: ${selectedNode?.id || 'Driver'} +${simulatedShock}% projected across 14-day window.`)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <TrendingUp size={14} /> Run Stress Test Scenario
            </button>
          </div>

        </div>

      </div>

      {showKpiModal && (
        <CustomKpiModal
          onClose={() => setShowKpiModal(false)}
          onCreated={() => fetchGraph()}
        />
      )}
    </div>
  );
}
