"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { 
  DndContext, rectIntersection, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, 
  horizontalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2canvas from 'html2canvas';

// --- Types ---
interface SpireCard {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: string;
  rarity: string;
  image_url: string;
  keywords?: string[]; 
}

const TIER_ROWS = [
  { id: 'S', color: '#ff1f1f', label: 'S' },
  { id: 'A', color: '#ff8c00', label: 'A' },
  { id: 'B', color: '#ffd700', label: 'B' },
  { id: 'C', color: '#32cd32', label: 'C' },
  { id: 'D', color: '#1e90ff', label: 'D' },
];

const CHARACTER_ORDER = ["ironclad", "silent", "regent", "necrobinder", "defect"];

// --- Helpers ---
const parseDescription = (card: SpireCard) => {
  if (!card) return "";
  let text = card.description || "";
  let parsed = text
    .replace(/\n/g, '<br/>')
    .replace(/\[gold\](.*?)\[\/gold\]/gi, '<span style="color: #fde047; font-weight: bold;">$1</span>')
    .replace(/\[relic\](.*?)\[\/relic\]/gi, '<span style="color: #fb7185; font-weight: bold;">$1</span>')
    .replace(/\[kw\](.*?)\[\/kw\]/gi, '<span style="color: #ffffff; font-weight: 800; border-bottom: 1px dashed #666;">$1</span>')
    .replace(/\[energy\]/gi, '⚡️');

  if (card.keywords && card.keywords.length > 0) {
    const exhaustKeywords = card.keywords.filter(kw => kw === "廃棄" || kw === "Exhaust");
    const topKeywords = card.keywords.filter(kw => kw !== "廃棄" && kw !== "Exhaust");
    if (topKeywords.length > 0) {
      const topHtml = topKeywords.map(kw => `<span style="color: #82eefd; font-weight: 800;">${kw}。</span>`).join(' ');
      parsed = topHtml + '<br/>' + parsed;
    }
    if (exhaustKeywords.length > 0) {
      const bottomHtml = exhaustKeywords.map(kw => `<span style="color: #82eefd; font-weight: 800;">${kw}。</span>`).join(' ');
      parsed = parsed + (parsed ? '<br/>' : '') + bottomHtml;
    }
  }
  return parsed;
};

const formatImageUrl = (url: string) => {
  if (!url) return "https://spire-codex.com/assets/images/card_back_regent.png";
  if (url.startsWith('/')) return `https://spire-codex.com${url}`;
  return url.startsWith('http') ? url : `https://spire-codex.com/static/images/cards/${url}`;
};

const getRarityColor = (rarity: string) => {
  const r = (rarity || '').toLowerCase();
  if (r.includes('rare') || r.includes('レア')) return '#FFD700'; 
  if (r.includes('uncommon') || r.includes('アンコモン')) return '#4169E1'; 
  return '#94a3b8';
};

const CardFrameStroke = ({ type, color }: { type: string, color: string }) => {
  const t = (type || '').toLowerCase();
  let path = (t.includes('attack') || t.includes('アタック')) ? "M0,0 H100 V100 L50,130 L0,100 Z" :
             (t.includes('power') || t.includes('パワー')) ? "M0,0 H100 V100 C100,135 0,135 0,100 Z" : "M0,0 H100 V125 H0 Z";
  return (
    <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 130" preserveAspectRatio="none">
      <path d={`M-10,-10 H110 V140 H-10 Z ${path}`} fill="#0d0d12" fillRule="evenodd" />
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeOpacity="0.8" />
    </svg>
  );
};

const SortableCard = ({ card, isOverlay = false, onHover, onMove }: { 
  card: SpireCard, isOverlay?: boolean, onHover?: (card: SpireCard | null, e?: any) => void, onMove?: (e: any) => void 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const color = getRarityColor(card.rarity);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1, zIndex: isDragging ? 100 : 1 };

  return (
    <div 
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      onMouseEnter={(e) => onHover?.(card, e)}
      onMouseLeave={() => onHover?.(null)}
      onMouseMove={(e) => onMove?.(e)}
      onClick={(e) => { e.stopPropagation(); onHover?.(card, e); }}
      className={`relative w-14 h-[85px] md:w-16 md:h-[95px] flex flex-col group cursor-grab active:cursor-grabbing touch-none ${isOverlay ? 'scale-110 z-[300]' : ''}`}
    >
      <div className="relative w-full h-full overflow-hidden pointer-events-none">
        <div className="w-full aspect-square relative z-0 bg-[#1a1a24]">
          <img src={formatImageUrl(card.image_url)} alt="" className="w-full h-full object-contain" crossOrigin="anonymous" />
          <div className="absolute top-0.5 left-0.5 z-30">
            <span className="text-[7px] md:text-[9px] font-black italic bg-[#000000cc] rounded-full w-3.5 h-3.5 flex items-center justify-center border border-[#ffffff1a]" style={{ color }}>
              {card.cost === -1 ? 'X' : card.cost}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center px-0.5 pt-1 z-20 overflow-visible">
          <p className="card-name-text font-bold text-[#ffffff] text-center uppercase break-words w-full" style={{ fontSize: '7.5px', lineHeight: '1.1', display: 'block', minHeight: '2.2em' }}>
            {card.name}
          </p>
        </div>
        <CardFrameStroke type={card.type} color={color} />
      </div>
    </div>
  );
};

const TierRow = ({ tier, cards, onHover, onMove }: { tier: any, cards: SpireCard[], onHover: any, onMove: any }) => {
  const { setNodeRef } = useSortable({ id: tier.id });
  return (
    <div className="flex border-b border-[#1e293b] min-h-[105px] bg-[#0d0d12]">
      <div style={{ backgroundColor: tier.color }} className="w-12 md:w-20 flex items-center justify-center shrink-0 border-r border-[#000000] z-20">
        <span className="text-xl font-black text-[#000000]">{tier.label}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 p-3 flex flex-wrap gap-x-2 gap-y-6 content-start min-w-[200px]">
        <SortableContext items={cards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {cards.map(card => <SortableCard key={card.id} card={card} onHover={onHover} onMove={onMove} />)}
        </SortableContext>
      </div>
    </div>
  );
};

export default function CardsPage() {
  const [isTierMode, setIsTierMode] = useState(false);
  const [characters, setCharacters] = useState<{id: string, name: string}[]>([]);
  const [allCards, setAllCards] = useState<SpireCard[]>([]);
  const [tierData, setTierData] = useState<Record<string, SpireCard[]>>({ pool: [], S: [], A: [], B: [], C: [], D: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<SpireCard | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const tierRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetch('https://spire-codex.com/api/characters?lang=jpn').then(res => res.json()).then(data => {
      const sorted = (data as any[]).sort((a, b) => CHARACTER_ORDER.indexOf(a.id) - CHARACTER_ORDER.indexOf(b.id));
      setCharacters(sorted);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const colorQuery = activeTab === 'all' ? '' : `&color=${activeTab}`;
    fetch(`https://spire-codex.com/api/cards?lang=jpn${colorQuery}`).then(res => res.json()).then(data => {
      setAllCards(data);
      setTierData({ pool: data, S: [], A: [], B: [], C: [], D: [] });
      setLoading(false);
    });
  }, [activeTab]);

  const updatePos = (e: any) => {
    if (activeId) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX !== undefined && clientY !== undefined) {
      setMousePos({ x: Math.min(window.innerWidth - 270, clientX + 15), y: e.touches ? clientY - 180 : clientY - 120 });
    }
  };

  const handleHover = (card: SpireCard | null, e?: any) => {
    if (activeId) return;
    setHoveredCard(card);
    if (e) updatePos(e);
  };

  const findContainer = (id: string) => {
    if (id in tierData) return id;
    return Object.keys(tierData).find(key => tierData[key].some(item => item.id === id));
  };

  const handleDragStart = (event: any) => { setActiveId(event.active.id); setHoveredCard(null); };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;
    setTierData(prev => {
      const activeItems = prev[activeContainer];
      const activeIndex = activeItems.findIndex(i => i.id === active.id);
      const overItems = prev[overContainer];
      const overIndex = overItems.findIndex(i => i.id === over.id);
      let newIndex = over.id in prev ? overItems.length : overIndex;
      return { ...prev, [activeContainer]: prev[activeContainer].filter(i => i.id !== active.id), [overContainer]: [...prev[overContainer].slice(0, newIndex), prev[activeContainer][activeIndex], ...prev[overContainer].slice(newIndex)] };
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeIndex = tierData[activeContainer].findIndex(i => i.id === active.id);
      const overIndex = tierData[overContainer].findIndex(i => i.id === over.id);
      if (activeIndex !== overIndex) setTierData(prev => ({ ...prev, [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex) }));
    }
    setActiveId(null);
  };

  const exportPNG = async () => {
    if (!tierRef.current) return;
    setHoveredCard(null);
    if (document.fonts) await document.fonts.ready;
    setTimeout(async () => {
      const canvas = await html2canvas(tierRef.current!, { backgroundColor: '#0d0d12', useCORS: true, scale: 3 });
      const link = document.createElement('a');
      link.download = `STS-Tier.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 300);
  };

  return (
    <main className="min-h-screen bg-[#0d0d12] text-[#e2e8f0] p-4 md:p-8 font-sans" onClick={() => setHoveredCard(null)}>
      <nav className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <Link href="/" className="text-[10px] font-black text-[#64748b] hover:text-[#60a5fa] uppercase tracking-widest">← Return</Link>
        <button onClick={() => { setIsTierMode(!isTierMode); setHoveredCard(null); }} className={`px-4 py-1.5 text-[9px] font-black rounded-sm border ${isTierMode ? 'bg-white text-black' : 'text-[#60a5fa] border-[#3b82f6]'}`}>
          {isTierMode ? 'EXIT EDITOR' : 'TIER MAKER'}
        </button>
      </nav>

      <div className="max-w-7xl mx-auto mb-10 overflow-x-auto text-center scrollbar-hide">
        <div className="inline-flex gap-1.5 p-1 bg-[#0f172a] rounded-sm border border-[#ffffff1a]">
          <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-sm text-[9px] font-black ${activeTab === 'all' ? 'bg-[#e2e8f0] text-[#020617]' : 'text-[#64748b]'}`}>ALL</button>
          {characters.map((char) => (
            <button key={char.id} onClick={() => setActiveTab(char.id)} className={`px-4 py-1.5 rounded-sm text-[9px] font-black uppercase ${activeTab === char.id ? 'bg-[#2563eb] text-white' : 'text-[#64748b]'}`}>{char.name}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-40 animate-pulse text-[10px] font-black text-[#3b82f6]">SYNCHRONIZING...</div>
      ) : isTierMode ? (
        <div className="max-w-5xl mx-auto">
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex justify-end mb-4"><button onClick={exportPNG} className="text-[9px] font-black text-[#60a5fa] border border-[#3b82f64d] px-3 py-1 rounded-sm uppercase">Export PNG</button></div>
            <div ref={tierRef} className="border border-[#1e293b] rounded-sm overflow-hidden mb-8 bg-[#020617]">
              {TIER_ROWS.map(tier => <TierRow key={tier.id} tier={tier} cards={tierData[tier.id]} onHover={handleHover} onMove={updatePos} />)}
            </div>
            <div className="bg-[#0f172a80] p-6 border border-[#ffffff0d] rounded-sm">
              <h3 className="text-[9px] font-black text-[#64748b] mb-6 uppercase tracking-[0.3em]">Card Pool (Long press to drag)</h3>
              <div className="flex flex-wrap gap-x-2 gap-y-8 min-h-[150px]">
                <SortableContext items={tierData.pool.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  {tierData.pool.map(card => <SortableCard key={card.id} card={card} onHover={handleHover} onMove={updatePos} />)}
                </SortableContext>
              </div>
            </div>
            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
              {activeId ? <SortableCard card={Object.values(tierData).flat().find(c => c.id === activeId)!} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-2 gap-y-12">
          {allCards.map((card) => (
            <div key={card.id} className="group relative flex flex-col" 
                 onMouseEnter={(e) => handleHover(card, e)} onMouseMove={updatePos} onMouseLeave={() => setHoveredCard(null)}
                 onClick={(e) => { e.stopPropagation(); handleHover(card, e); }}>
              <div className="relative aspect-[1/1.32] w-full flex flex-col pointer-events-none">
                <div className="w-full aspect-square relative bg-[#0f172a] border border-[#ffffff0d]">
                  <img src={formatImageUrl(card.image_url)} alt="" className="w-full h-full object-contain" />
                  <div className="absolute top-1 left-1 z-30">
                    <span className="text-[8px] font-black italic bg-[#000000cc] rounded-full w-4 h-4 flex items-center justify-center border border-[#ffffff33]" style={{ color: getRarityColor(card.rarity) }}>
                      {card.cost === -1 ? 'X' : card.cost}
                    </span>
                  </div>
                </div>
                <div className="flex-1 flex items-start justify-center px-1 pt-1.5"><p className="text-[7px] font-black text-white text-center uppercase">{card.name}</p></div>
                <CardFrameStroke type={card.type} color={getRarityColor(card.rarity)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {hoveredCard && !activeId && (
        <div className="fixed z-[500] pointer-events-none w-64 bg-[#0f172a] border-2 shadow-2xl rounded-sm" 
             style={{ left: mousePos.x, top: mousePos.y, borderColor: getRarityColor(hoveredCard.rarity) }}>
          <div className="p-3 bg-[#1e293b] border-b border-[#ffffff1a] flex justify-between items-center">
            <h3 className="text-xs font-black text-white">{hoveredCard.name}</h3>
            <span className="text-base font-black italic" style={{ color: getRarityColor(hoveredCard.rarity) }}>{hoveredCard.cost === -1 ? 'X' : hoveredCard.cost}</span>
          </div>
          <div className="p-3 bg-[#020617] text-[11px] text-[#cbd5e1] leading-relaxed spire-desc" dangerouslySetInnerHTML={{ __html: parseDescription(hoveredCard) }} />
        </div>
      )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .spire-desc b, .spire-desc strong { color: #fde047; font-weight: 800; }
        * { -webkit-tap-highlight-color: transparent; }
        .touch-none { touch-action: none; }
      `}</style>
    </main>
  );
}