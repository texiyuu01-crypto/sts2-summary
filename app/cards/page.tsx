"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

// --- Types & Constants ---
interface SpireCard {
  id: string;
  name: string;
  description: string;
  upgrade_description?: string;
  cost: number;
  type: string;
  rarity: string;
  image_url: string;
  keywords?: string[]; 
  vars?: Record<string, any>; 
  upgrade?: {
    cost?: number;
    [key: string]: any; 
  };
  [key: string]: any;
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
const parseDescription = (card: SpireCard, isUpgraded: boolean = false) => {
  if (!card) return "";
  let text = (isUpgraded ? card.upgrade_description : card.description) || card.description || "";
  text = text.replace(/\{(\w+):.*?\}/g, (match, key) => {
    const normalValue = card[key] ?? card.vars?.[key];
    const upgradedValue = card.upgrade?.[key] ?? normalValue;
    const displayValue = isUpgraded ? upgradedValue : normalValue;
    if (isUpgraded && normalValue !== undefined && upgradedValue !== normalValue) {
      return `<span style="color: #7cfc00; font-weight: bold;">${displayValue}</span>`;
    }
    return displayValue !== undefined ? displayValue.toString() : match;
  });
  text = text.replace(/\[!(.*?)!\]/g, (match, key) => {
    const normalValue = card.vars?.[key] ?? card[key];
    const upgradedValue = card.upgrade?.[key] ?? normalValue;
    const displayValue = isUpgraded ? upgradedValue : normalValue;
    if (isUpgraded && normalValue !== undefined && upgradedValue !== normalValue) {
      return `<span style="color: #7cfc00; font-weight: bold;">${displayValue}</span>`;
    }
    return displayValue !== undefined ? displayValue.toString() : match;
  });
  text = text.replace(/\[energy:(\w+)\]/gi, (match, key) => {
    const normalValue = card.vars?.[key] ?? card[key] ?? key;
    const upgradedValue = card.upgrade?.[key] ?? normalValue;
    const displayValue = isUpgraded ? upgradedValue : normalValue;
    const energyIcon = '⚡️';
    if (isUpgraded && normalValue !== undefined && upgradedValue !== normalValue) {
      return `<span style="color: #7cfc00; font-weight: bold;">${displayValue}${energyIcon}</span>`;
    }
    return `${displayValue}${energyIcon}`;
  });
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

// --- Components ---
const SortableCard = ({ card, isOverlay = false, onHover, onMove }: { 
  card: SpireCard, isOverlay?: boolean, onHover?: (card: SpireCard | null, e?: any) => void, onMove?: (e: any) => void 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const color = getRarityColor(card.rarity);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1, zIndex: isDragging ? 100 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onMouseEnter={(e) => onHover?.(card, e)}
      onMouseLeave={() => onHover?.(null)}
      onMouseMove={(e) => onMove?.(e)}
      onClick={(e) => { e.stopPropagation(); onHover?.(card, e); }}
      className={`relative w-14 h-[85px] md:w-16 md:h-[95px] flex flex-col group cursor-grab active:cursor-grabbing touch-none ${isOverlay ? 'scale-110 z-[300]' : ''}`}
    >
      <div className="relative w-full h-full overflow-hidden pointer-events-none flex flex-col">
        <div className="w-full aspect-square relative z-0 bg-[#1a1a24] shrink-0">
          <img src={formatImageUrl(card.image_url)} alt="" className="w-full h-full object-contain" crossOrigin="anonymous" />
          <div className="cost-badge absolute top-0.5 left-0.5 z-30 w-3.5 h-3.5 md:w-4.5 md:h-4.5 bg-[#000000cc] rounded-full border border-[#ffffff4d] flex items-center justify-center overflow-hidden">
            <span className="cost-text font-black italic block text-center" 
                  style={{ color, fontSize: '9px', width: '100%', lineHeight: '1', transform: 'translateY(0.5px)' }}>
              {card.cost === -1 ? 'X' : card.cost}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center px-0.5 pt-1 z-20 overflow-visible relative">
          <p className="card-name-text font-bold text-[#ffffff] text-center uppercase break-words w-full" style={{ fontSize: '7.5px', lineHeight: '1.1', display: 'block', minHeight: '2.4em' }}>
            {card.name}
          </p>
        </div>
        <CardFrameStroke type={card.type} color={color} />
      </div>
    </div>
  );
};

const TierRow = ({ tier, cards, onHover, onMove, isCompact, onToggleCompact }: { tier: any, cards: SpireCard[], onHover: any, onMove: any, isCompact: boolean, onToggleCompact?: () => void }) => {
  const { setNodeRef, isOver } = useSortable({ id: tier.id });
  if (isCompact) {
    return (
      <div ref={setNodeRef} 
        onClick={() => onToggleCompact?.()}
        className={`flex-1 flex flex-col items-center justify-center h-14 border-r border-[#000] transition-colors cursor-pointer ${isOver ? 'brightness-125' : ''}`}
        style={{ backgroundColor: tier.color }}>
        <span className="text-lg font-black text-black leading-none">{tier.label}</span>
        <span className="text-[9px] font-bold text-black opacity-50">({cards.length})</span>
      </div>
    );
  }
  return (
    <div className="flex border-b border-[#1e293b] min-h-[105px] bg-[#0d0d12]">
      <div style={{ backgroundColor: tier.color }} onClick={() => onToggleCompact?.()} className="w-12 md:w-20 flex items-center justify-center shrink-0 border-r border-[#000000] z-20 cursor-pointer">
        <span className="text-xl font-black text-[#000000]">{tier.label}</span>
      </div>
      <div ref={setNodeRef} className={`flex-1 p-3 flex flex-wrap gap-x-2 gap-y-6 content-start min-w-[300px] ${isOver ? 'bg-white/5' : ''}`}>
        <SortableContext items={cards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {cards.map(card => <SortableCard key={card.id} card={card} onHover={onHover} onMove={onMove} />)}
        </SortableContext>
      </div>
    </div>
  );
};

// --- Main Page ---
export default function CardsPage() {
  const [isTierMode, setIsTierMode] = useState(true);
  const [isCompact, setIsCompact] = useState(true);
  const [characters, setCharacters] = useState<{id: string, name: string}[]>([]);
  const [allCards, setAllCards] = useState<SpireCard[]>([]);
  const [tierData, setTierData] = useState<Record<string, SpireCard[]>>({ pool: [], S: [], A: [], B: [], C: [], D: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');
  const [filterKeyword, setFilterKeyword] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<SpireCard | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const tierRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 【修正ポイント】初回マウント時のみモバイル判定を行う
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    
    const urlParams = new URLSearchParams(window.location.search);
    const hash = urlParams.get('t');
    
    // 共有リンクがない場合かつスマホの場合のみ、初期状態をコンパクトにする
    if (mobile && !hash) {
      setIsCompact(true);
    }
    // リサイズ監視は isMobile の更新のみに留め、 isCompact は上書きしない
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dynamicTypes = useMemo(() => {
    const types = new Set<string>();
    allCards.forEach(c => { if(c.type) types.add(c.type) });
    return Array.from(types).sort();
  }, [allCards]);

  const dynamicRarities = useMemo(() => {
    const rarities = new Set<string>();
    allCards.forEach(c => { if(c.rarity) rarities.add(c.rarity) });
    return Array.from(rarities).sort();
  }, [allCards]);

  const availableKeywords = useMemo(() => {
    const kws = new Set<string>();
    allCards.forEach(c => {
      c.keywords?.forEach(k => kws.add(k));
      const matches = c.description?.matchAll(/\[kw\](.*?)\[\/kw\]/gi);
      if (matches) for (const match of matches) kws.add(match[1]);
    });
    return Array.from(kws).sort();
  }, [allCards]);

  const filteredDisplayCards = useMemo(() => {
    return allCards.filter(card => {
      const matchType = filterType === 'all' || card.type === filterType;
      const matchRarity = filterRarity === 'all' || card.rarity === filterRarity;
      const matchKeyword = filterKeyword === 'all' || 
                           card.keywords?.includes(filterKeyword) || 
                           card.description?.includes(`[kw]${filterKeyword}[/kw]`);
      return matchType && matchRarity && matchKeyword;
    });
  }, [allCards, filterType, filterRarity, filterKeyword]);

  const filteredPoolCards = useMemo(() => {
    const currentPoolIds = new Set(tierData.pool.map(c => c.id));
    return filteredDisplayCards.filter(c => currentPoolIds.has(c.id));
  }, [filteredDisplayCards, tierData.pool]);

  const applyHashToData = useCallback((hash: string, cardsPool: SpireCard[]) => {
    try {
      const decoded = decodeURIComponent(escape(atob(hash.replace(/-/g, '+').replace(/_/g, '/'))));
      const compactData = JSON.parse(decoded);
      const newTierData: Record<string, SpireCard[]> = { pool: [], S: [], A: [], B: [], C: [], D: [] };
      const assignedIds = new Set<string>();
      Object.keys(compactData.tiers || {}).forEach(tierId => {
        if (!newTierData[tierId]) newTierData[tierId] = [];
        compactData.tiers[tierId].forEach((id: string) => {
          const card = cardsPool.find(c => c.id === id);
          if (card) { newTierData[tierId].push(card); assignedIds.add(id); }
        });
      });
      newTierData.pool = cardsPool.filter(c => !assignedIds.has(c.id));
      setTierData(newTierData);
    } catch (e) { console.error("Hash error:", e); }
  }, []);

  const generateShareURL = useCallback(() => {
    const compactData: any = { tab: activeTab, tiers: {} };
    TIER_ROWS.forEach(row => { if (tierData[row.id].length > 0) compactData.tiers[row.id] = tierData[row.id].map(c => c.id); });
    const jsonString = JSON.stringify(compactData);
    const hash = btoa(unescape(encodeURIComponent(jsonString))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const shareUrl = `${window.location.origin}${window.location.pathname}?t=${hash}`;
    navigator.clipboard.writeText(shareUrl);
    return shareUrl;
  }, [tierData, activeTab]);

  const shareX = () => {
    const currentChar = characters.find(c => c.id === activeTab)?.name || "All Characters";
    const text = encodeURIComponent(`Slay the Spire 2 【${currentChar}】 Tier List を作成しました！\n`);
    const url = encodeURIComponent(generateShareURL()); 
    const hashtags = encodeURIComponent("スレスパ2,スレイザスパイア2,STS2,Tier表,SlayTheSpire2");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`, '_blank');
  };

  useEffect(() => {
    fetch('https://spire-codex.com/api/characters?lang=jpn').then(res => res.json()).then(data => {
      const sorted = (data as any[]).sort((a, b) => {
        const indexA = CHARACTER_ORDER.indexOf(a.id.toLowerCase());
        const indexB = CHARACTER_ORDER.indexOf(b.id.toLowerCase());
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
      setCharacters(sorted);
      const urlParams = new URLSearchParams(window.location.search);
      const hash = urlParams.get('t');
      if (hash) {
        try {
          const decoded = decodeURIComponent(escape(atob(hash.replace(/-/g, '+').replace(/_/g, '/'))));
          const compactData = JSON.parse(decoded);
          if (compactData.tab) setActiveTab(compactData.tab);
          setIsTierMode(true);
          // 共有リンク優先: URLパラメータがある場合は展開(false)にする
          setIsCompact(false);
        } catch(e) {}
      } else {
        if (sorted && sorted.length > 0) setActiveTab(sorted[0].id);
        setIsTierMode(true);
        setIsCompact(true);
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const colorQuery = activeTab === 'all' ? '' : `&color=${activeTab}`;
    fetch(`https://spire-codex.com/api/cards?lang=jpn${colorQuery}`).then(res => res.json()).then(data => {
      setAllCards(data);
      const urlParams = new URLSearchParams(window.location.search);
      const hash = urlParams.get('t');
      if (hash) applyHashToData(hash, data);
      else setTierData({ pool: data, S: [], A: [], B: [], C: [], D: [] });
      setLoading(false);
    });
  }, [activeTab, applyHashToData]);

  const FilterControls = () => (
    <div className="flex flex-wrap items-center gap-3">
      <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-[#1e293b] text-[9px] font-black text-white border border-[#ffffff1a] rounded-sm px-3 py-1 outline-none uppercase tracking-wider">
        <option value="all">種類: 全て</option>
        {dynamicTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
      </select>
      <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)} className="bg-[#1e293b] text-[9px] font-black text-white border border-[#ffffff1a] rounded-sm px-3 py-1 outline-none uppercase tracking-wider">
        <option value="all">レアリティ: 全て</option>
        {dynamicRarities.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
      </select>
      <select value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)} className="bg-[#1e293b] text-[9px] font-black text-white border border-[#ffffff1a] rounded-sm px-3 py-1 outline-none uppercase tracking-wider max-w-[150px]">
        <option value="all">効果: 全て</option>
        {availableKeywords.map(kw => <option key={kw} value={kw}>{kw.toUpperCase()}</option>)}
      </select>
    </div>
  );

  const updatePos = (e: any) => {
    if (isMobile) return; 
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX !== undefined && clientY !== undefined) {
      const tooltipWidth = 288;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 300;
      let x = clientX + 15;
      if (x + tooltipWidth > window.innerWidth) x = clientX - tooltipWidth - 15;
      let y = clientY - (tooltipHeight / 2);
      if (y + tooltipHeight > window.innerHeight) y = window.innerHeight - tooltipHeight - 10;
      if (y < 10) y = 10;
      setMousePos({ x, y });
    }
  };

  const handleHover = (card: SpireCard | null, e?: any) => {
    if (activeId) return;
    setHoveredCard(card);
    if (e && !isMobile) updatePos(e);
  };

  const findContainer = (id: string) => (id in tierData) ? id : Object.keys(tierData).find(key => tierData[key].some(item => item.id === id));
  const handleDragStart = (event: any) => { setActiveId(event.active.id); setHoveredCard(null); };
  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const ac = findContainer(active.id);
    const oc = findContainer(over.id);
    if (!ac || !oc || ac === oc) return;
    setTierData(prev => {
      const activeItems = prev[ac];
      const activeIndex = activeItems.findIndex(i => i.id === active.id);
      const overItems = prev[oc];
      const overIndex = overItems.findIndex(i => i.id === over.id);
      let newIndex = over.id in prev ? overItems.length : overIndex;
      return { ...prev, [ac]: prev[ac].filter(i => i.id !== active.id), [oc]: [...prev[oc].slice(0, newIndex), prev[ac][activeIndex], ...prev[oc].slice(newIndex)] };
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    const ac = findContainer(active.id);
    const oc = findContainer(over?.id);
    if (ac && oc && ac === oc) {
      const oldIdx = tierData[ac].findIndex(i => i.id === active.id);
      const newIdx = tierData[oc].findIndex(i => i.id === over.id);
      if (oldIdx !== newIdx) setTierData(prev => ({ ...prev, [oc]: arrayMove(prev[oc], oldIdx, newIdx) }));
    }
    setActiveId(null);
  };

  const exportPNG = async () => {
    if (!tierRef.current) return;
    setHoveredCard(null);
    const wasCompact = isCompact;
    setIsCompact(false);
    setTimeout(async () => {
      const originalWidth = tierRef.current!.style.width;
      tierRef.current!.style.width = "1024px"; 
      const canvas = await html2canvas(tierRef.current!, { 
        backgroundColor: '#020617', useCORS: true, scale: 3, width: 1024,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('.cost-text').forEach((el: any) => {
            el.style.fontSize = '10px'; el.style.fontWeight = '900'; el.style.transform = 'translate(-1.5px, -3.8px)'; 
          });
        }
      });
      tierRef.current!.style.width = originalWidth;
      setIsCompact(wasCompact);
      const link = document.createElement('a');
      link.download = `STS-Tier.png`; link.href = canvas.toDataURL('image/png'); link.click();
    }, 200);
  };

  

  return (
    <main className="min-h-screen bg-[#0d0d12] text-[#e2e8f0] p-4 md:p-8 font-sans" onClick={() => setHoveredCard(null)}>
      <nav className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <Link href="/" className="text-[10px] font-black text-[#64748b] hover:text-[#60a5fa] uppercase tracking-widest">← Return</Link>
      </nav>

      <div className="max-w-7xl mx-auto mb-4 overflow-x-auto text-center scrollbar-hide">
        <div className="inline-flex gap-1.5 p-1 bg-[#0f172a] rounded-sm border border-[#ffffff1a]">
          {characters.map((char) => (
            <button key={char.id} onClick={() => setActiveTab(char.id)} className={`px-4 py-1.5 rounded-sm text-[9px] font-black uppercase transition-all ${activeTab === char.id ? 'bg-[#2563eb] text-white' : 'text-[#64748b] hover:text-[#cbd5e1]'}`}>{char.name}</button>
          ))}
          <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-sm text-[9px] font-black transition-all ${activeTab === 'all' ? 'bg-[#e2e8f0] text-[#020617]' : 'text-[#64748b] hover:text-[#cbd5e1]'}`}>ALL</button>
        </div>
      </div>

      {!isTierMode && (
        <div className="max-w-7xl mx-auto mb-10 flex justify-center">
          <FilterControls />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-40 animate-pulse text-[10px] font-black tracking-widest text-[#3b82f6]">SYNCHRONIZING...</div>
      ) : isTierMode ? (
        <div className="max-w-5xl mx-auto">
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex justify-between items-center mb-4 px-1">
              <button onClick={() => setIsCompact(!isCompact)} className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black rounded-sm border border-[#ffffff33] text-white hover:bg-white/10 uppercase transition-colors">
                <span className="opacity-60">{isCompact ? '展開' : '格納'}</span>
                {isCompact ? 'EXPAND' : 'COLLAPSE'}
              </button>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); generateShareURL(); alert("URLをコピーしました！"); }} className="text-[9px] font-black text-[#10b981] border border-[#10b9814d] px-3 py-1 rounded-sm uppercase hover:bg-[#10b9811a]">Copy Link</button>
                <button onClick={(e) => { e.stopPropagation(); shareX(); }} className="text-[9px] font-black text-[#ffffff] border border-[#ffffff4d] px-3 py-1 rounded-sm uppercase hover:bg-[#1d9bf0] bg-[#1d9bf0]">Share on X</button>
                <button onClick={(e) => { e.stopPropagation(); exportPNG(); }} className="text-[9px] font-black text-[#60a5fa] border border-[#3b82f64d] px-3 py-1 rounded-sm uppercase hover:bg-[#3b82f61a]">PNG</button>
              </div>
            </div>
            
            <div ref={tierRef} className={`export-target border border-[#1e293b] rounded-sm overflow-hidden mb-8 bg-[#020617] shadow-2xl w-full ${isCompact ? 'sticky top-2 z-[100]' : ''}`}>
              <div className={isCompact ? 'flex' : 'flex flex-col'}>
                {TIER_ROWS.map(tier => <TierRow key={tier.id} tier={tier} cards={tierData[tier.id]} onHover={handleHover} onMove={updatePos} isCompact={isCompact} onToggleCompact={() => setIsCompact(prev => !prev)} />)}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-1">
              <h3 className="text-[9px] font-black text-[#64748b] uppercase tracking-[0.3em]">Card Pool ({filteredPoolCards.length})</h3>
              <FilterControls />
            </div>

            <div className="bg-[#0f172a80] p-4 md:p-6 border border-[#ffffff0d] rounded-sm w-full">
              <div className="flex flex-wrap gap-x-3 gap-y-10 min-h-[150px] w-full justify-start items-start">
                <SortableContext items={filteredPoolCards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  {filteredPoolCards.map(card => <SortableCard key={card.id} card={card} onHover={handleHover} onMove={updatePos} />)}
                </SortableContext>
              </div>
            </div>

            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
              {activeId ? <SortableCard card={allCards.find(c => c.id === activeId)!} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-x-2 gap-y-12">
          {filteredDisplayCards.map((card) => {
            const color = getRarityColor(card.rarity);
            return (
              <div key={card.id} className="group relative flex flex-col transition-transform hover:scale-110 hover:z-50" 
                   onMouseEnter={(e) => handleHover(card, e)} 
                   onMouseMove={updatePos} 
                   onMouseLeave={() => setHoveredCard(null)}
                   onClick={(e) => { e.stopPropagation(); handleHover(card, e); }}>
                <div className="relative aspect-[1/1.32] w-full flex flex-col pointer-events-none overflow-hidden">
                  <div className="w-full aspect-square relative bg-[#0f172a] border border-[#ffffff0d]">
                    <img src={formatImageUrl(card.image_url)} alt="" className="w-full h-full object-contain" />
                    <div className="cost-badge absolute top-1 left-1 z-30 w-4.5 h-4.5 bg-[#000000cc] border border-[#ffffff4d] rounded-full flex items-center justify-center">
                        <span className="cost-text font-black italic block text-center" style={{ color, fontSize: '10px' }}>{card.cost === -1 ? 'X' : card.cost}</span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-start justify-center px-1 pt-1.5"><p className="card-name-text text-[7px] font-black text-white text-center uppercase break-words w-full">{card.name}</p></div>
                  <CardFrameStroke type={card.type} color={color} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hoveredCard && !activeId && (
        <div ref={tooltipRef} className="fixed z-[500] pointer-events-none w-72 bg-[#0d0d12] border-2 shadow-2xl rounded-sm overflow-hidden flex flex-col" 
          style={{ left: isMobile ? '50%' : mousePos.x, top: isMobile ? '10%' : mousePos.y, transform: isMobile ? 'translateX(-50%)' : 'none', borderColor: getRarityColor(hoveredCard.rarity) }}>
          <div className="p-3 bg-[#1e293b] border-b border-[#ffffff1a]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-black text-[#64748b] uppercase tracking-tighter">NORMAL</span>
              <span className="text-sm font-black italic text-white">{hoveredCard.cost === -1 ? 'X' : hoveredCard.cost}</span>
            </div>
            <h3 className="text-xs font-black text-white mb-2">{hoveredCard.name}</h3>
            <div className="text-[11px] text-[#cbd5e1] leading-relaxed spire-desc" dangerouslySetInnerHTML={{ __html: parseDescription(hoveredCard, false) }} />
          </div>
          <div className="p-3 bg-[#020617] relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7cfc004d] to-transparent"></div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-black text-[#7cfc00] uppercase tracking-tighter">UPGRADED +</span>
              <span className="text-sm font-black italic" style={{ color: (hoveredCard.upgrade?.cost !== undefined && hoveredCard.upgrade.cost < hoveredCard.cost) ? '#7cfc00' : 'white' }}>
                {hoveredCard.upgrade?.cost !== undefined ? (hoveredCard.upgrade.cost === -1 ? 'X' : hoveredCard.upgrade.cost) : (hoveredCard.cost === -1 ? 'X' : hoveredCard.cost)}
              </span>
            </div>
            <h3 className="text-xs font-black text-[#7cfc00] mb-2">{hoveredCard.name}+</h3>
            <div className="text-[11px] text-[#cbd5e1] leading-relaxed spire-desc" dangerouslySetInnerHTML={{ __html: parseDescription(hoveredCard, true) }} />
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .spire-desc b, .spire-desc strong { color: #fde047; font-weight: 800; }
        .touch-none { touch-action: none; }
        select option { background: #0f172a; color: #fff; }
        @keyframes ping { 75%, 100% { transform: scale(1.1); opacity: 0; } }
        .animate-ping { animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </main>
  );
}