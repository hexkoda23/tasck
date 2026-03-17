import React, { useState, useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import Avatar from '../../../components/shared/Avatar';
import DetailPopup from '../../../components/shared/DetailPopup';
import { formatNaira } from '../../../lib/utils';
import { Network, Filter, ZoomIn, ZoomOut, Maximize2, Users, Building2, Handshake } from 'lucide-react';

const nodes = [
  // Brands
  { id: 'b-cocacola', name: 'Coca-Cola', type: 'brand', value: 178000000, deals: 2, color: '#EF4444', industry: 'FMCG' },
  { id: 'b-mtn', name: 'MTN Nigeria', type: 'brand', value: 90000000, deals: 2, color: '#F59E0B', industry: 'Telecoms' },
  { id: 'b-guinness', name: 'Guinness', type: 'brand', value: 45000000, deals: 1, color: '#8B5CF6', industry: 'Alcohol' },
  { id: 'b-access', name: 'Access Bank', type: 'brand', value: 55000000, deals: 1, color: '#2F55FF', industry: 'Banking' },
  { id: 'b-star', name: 'Star Lager', type: 'brand', value: 95000000, deals: 1, color: '#06B6D4', industry: 'Alcohol' },
  { id: 'b-pepsi', name: 'Pepsi Nigeria', type: 'brand', value: 65000000, deals: 1, color: '#EC4899', industry: 'FMCG' },
  { id: 'b-uba', name: 'UBA', type: 'brand', value: 18000000, deals: 1, color: '#F97316', industry: 'Banking' },
  { id: 'b-dangote', name: 'Dangote', type: 'brand', value: 180000000, deals: 1, color: '#22C55E', industry: 'Energy' },
  { id: 'b-airtel', name: 'Airtel Nigeria', type: 'brand', value: 85000000, deals: 1, color: '#EF4444', industry: 'Telecoms' },
  { id: 'b-gtbank', name: 'GTBank', type: 'brand', value: 42000000, deals: 1, color: '#F59E0B', industry: 'Banking' },
  // Creatives
  { id: 'c-mavin', name: 'Mavin Records', type: 'creative', value: 150000000, deals: 2, color: '#22C55E', genre: 'Record Label' },
  { id: 'c-tems', name: 'Tems', type: 'creative', value: 75000000, deals: 1, color: '#8B5CF6', genre: 'Afrobeats/R&B' },
  { id: 'c-burna', name: 'Burna Boy', type: 'creative', value: 130000000, deals: 2, color: '#2F55FF', genre: 'Afrobeats' },
  { id: 'c-davido', name: 'Davido', type: 'creative', value: 55000000, deals: 1, color: '#F59E0B', genre: 'Afrobeats' },
  { id: 'c-rema', name: 'Rema', type: 'creative', value: 107000000, deals: 2, color: '#06B6D4', genre: 'Afrobeats' },
  { id: 'c-ayra', name: 'Ayra Starr', type: 'creative', value: 65000000, deals: 1, color: '#EC4899', genre: 'Afrobeats' },
  { id: 'c-fireboy', name: 'Fireboy DML', type: 'creative', value: 33000000, deals: 2, color: '#F97316', genre: 'Afrobeats' },
  { id: 'c-donjazzy', name: 'Don Jazzy', type: 'creative', value: 35000000, deals: 1, color: '#22C55E', genre: 'Producer' },
  { id: 'c-wizkid', name: 'Wizkid', type: 'creative', value: 180000000, deals: 1, color: '#2F55FF', genre: 'Afrobeats' },
  { id: 'c-gold', name: 'Adekunle Gold', type: 'creative', value: 42000000, deals: 1, color: '#F59E0B', genre: 'Afropop' },
  // TASCK (center hub)
  { id: 'tasck', name: 'TASCK', type: 'hub', value: 847000000, deals: 15, color: '#2F55FF' },
];

const links = [
  // Brand-to-TASCK
  { source: 'b-cocacola', target: 'tasck', value: 178000000, label: '2 deals' },
  { source: 'b-mtn', target: 'tasck', value: 90000000, label: '2 deals' },
  { source: 'b-guinness', target: 'tasck', value: 45000000, label: '1 deal' },
  { source: 'b-access', target: 'tasck', value: 55000000, label: '1 deal' },
  { source: 'b-star', target: 'tasck', value: 95000000, label: '1 deal' },
  { source: 'b-pepsi', target: 'tasck', value: 65000000, label: '1 deal' },
  { source: 'b-uba', target: 'tasck', value: 18000000, label: '1 deal' },
  { source: 'b-dangote', target: 'tasck', value: 180000000, label: '1 deal' },
  { source: 'b-airtel', target: 'tasck', value: 85000000, label: '1 deal' },
  { source: 'b-gtbank', target: 'tasck', value: 42000000, label: '1 deal' },
  // TASCK-to-Creative
  { source: 'tasck', target: 'c-mavin', value: 150000000, label: '2 deals' },
  { source: 'tasck', target: 'c-tems', value: 75000000, label: '1 deal' },
  { source: 'tasck', target: 'c-burna', value: 130000000, label: '2 deals' },
  { source: 'tasck', target: 'c-davido', value: 55000000, label: '1 deal' },
  { source: 'tasck', target: 'c-rema', value: 107000000, label: '2 deals' },
  { source: 'tasck', target: 'c-ayra', value: 65000000, label: '1 deal' },
  { source: 'tasck', target: 'c-fireboy', value: 33000000, label: '2 deals' },
  { source: 'tasck', target: 'c-donjazzy', value: 35000000, label: '1 deal' },
  { source: 'tasck', target: 'c-wizkid', value: 180000000, label: '1 deal' },
  { source: 'tasck', target: 'c-gold', value: 42000000, label: '1 deal' },
  // Direct brand-creative connections (active deals)
  { source: 'b-cocacola', target: 'c-mavin', value: 150000000, label: 'Coke Studio S3', active: true },
  { source: 'b-mtn', target: 'c-tems', value: 75000000, label: 'Pulse Music', active: true },
  { source: 'b-guinness', target: 'c-burna', value: 45000000, label: 'Night Football', active: true },
  { source: 'b-access', target: 'c-davido', value: 55000000, label: '25th Anniversary', active: true },
  { source: 'b-star', target: 'c-rema', value: 95000000, label: 'Music Live', active: true },
  { source: 'b-pepsi', target: 'c-ayra', value: 65000000, label: 'Summer Music', active: true },
  { source: 'b-uba', target: 'c-fireboy', value: 18000000, label: 'Digital Concert', active: true },
  { source: 'b-dangote', target: 'c-wizkid', value: 180000000, label: 'Brand Campaign', active: true },
  { source: 'b-airtel', target: 'c-burna', value: 85000000, label: 'Ambassador', active: true },
  { source: 'b-gtbank', target: 'c-gold', value: 42000000, label: 'Food & Music', active: true },
];

const V2Network = () => {
  const graphRef = useRef();
  const containerRef = useRef();
  const [popup, setPopup] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: Math.max(500, window.innerHeight - 280)
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const graphData = React.useMemo(() => {
    let filteredNodes = [...nodes];
    let filteredLinks = [...links];
    if (filterType === 'brands') {
      const ids = new Set(nodes.filter(n => n.type === 'brand' || n.type === 'hub').map(n => n.id));
      filteredNodes = nodes.filter(n => ids.has(n.id));
      filteredLinks = links.filter(l => ids.has(l.source?.id || l.source) && ids.has(l.target?.id || l.target));
    } else if (filterType === 'creatives') {
      const ids = new Set(nodes.filter(n => n.type === 'creative' || n.type === 'hub').map(n => n.id));
      filteredNodes = nodes.filter(n => ids.has(n.id));
      filteredLinks = links.filter(l => ids.has(l.source?.id || l.source) && ids.has(l.target?.id || l.target));
    } else if (filterType === 'deals') {
      filteredLinks = links.filter(l => l.active);
      const nodeIds = new Set();
      filteredLinks.forEach(l => { nodeIds.add(l.source?.id || l.source); nodeIds.add(l.target?.id || l.target); });
      filteredNodes = nodes.filter(n => nodeIds.has(n.id));
    }
    return { nodes: filteredNodes, links: filteredLinks };
  }, [filterType]);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const size = node.type === 'hub' ? 20 : 8 + Math.sqrt(node.value / 10000000);
    const isHovered = hoveredNode === node.id;

    // Glow
    if (isHovered || node.type === 'hub') {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = isHovered ? 20 : 10;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.type === 'hub' ? '#2F55FF' : `${node.color}${isHovered ? 'CC' : '60'}`;
    ctx.fill();
    ctx.strokeStyle = `${node.color}${isHovered ? 'FF' : '40'}`;
    ctx.lineWidth = isHovered ? 2 : 0.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label
    const label = node.name;
    const fontSize = node.type === 'hub' ? 12 / globalScale : 9 / globalScale;
    ctx.font = `${node.type === 'hub' ? 'bold ' : ''}${fontSize}px Geist Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHovered ? '#FFFFFF' : node.type === 'hub' ? '#FFFFFF' : 'rgba(255,255,255,0.5)';
    ctx.fillText(label, node.x, node.y + size + fontSize + 2);

    // Type indicator
    if (node.type !== 'hub') {
      const typeLabel = node.type === 'brand' ? 'B' : 'C';
      ctx.font = `bold ${6 / globalScale}px Geist Mono, monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(typeLabel, node.x, node.y);
    } else {
      ctx.font = `bold ${10 / globalScale}px Geist Mono, monospace`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('T', node.x, node.y);
    }
  }, [hoveredNode]);

  const linkCanvasObject = useCallback((link, ctx) => {
    const isActive = link.active;
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = isActive ? 'rgba(47,85,255,0.3)' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = isActive ? 1.5 : 0.5;
    if (isActive) ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const brandCount = nodes.filter(n => n.type === 'brand').length;
  const creativeCount = nodes.filter(n => n.type === 'creative').length;
  const activeDeals = links.filter(l => l.active).length;

  return (
    <div className="space-y-5 animate-fade-in" data-testid="v2-network">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/25 text-[10px] uppercase tracking-[0.15em] mb-1">RELATIONSHIP NETWORK</p>
          <h1 className="text-white text-xl font-bold tracking-tight">Ecosystem Graph</h1>
          <p className="text-white/30 text-xs">{brandCount} brands &middot; {creativeCount} creatives &middot; {activeDeals} active deals</p>
        </div>
        <div className="flex items-center gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'brands', label: 'Brands' },
            { key: 'creatives', label: 'Creatives' },
            { key: 'deals', label: 'Active Deals' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              data-testid={`network-filter-${f.key}`}
              className={`px-3 py-1.5 rounded-lg text-[10px] transition-colors ${filterType === f.key ? 'bg-[#2F55FF]/15 text-[#6B8AFF] border border-[#2F55FF]/20' : 'text-white/30 border border-white/[0.04] hover:text-white/50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="v2-card p-3 flex items-center gap-3">
          <Building2 className="w-4 h-4 text-[#EF4444]" />
          <div><p className="text-[10px] text-white/20">Brands</p><p className="text-white font-bold font-mono">{brandCount}</p></div>
        </div>
        <div className="v2-card p-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-[#22C55E]" />
          <div><p className="text-[10px] text-white/20">Creatives</p><p className="text-white font-bold font-mono">{creativeCount}</p></div>
        </div>
        <div className="v2-card p-3 flex items-center gap-3">
          <Handshake className="w-4 h-4 text-[#2F55FF]" />
          <div><p className="text-[10px] text-white/20">Active Deals</p><p className="text-white font-bold font-mono">{activeDeals}</p></div>
        </div>
        <div className="v2-card p-3 flex items-center gap-3">
          <Network className="w-4 h-4 text-[#8B5CF6]" />
          <div><p className="text-[10px] text-white/20">Connections</p><p className="text-white font-bold font-mono">{links.length}</p></div>
        </div>
      </div>

      {/* Graph */}
      <div className="v2-card overflow-hidden relative" ref={containerRef} data-testid="network-graph">
        {/* Controls */}
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          <button onClick={() => graphRef.current?.zoomToFit(400, 40)} className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/[0.06] text-white/30 hover:text-white/60 transition-colors" data-testid="network-fit">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 flex gap-3">
          <span className="flex items-center gap-1.5 text-[9px] text-white/25"><div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/60" />Brands</span>
          <span className="flex items-center gap-1.5 text-[9px] text-white/25"><div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/60" />Creatives</span>
          <span className="flex items-center gap-1.5 text-[9px] text-white/25"><div className="w-2.5 h-2.5 rounded-full bg-[#2F55FF]" />TASCK Hub</span>
          <span className="flex items-center gap-1.5 text-[9px] text-white/25"><div className="w-6 h-0 border-t border-dashed border-[#2F55FF]/40" />Active Deal</span>
        </div>

        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          nodePointerAreaPaint={(node, color, ctx) => {
            const size = node.type === 'hub' ? 20 : 8 + Math.sqrt(node.value / 10000000);
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          onNodeHover={node => setHoveredNode(node?.id || null)}
          onNodeClick={node => setPopup({ type: node.type, data: node })}
          linkDirectionalParticles={link => link.active ? 2 : 0}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => '#2F55FF'}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          warmupTicks={50}
          cooldownTicks={100}
        />
      </div>

      {/* Popup */}
      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.data?.name}>
        {popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3">
                <p className="text-[10px] text-[#94A3B8]">Type</p>
                <p className="text-sm font-medium capitalize">{popup.data.type === 'hub' ? 'Platform Hub' : popup.data.type}</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-3">
                <p className="text-[10px] text-[#94A3B8]">Total Value</p>
                <p className="text-lg font-bold font-mono">{formatNaira(popup.data.value, { compact: true })}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3">
                <p className="text-[10px] text-[#94A3B8]">Deals</p>
                <p className="text-sm font-bold">{popup.data.deals}</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-3">
                <p className="text-[10px] text-[#94A3B8]">{popup.data.industry ? 'Industry' : popup.data.genre ? 'Genre' : 'Role'}</p>
                <p className="text-sm">{popup.data.industry || popup.data.genre || 'Hub'}</p>
              </div>
            </div>
            {popup.data.type !== 'hub' && (
              <button className="btn-primary text-xs w-full py-2">View {popup.data.type === 'brand' ? 'Brand' : 'Creative'} Profile</button>
            )}
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default V2Network;
