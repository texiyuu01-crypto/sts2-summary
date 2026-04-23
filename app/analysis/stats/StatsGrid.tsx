"use client";

import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';

const getCostParts = (card: any, isUpgraded: boolean = false): { text: string; isStar: boolean } => {
  if (!card) return { text: '', isStar: false };
  const upgraded = isUpgraded ? (card.upgrade || {}) : {};
  const baseCost = (isUpgraded ? upgraded.cost : card.cost);
  
  // is_x_costがtrueの場合はXを表示
  const isXCost = isUpgraded ? (upgraded.is_x_cost ?? card.is_x_cost) : card.is_x_cost;
  if (isXCost) {
    return { text: 'X', isStar: false };
  }
  
  if (baseCost !== undefined && baseCost !== null) {
    const text = baseCost === -1 ? 'X' : String(baseCost);
    return { text, isStar: false };
  }

  const starCandidates = [
    isUpgraded ? upgraded.star_cost : card.star_cost,
    isUpgraded ? upgraded.starCost : card.starCost,
    isUpgraded ? upgraded.star : card.star,
  ];
  const starCost = starCandidates.find((v: any) => v !== undefined && v !== null);
  if (starCost !== undefined) {
    return { text: String(starCost), isStar: true };
  }

  return { text: '', isStar: false };
};

const parseDescription = (card: any, isUpgraded: boolean = false) => {
  if (!card) return "";
  let text = (isUpgraded ? card.upgrade_description : card.description) || card.description || "";
  text = text.replace(/\{(\w+):.*?\}/g, (match: string, key: string) => {
    const normalValue = card[key] ?? card.vars?.[key];
    const upgradedValue = card.upgrade?.[key] ?? normalValue;
    const displayValue = isUpgraded ? upgradedValue : normalValue;
    if (isUpgraded && normalValue !== undefined && upgradedValue !== normalValue) {
      return `<span style="color: #7cfc00; font-weight: bold;">${displayValue}</span>`;
    }
    return displayValue !== undefined ? displayValue.toString() : match;
  });
  text = text.replace(/\[!(.*?)!\]/g, (match: string, key: string) => {
    const normalValue = card.vars?.[key] ?? card[key];
    const upgradedValue = card.upgrade?.[key] ?? normalValue;
    const displayValue = isUpgraded ? upgradedValue : normalValue;
    if (isUpgraded && normalValue !== undefined && upgradedValue !== normalValue) {
      return `<span style="color: #7cfc00; font-weight: bold;">${displayValue}</span>`;
    }
    return displayValue !== undefined ? displayValue.toString() : match;
  });
  text = text.replace(/\[energy:(\w+)\]/gi, (match: string, key: string) => {
    const normalValue = card.vars?.[key] ?? card[key] ?? key;
    const upgradedValue = card.upgrade?.[key] ?? normalValue;
    const displayValue = isUpgraded ? upgradedValue : normalValue;
    const energyIcon = '⚡️';
    if (isUpgraded && normalValue !== undefined && upgradedValue !== normalValue) {
      return `<span style="color: #7cfc00; font-weight: bold;">${displayValue}${energyIcon}</span>`;
    }
    return `${displayValue}${energyIcon}`;
  });
  text = text.replace(/\[star:(\w+)\]/gi, (match: string, key: string) => {
    const starIcon = '★';
    
    // 数字の場合
    if (!isNaN(parseInt(key))) {
      const numValue = parseInt(key);
      // 0または1の場合は★のみ表示（「★を消費するたび」のような表現のため）
      if (numValue === 0 || numValue === 1) {
        return starIcon;
      }
      // 2以上の場合は数字を表示（「★2を得る」のような表現のため）
      return `${starIcon}${key}`;
    }
    
    // 文字列キーの場合はvarsから取得
    const normalValue = card.vars?.[key] ?? card[key];
    const upgradedValue = card.upgrade?.[key] ?? normalValue;
    const displayValue = isUpgraded ? upgradedValue : normalValue;
    
    if (normalValue === undefined) {
      return `${starIcon}${key}`;
    }
    
    if (isUpgraded && normalValue !== undefined && upgradedValue !== normalValue) {
      return `<span style="color: #7cfc00; font-weight: bold;">${starIcon}${displayValue}</span>`;
    }
    return `${starIcon}${displayValue}`;
  });
  let parsed = text
    .replace(/\n/g, '<br/>')
    .replace(/\[gold\](.*?)\[\/gold\]/gi, '<span style="color: #fde047; font-weight: bold;">$1</span>')
    .replace(/\[relic\](.*?)\[\/relic\]/gi, '<span style="color: #fb7185; font-weight: bold;">$1</span>')
    .replace(/\[kw\](.*?)\[\/kw\]/gi, '<span style="color: #ffffff; font-weight: 800; border-bottom: 1px dashed #666;">$1</span>')
    .replace(/\[energy\]/gi, '⚡️')
    .replace(/\[star\]/gi, '★');
  if (card.keywords && card.keywords.length > 0) {
    const exhaustKeywords = card.keywords.filter((kw: string) => kw === "廃棄" || kw === "Exhaust");
    const topKeywords = card.keywords.filter((kw: string) => kw !== "廃棄" && kw !== "Exhaust");
    if (topKeywords.length > 0) {
      const topHtml = topKeywords.map((kw: string) => `<span style="color: #82eefd; font-weight: 800;">${kw}。</span>`).join(' ');
      parsed = topHtml + '<br/>' + parsed;
    }
    if (exhaustKeywords.length > 0) {
      const bottomHtml = exhaustKeywords.map((kw: string) => `<span style="color: #82eefd; font-weight: 800;">${kw}。</span>`).join(' ');
      parsed = parsed + (parsed ? '<br/>' : '') + bottomHtml;
    }
  }
  return parsed;
};

const formatImageUrl = (url: string | undefined) => {
  if (!url) return '';
  if (url.startsWith('/')) return `https://spire-codex.com${url}`;
  return url.startsWith('http') ? url : `https://spire-codex.com/static/images/cards/${url}`;
};

const getRarityColor = (rarity: string | undefined) => {
  const r = (rarity || '').toLowerCase();
  if (r.includes('rare') || r.includes('レア')) return '#FFD700';
  if (r.includes('uncommon') || r.includes('アンコモン')) return '#4169E1';
  return '#94a3b8';
};

const CardFrameStroke = ({ type, color }: { type: string | undefined, color: string }) => {
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

const StarCostDiamond = ({ starCost, isXStarCost, size = 'small' }: { starCost?: number, isXStarCost?: boolean | null, size?: 'small' | 'large' }) => {
  if (!starCost && !isXStarCost) return null;
  
  const displayValue = isXStarCost ? 'X' : starCost;
  const sizeClasses = size === 'small' 
    ? 'w-2.5 h-2.5 md:w-3 md:h-3 text-[6px] md:text-[7px]'
    : 'w-3.5 h-3.5 text-[8px]';
  
  return (
    <div 
      className={`absolute ${sizeClasses} bg-blue-500 border border-white flex items-center justify-center transform rotate-45`}
      style={{ 
        top: size === 'small' ? '14px' : '18px', 
        left: size === 'small' ? '0px' : '0px',
        zIndex: 40 
      }}
    >
      <span 
        className="font-black text-white transform -rotate-45 block"
        style={{ fontSize: 'inherit', lineHeight: '1' }}
      >
        {displayValue}
      </span>
    </div>
  );
};

const CHARACTER_ORDER = ["ironclad", "silent", "regent", "necrobinder", "defect"];

const TIER_ROWS = [
  { id: 'S', color: '#ff1f1f', label: 'S' },
  { id: 'A', color: '#ff8c00', label: 'A' },
  { id: 'B', color: '#ffd700', label: 'B' },
  { id: 'C', color: '#32cd32', label: 'C' },
  { id: 'D', color: '#1e90ff', label: 'D' },
];

export default function StatsGrid({ statsData, cardInfoMap, updatedAt }: { statsData: any, cardInfoMap: Record<string, any>, updatedAt?: string }) {
  const [versions, setVersions] = useState<string[]>([]);
  const [ascensions, setAscensions] = useState<string[]>([]);
  // allow multiple version selections: 'ALL' or string[] of choices
  const [selectedVersion, setSelectedVersion] = useState<string[] | 'ALL'>('ALL');
  // allow multiple ascension selections: 'ALL' or string[] of choices
  const [selectedAscension, setSelectedAscension] = useState<string[] | 'ALL'>('ALL');

  const resolveCardsSource = (version?: string[] | 'ALL', asc?: string[] | 'ALL') => {
    const v = version ?? selectedVersion;
    const a = asc ?? selectedAscension;
    // helper to merge multiple group objects (char->card->stats)
    const mergeGroups = (groups: any[]) => {
      const out: Record<string, any> = {};
      groups.forEach(g => {
        if (!g) return;
        Object.entries(g).forEach(([char, cards]: any) => {
          if (!out[char]) out[char] = {};
          Object.entries(cards).forEach(([cid, st]: any) => {
            if (!out[char][cid]) out[char][cid] = {};
            Object.entries(st).forEach(([k, v2]: any) => {
              const n = Number(v2);
              if (!isNaN(n)) out[char][cid][k] = (out[char][cid][k] || 0) + n;
              else out[char][cid][k] = v2;
            });
          });
        });
      });
      return out;
    };

    // handle ALL selection
    if (v === 'ALL' && a === 'ALL') {
      return statsData.cards || {};
    }

    // if ascension is array (multiple) merge corresponding ascension groups
    const resolveAscGroup = (ascSel: string[] | 'ALL') => {
      if (ascSel === 'ALL') return null;
      const arr = Array.isArray(ascSel) ? ascSel : [ascSel];
      const groups = arr.map(x => (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[x]) || {});
      return mergeGroups(groups);
    };

    // if version is array (multiple) merge corresponding version groups
    const resolveVerGroup = (verSel: string[] | 'ALL') => {
      if (verSel === 'ALL') return null;
      const arr = Array.isArray(verSel) ? verSel : [verSel];
      const groups = arr.map(x => (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[x]) || {});
      return mergeGroups(groups);
    };

    if (v !== 'ALL' && a === 'ALL') {
      const verGroup = resolveVerGroup(v);
      const result = verGroup || (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[v as any]) || {};
      return result;
    }

    if (v === 'ALL' && a !== 'ALL') {
      const ascGroup = resolveAscGroup(a);
      console.log('resolveCardsSource: v=ALL, a=', a, 'ascGroup keys:', ascGroup ? Object.keys(ascGroup) : 'null');
      const result = ascGroup || (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[a as any]) || {};
      console.log('resolveCardsSource: result keys:', Object.keys(result));
      return result;
    }

    // both specified: merge from by_version_ascension if available, otherwise intersect by_version and by_ascension
    if (v !== 'ALL' && a !== 'ALL') {
      const vArr = Array.isArray(v) ? v : [v];
      const aArr = Array.isArray(a) ? a : [a];
      
      // If one side is empty (ALL equivalent), use the other side directly
      if (vArr.length === 0 && aArr.length > 0) {
        console.log('resolveCardsSource: v is ALL, using ascension data only');
        return resolveAscGroup(a) || statsData.cards || {};
      }
      if (aArr.length === 0 && vArr.length > 0) {
        console.log('resolveCardsSource: a is ALL, using version data only');
        return resolveVerGroup(v) || statsData.cards || {};
      }
      if (vArr.length === 0 && aArr.length === 0) {
        console.log('resolveCardsSource: both are ALL, using all cards');
        return statsData.cards || {};
      }
      
      // First try by_version_ascension
      const groups: any[] = [];
      vArr.forEach(ver => {
        aArr.forEach(asc => {
          if (statsData.by_version_ascension && statsData.by_version_ascension.cards && statsData.by_version_ascension.cards[ver] && statsData.by_version_ascension.cards[ver][asc]) {
            groups.push(statsData.by_version_ascension.cards[ver][asc]);
          }
        });
      });
      const merged = mergeGroups(groups);
      if (Object.keys(merged).length > 0) {
        return merged;
      }
      
      // Fallback: if by_version_ascension data is not available, return all cards
      // We cannot accurately calculate intersection without proper data
      console.log('resolveCardsSource: by_version_ascension data not available for', vArr, aArr, '- returning all cards (filtering disabled)');
      return statsData.cards || {};
    }

    // Fallback for single selections (not arrays)
    if (v !== 'ALL' && a === 'ALL' && !Array.isArray(v)) {
      return (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[v as any]) || {};
    }
    if (v === 'ALL' && a !== 'ALL' && !Array.isArray(a)) {
      return (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[a as any]) || {};
    }
    
    // Default to all cards
    return statsData.cards || {};
  };

  const rawChars = Object.keys(statsData.cards || {});
  const chars = Array.from(new Set(rawChars));
  // sort chars to match cards page order, others appended
  chars.sort((a, b) => {
    const ia = CHARACTER_ORDER.indexOf(a.toLowerCase());
    const ib = CHARACTER_ORDER.indexOf(b.toLowerCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  // Initialize activeChar from statsData.cards to ensure it's always set
  const availableChars = Object.keys(statsData.cards || {});
  const initialChar = availableChars.length > 0 ? availableChars[0] : '';
  const [activeChar, setActiveChar] = useState<string>(initialChar);
  const [hovered, setHovered] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{x:number,y:number}|null>(null);
  const touchMovedRef = useRef(false);
  const scrollTimeoutRef = useRef<number|undefined>(undefined);
  const isTouchScrollingRef = useRef(false);
  const [charactersMeta, setCharactersMeta] = useState<Record<string, any>>({});
  const [runType, setRunType] = useState<'single'|'multi'>('single');
  const [includeColorless, setIncludeColorless] = useState(false);
  const [includeOtherChar, setIncludeOtherChar] = useState(false);
  const [verOpen, setVerOpen] = useState(false);
  const [ascOpen, setAscOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'pick_wr'|'pick_rate'|'final_wr'|'final_rate'|'floor1_pick_rate'|'floor1_pick_wr'|'floor2_pick_rate'|'floor2_pick_wr'|'floor3_pick_rate'|'floor3_pick_wr'>('pick_rate');
  const [isExporting, setIsExporting] = useState(false);
  const tierExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveChar((prev) => {
      if (prev && prev !== 'ALL' && chars.includes(prev)) return prev;
      return chars[0] || 'ALL';
    });
  }, [statsData]);

  useEffect(() => {
    const available = Object.keys(resolveCardsSource());
    setActiveChar((prev) => {
      if (prev && prev !== 'ALL' && available.includes(prev)) return prev;
      return available[0] || 'ALL';
    });
  }, [selectedVersion, JSON.stringify(selectedAscension)]);

  // Document-level handlers: dismiss tooltip when tapping outside, and detect touch scrolling
  useEffect(() => {
    const onDocPointer = (e: any) => {
      if (!tooltipRef.current) return;
      const target = e.target as Node;
      if (tooltipRef.current.contains(target)) return;
      // allow taps on card elements (they have class 'group') to be handled by card handlers
      const el = (e.target as HTMLElement) || null;
      if (el && el.closest && el.closest('.group')) return;
      setHovered(null);
    };

    const onTouchMove = () => {
      isTouchScrollingRef.current = true;
      touchMovedRef.current = true;
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        isTouchScrollingRef.current = false;
      }, 200);
    };

    document.addEventListener('click', onDocPointer, true);
    document.addEventListener('touchstart', onDocPointer, true);
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      document.removeEventListener('click', onDocPointer, true);
      document.removeEventListener('touchstart', onDocPointer, true);
      document.removeEventListener('touchmove', onTouchMove);
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // キャラクター一覧を API から取得して画像などを紐付け
  useEffect(() => {
    let mounted = true;
    fetch('https://spire-codex.com/api/characters?lang=jpn').then(r => r.json()).then((data: any[]) => {
      if (!mounted) return;
      const m: Record<string, any> = {};
      data.forEach(c => {
        // store by several normalized keys to match statsData keys
        const rawId = c.id || '';
        const noPrefix = rawId.replace(/^CHARACTER\./i, '').toLowerCase();
        m[rawId] = c;
        m[rawId.toLowerCase()] = c;
        m[noPrefix] = c;
      });
      setCharactersMeta(m);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // バージョン/アセンションの選択肢を statsData から作る
  useEffect(() => {
    const vKeys = statsData?.by_version?.summary ? Object.keys(statsData.by_version.summary) : [];
    const aKeys = statsData?.by_ascension?.summary ? Object.keys(statsData.by_ascension.summary) : [];
    const sortVersions = (arr: string[]) => {
      // put vUNKNOWN last, attempt semantic sort by splitting on dots
      return arr.slice().sort((a, b) => {
        if (a === b) return 0;
        if (a === 'vUNKNOWN') return 1;
        if (b === 'vUNKNOWN') return -1;
        const pa = a.replace(/^v/i, '').split('.').map(s => isNaN(Number(s)) ? s : Number(s));
        const pb = b.replace(/^v/i, '').split('.').map(s => isNaN(Number(s)) ? s : Number(s));
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          const aa = pa[i] === undefined ? -Infinity : pa[i];
          const bb = pb[i] === undefined ? -Infinity : pb[i];
          if (aa === bb) continue;
          if (typeof aa === 'number' && typeof bb === 'number') return bb - aa; // desc
          return String(bb).localeCompare(String(aa));
        }
        return 0;
      });
    };
    const sortedV = sortVersions(vKeys);
    const sortedA = aKeys.slice().sort((x, y) => {
      const nx = parseInt(x.replace(/^A/i, '')) || 0;
      const ny = parseInt(y.replace(/^A/i, '')) || 0;
      return ny - nx;
    });
    setVersions(['ALL', ...sortedV]);
    setAscensions(['ALL', ...sortedA]);
    // default ascension: A10
    setSelectedAscension(['A10']);

    // default version: select versions with matching second number (e.g., 0.103.2, 0.103.1, 0.103.0)
    if (sortedV.length > 0) {
      const latestVersion = sortedV[0];
      const parts = latestVersion.replace(/^v/i, '').split('.');
      if (parts.length >= 2) {
        const targetPrefix = parts.slice(0, 2).join('.');
        const matchingVersions = sortedV.filter(v => {
          const vParts = v.replace(/^v/i, '').split('.');
          return vParts.length >= 2 && vParts.slice(0, 2).join('.') === targetPrefix;
        });
        if (matchingVersions.length > 0) {
          setSelectedVersion(matchingVersions);
        } else {
          setSelectedVersion('ALL');
        }
      } else {
        setSelectedVersion('ALL');
      }
    } else {
      setSelectedVersion('ALL');
    }
  }, [statsData]);

  const updatePos = (e: any) => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX !== undefined && clientY !== undefined) {
      const tooltipWidth = 300;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
      let x = clientX + 15;
      if (x + tooltipWidth > window.innerWidth) x = clientX - tooltipWidth - 15;
      let y = clientY - (tooltipHeight / 2);
      if (y + tooltipHeight > window.innerHeight) y = window.innerHeight - tooltipHeight - 10;
      if (y < 10) y = 10;
      setMousePos({ x, y });
    }
  };

  const getList = () => {
    // get merged cards source using resolveCardsSource (supports multiple ascension selection)
    let cardsSource = resolveCardsSource();
    // Fallback to statsData.cards if resolveCardsSource returns empty
    if (!cardsSource || Object.keys(cardsSource).length === 0) {
      console.log('getList: resolveCardsSource returned empty, falling back to statsData.cards');
      cardsSource = statsData.cards || {};
    }
    const pickCountsFrom = (st: any) => {
      // Get metrics based on run type
      if (runType === 'single') {
        const picked = st.picked_single ?? st.picked_count ?? 0;
        const wins = st.picked_single_wins ?? st.picked_wins ?? 0;
        const appeared = st.appeared_single ?? st.appeared ?? 0;
        const final = st.final_single ?? st.final_count ?? 0;
        const finalWins = st.final_single_wins ?? st.final_wins ?? 0;
        const floor1Picked = st.floor1_picked ?? 0;
        const floor1PickedWins = st.floor1_picked_wins ?? 0;
        const floor1Appeared = st.floor1_appeared ?? 0;
        const floor2Picked = st.floor2_picked ?? 0;
        const floor2PickedWins = st.floor2_picked_wins ?? 0;
        const floor2Appeared = st.floor2_appeared ?? 0;
        const floor3Picked = st.floor3_picked ?? 0;
        const floor3PickedWins = st.floor3_picked_wins ?? 0;
        const floor3Appeared = st.floor3_appeared ?? 0;
        return { picked, wins, appeared, final, finalWins, floor1Picked, floor1PickedWins, floor1Appeared, floor2Picked, floor2PickedWins, floor2Appeared, floor3Picked, floor3PickedWins, floor3Appeared };
      } else {
        const picked = st.picked_multi ?? 0;
        const wins = st.picked_multi_wins ?? 0;
        const appeared = st.appeared_multi ?? 0;
        const final = st.final_multi ?? st.final_count ?? 0;
        const finalWins = st.final_multi_wins ?? st.final_wins ?? 0;
        const floor1Picked = st.floor1_picked ?? 0;
        const floor1PickedWins = st.floor1_picked_wins ?? 0;
        const floor1Appeared = st.floor1_appeared ?? 0;
        const floor2Picked = st.floor2_picked ?? 0;
        const floor2PickedWins = st.floor2_picked_wins ?? 0;
        const floor2Appeared = st.floor2_appeared ?? 0;
        const floor3Picked = st.floor3_picked ?? 0;
        const floor3PickedWins = st.floor3_picked_wins ?? 0;
        const floor3Appeared = st.floor3_appeared ?? 0;
        return { picked, wins, appeared, final, finalWins, floor1Picked, floor1PickedWins, floor1Appeared, floor2Picked, floor2PickedWins, floor2Appeared, floor3Picked, floor3PickedWins, floor3Appeared };
      }
    };

    // Calculate total runs for final rate calculation
    const mergeSummary = (sources: any[]) => {
      const merged: Record<string, any> = {};
      sources.forEach(src => {
        if (!src) return;
        Object.entries(src).forEach(([char, data]: any) => {
          if (!merged[char]) merged[char] = { total_runs_single: 0, total_runs_multi: 0 };
          merged[char].total_runs_single += data.total_runs_single || 0;
          merged[char].total_runs_multi += data.total_runs_multi || 0;
        });
      });
      return merged;
    };

    let summarySource: any;
    if (selectedVersion === 'ALL' && selectedAscension === 'ALL') {
      summarySource = statsData.summary;
    } else if (selectedVersion !== 'ALL' && selectedAscension === 'ALL') {
      if (Array.isArray(selectedVersion)) {
        const sources = selectedVersion.map(v => statsData.by_version?.summary?.[v] || {});
        summarySource = mergeSummary(sources);
      } else {
        summarySource = statsData.by_version?.summary?.[selectedVersion as any] || {};
      }
    } else if (selectedVersion === 'ALL' && selectedAscension !== 'ALL') {
      if (Array.isArray(selectedAscension)) {
        const sources = selectedAscension.map(a => statsData.by_ascension?.summary?.[a] || {});
        summarySource = mergeSummary(sources);
      } else {
        summarySource = statsData.by_ascension?.summary?.[selectedAscension as any] || {};
      }
    } else {
      // both specified
      const vArr = Array.isArray(selectedVersion) ? selectedVersion : [selectedVersion];
      const aArr = Array.isArray(selectedAscension) ? selectedAscension : [selectedAscension];
      const sources: any[] = [];
      vArr.forEach(ver => {
        aArr.forEach(asc => {
          if (statsData.by_version_ascension?.summary?.[ver]?.[asc]) {
            sources.push(statsData.by_version_ascension.summary[ver][asc]);
          }
        });
      });
      summarySource = mergeSummary(sources);
    }

    const totalRuns = activeChar === 'ALL'
      ? Object.values(summarySource).reduce((sum: number, char: any) => sum + (runType === 'single' ? char.total_runs_single : char.total_runs_multi), 0)
      : (summarySource[activeChar] ? (runType === 'single' ? summarySource[activeChar].total_runs_single : summarySource[activeChar].total_runs_multi) : 0);

    // If no runs match the filter, return empty list
    if (totalRuns === 0) {
      return [];
    }

    // cardsSource already resolved above
    // Always return all characters' cards, filtering will be done later
    const map: Record<string, any> = {};
    Object.values(cardsSource).forEach((group: any) => {
      Object.entries(group).forEach(([id, st]: any) => {
        const counts = pickCountsFrom(st);
        if (!map[id]) map[id] = { ...st, picked: counts.picked, wins: counts.wins, appeared: counts.appeared, final: counts.final, finalWins: counts.finalWins, floor1Picked: counts.floor1Picked, floor1PickedWins: counts.floor1PickedWins, floor1Appeared: counts.floor1Appeared, floor2Picked: counts.floor2Picked, floor2PickedWins: counts.floor2PickedWins, floor2Appeared: counts.floor2Appeared, floor3Picked: counts.floor3Picked, floor3PickedWins: counts.floor3PickedWins, floor3Appeared: counts.floor3Appeared };
        else { map[id].picked += counts.picked; map[id].wins += counts.wins; map[id].appeared += counts.appeared; map[id].final += counts.final; map[id].finalWins += counts.finalWins; map[id].floor1Picked += counts.floor1Picked; map[id].floor1PickedWins += counts.floor1PickedWins; map[id].floor1Appeared += counts.floor1Appeared; map[id].floor2Picked += counts.floor2Picked; map[id].floor2PickedWins += counts.floor2PickedWins; map[id].floor2Appeared += counts.floor2Appeared; map[id].floor3Picked += counts.floor3Picked; map[id].floor3PickedWins += counts.floor3PickedWins; map[id].floor3Appeared += counts.floor3Appeared }
      });
    });
    return Object.entries(map).map(([id, st]: any) => ({ 
      id, 
      ...st, 
      pickWr: st.picked ? (st.wins / st.picked) * 100 : 0,
      pickRate: st.appeared ? (st.picked / st.appeared) * 100 : 0,
      finalWr: st.final ? (st.finalWins / st.final) * 100 : 0,
      finalRate: totalRuns ? (st.final / totalRuns) * 100 : 0,
      floor1PickRate: st.floor1Appeared ? (st.floor1Picked / st.floor1Appeared) * 100 : 0,
      floor1PickWr: st.floor1Picked ? (st.floor1PickedWins / st.floor1Picked) * 100 : 0,
      floor2PickRate: st.floor2Appeared ? (st.floor2Picked / st.floor2Appeared) * 100 : 0,
      floor2PickWr: st.floor2Picked ? (st.floor2PickedWins / st.floor2Picked) * 100 : 0,
      floor3PickRate: st.floor3Appeared ? (st.floor3Picked / st.floor3Appeared) * 100 : 0,
      floor3PickWr: st.floor3Picked ? (st.floor3PickedWins / st.floor3Picked) * 100 : 0
    }));
  };

  // Filter based on selected criteria
  let list = getList();
  if (sortBy === 'final_wr' || sortBy === 'final_rate') {
    list = list.filter((c: any) => c.final >= 3);
  } else if (sortBy === 'floor1_pick_rate') {
    list = list.filter((c: any) => c.floor1Appeared >= 3);
  } else if (sortBy === 'floor1_pick_wr') {
    list = list.filter((c: any) => c.floor1Picked >= 3);
  } else if (sortBy === 'floor2_pick_rate') {
    list = list.filter((c: any) => c.floor2Appeared >= 3);
  } else if (sortBy === 'floor2_pick_wr') {
    list = list.filter((c: any) => c.floor2Picked >= 3);
  } else if (sortBy === 'floor3_pick_rate') {
    list = list.filter((c: any) => c.floor3Appeared >= 3);
  } else if (sortBy === 'floor3_pick_wr') {
    list = list.filter((c: any) => c.floor3Picked >= 3);
  } else if (sortBy === 'pick_wr') {
    list = list.filter((c: any) => c.picked >= 3);
  } else {
    list = list.filter((c: any) => c.appeared >= 3);
  }

  // Sort based on selected criteria
  const sortKeyMap: Record<typeof sortBy, string> = {
    pick_wr: 'pickWr',
    pick_rate: 'pickRate',
    final_wr: 'finalWr',
    final_rate: 'finalRate',
    floor1_pick_rate: 'floor1PickRate',
    floor1_pick_wr: 'floor1PickWr',
    floor2_pick_rate: 'floor2PickRate',
    floor2_pick_wr: 'floor2PickWr',
    floor3_pick_rate: 'floor3PickRate',
    floor3_pick_wr: 'floor3PickWr'
  };
  const sortKey = sortKeyMap[sortBy];
  list = list.sort((a: any, b: any) => b[sortKey] - a[sortKey]);

  // If a specific character tab is active, filter list to that character's cards or colorless/common cards
  if (activeChar !== 'ALL') {
    const allowedColorNames = new Set(['colorless', 'neutral', 'all', 'none', 'common', 'shared']);
    const norm = (s: any) => (typeof s === 'string' ? s.replace('CHARACTER.', '').replace('character.', '').toLowerCase() : '');
    list = list.filter((c: any) => {
      const api = cardInfoMap[c.id];
      if (!api) return true; // keep if no metadata
      const color = norm(api.color || api.colour || api.class || api.character || api.type);
      const isColorless = allowedColorNames.has(color) || color === 'colorless' || color === 'neutral';
      const isSameChar = color === activeChar.toLowerCase();
      if (isSameChar) return true;
      if (isColorless && includeColorless) return true;
      if (!isSameChar && includeOtherChar) return true;
      return false;
    });
  }

  // Distribute cards into tiers based on percentages
  const distributeCardsToTiers = (cards: any[]) => {
    const total = cards.length;
    if (total === 0) return { S: [], A: [], B: [], C: [], D: [] };
    
    const sCount = Math.ceil(total * 0.10);
    const aCount = Math.ceil(total * 0.20);
    const bCount = Math.ceil(total * 0.40);
    const cCount = Math.ceil(total * 0.20);
    const dCount = total - sCount - aCount - bCount - cCount;
    
    return {
      S: cards.slice(0, sCount),
      A: cards.slice(sCount, sCount + aCount),
      B: cards.slice(sCount + aCount, sCount + aCount + bCount),
      C: cards.slice(sCount + aCount + bCount, sCount + aCount + bCount + cCount),
      D: cards.slice(sCount + aCount + bCount + cCount),
    };
  };

  // Calculate tier data from filtered list (after all filtering is complete)
  const tierData = distributeCardsToTiers(list);

  const exportTierPNG = async () => {
    setHovered(null);
    setIsExporting(true);
    
    // Wait for the hidden tier list to be rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!tierExportRef.current) {
      setIsExporting(false);
      return;
    }

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    try { await Promise.race([(document as any).fonts.ready, wait(150)]); } catch (e) {}
    
    // Add error handlers to original images before cloning
    const originalImgs = Array.from(tierExportRef.current.querySelectorAll('img')) as HTMLImageElement[];
    originalImgs.forEach(img => {
      img.onerror = () => { /* Ignore errors */ };
    });
    
    const imgs = Array.from(tierExportRef.current.querySelectorAll('img')) as HTMLImageElement[];
    const imgLoadWithTimeout = (img: HTMLImageElement, timeout = 300) => new Promise(r => {
      if (img.complete) return r(null);
      let done = false;
      const fin = () => { if (done) return; done = true; r(null); };
      img.onload = fin; img.onerror = fin;
      setTimeout(fin, timeout);
    });
    const imgPromises = imgs.map(img => imgLoadWithTimeout(img, 300));
    await Promise.all(imgPromises);

    const clone = tierExportRef.current.cloneNode(true) as HTMLElement;
    
    // Add error handler to ignore image loading errors
    clone.querySelectorAll('img').forEach((img: any) => {
      img.onerror = () => { /* Ignore errors */ };
    });
    clone.style.width = '1024px';
    clone.style.transform = 'none';
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.zIndex = '99999';
    document.body.appendChild(clone);

    const originalAllLoaded = imgs.every(i => i.complete);
    if (!originalAllLoaded) {
      const cImgs = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[];
      const cPromises = cImgs.map(img => imgLoadWithTimeout(img, 300));
      await Promise.all(cPromises);
    }

    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise(resolve => setTimeout(resolve, 150));

    clone.querySelectorAll('*').forEach((el: any) => {
      try {
        const cs = getComputedStyle(el);
        if (!cs) return;
        if (cs.borderStyle && cs.borderStyle !== 'none') {
          el.style.borderLeftWidth = cs.borderLeftWidth;
          el.style.borderRightWidth = cs.borderRightWidth;
          el.style.borderTopWidth = cs.borderTopWidth;
          el.style.borderBottomWidth = cs.borderBottomWidth;
          el.style.borderStyle = cs.borderStyle;
          el.style.borderColor = cs.borderColor;
          el.style.boxSizing = 'border-box';
        }
        const skipTransform = el.classList && (el.classList.contains('cost-text') || el.classList.contains('cost-badge'));
        if (!skipTransform && cs.transform && cs.transform !== 'none') el.style.transform = 'none';
        el.style.padding = cs.padding;
        el.style.margin = cs.margin;
      } catch (e) {}
    });

    clone.querySelectorAll('img').forEach((img: any) => {
      try {
        const r = img.getBoundingClientRect();
        if (r.width && r.height) {
          img.style.width = `${Math.round(r.width)}px`;
          img.style.height = `${Math.round(r.height)}px`;
          img.style.maxWidth = 'none';
        }
      } catch (e) {}
    });

    clone.querySelectorAll('svg').forEach((svg: any) => {
      try {
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
        if (vb && rect.width && vb.width) {
          const scale = rect.width / vb.width;
          svg.querySelectorAll('[stroke-width]').forEach((p: any) => {
            const orig = parseFloat(p.getAttribute('stroke-width') || '1');
            p.setAttribute('stroke-width', String(Math.max(1, orig * scale)));
            p.setAttribute('vector-effect', 'non-scaling-stroke');
          });
        } else {
          svg.querySelectorAll('[stroke-width]').forEach((p: any) => p.setAttribute('vector-effect', 'non-scaling-stroke'));
        }
        if (!svg.getAttribute('width') && rect.width) svg.setAttribute('width', String(Math.round(rect.width)));
        if (!svg.getAttribute('height') && rect.height) svg.setAttribute('height', String(Math.round(rect.height)));
      } catch (e) {}
    });

    clone.querySelectorAll('.cost-badge').forEach((badge: any) => {
      try {
        const r = badge.getBoundingClientRect();
        if (r.width && r.height) {
          badge.style.width = `${Math.round(r.width)}px`;
          badge.style.height = `${Math.round(r.height)}px`;
          badge.style.display = 'flex';
          badge.style.alignItems = 'center';
          badge.style.justifyContent = 'center';
        }
        const span = badge.querySelector('.cost-text');
        if (span) {
          try {
            const cs = getComputedStyle(span);
            span.style.transform = cs.transform || '';
          } catch (e) {
            span.style.transform = '';
          }
          span.style.display = 'block';
          if (r.height) span.style.lineHeight = `${Math.round(r.height)}px`;
          span.style.padding = '0';
        }
      } catch (e) {}
    });

    const cloneCostEls = Array.from(clone.querySelectorAll('.cost-text')) as HTMLElement[];
    const clonePrev = cloneCostEls.map(el => el.style.transform || '');
    try {
      cloneCostEls.forEach(el => { try { el.style.transform = `${el.style.transform || ''} translateY(-30%)`; } catch (e) {} });

      const canvas = await html2canvas(clone, { 
        backgroundColor: '#020617', 
        useCORS: true, 
        scale: Math.max(1, DPR), 
        width: 1024,
        onclone: (clonedDoc) => {
          // Replace all lab() color functions with fallback colors
          clonedDoc.querySelectorAll('*').forEach((el: any) => {
            try {
              const cs = getComputedStyle(el);
              
              // Handle color property
              if (cs.color) {
                const colorStr = cs.color;
                if (colorStr.includes('lab(') || colorStr.includes('oklab(')) {
                  // Try to preserve lightness approximation
                  el.style.color = '#ffffff';
                }
              }
              
              // Handle backgroundColor property
              if (cs.backgroundColor) {
                const bgColorStr = cs.backgroundColor;
                if (bgColorStr.includes('lab(') || bgColorStr.includes('oklab(')) {
                  // Dark background fallback
                  el.style.backgroundColor = '#020617';
                }
              }
              
              // Handle borderColor property
              if (cs.borderColor) {
                const borderColorStr = cs.borderColor;
                if (borderColorStr.includes('lab(') || borderColorStr.includes('oklab(')) {
                  el.style.borderColor = '#1e293b';
                }
              }
              
              // Handle other color-related properties
              ['borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 
               'outlineColor', 'textDecorationColor', 'boxShadow'].forEach(prop => {
                const propValue = cs[prop as any];
                if (propValue && (propValue.includes('lab(') || propValue.includes('oklab('))) {
                  el.style[prop as any] = 'transparent';
                }
              });
            } catch (e) {
              // Ignore errors for individual elements
            }
          });
        }
      });

      document.body.removeChild(clone);
      setIsExporting(false);

      const link = document.createElement('a');
      link.download = `STS-Tier-Stats.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      clonePrev.forEach((val, i) => { try { if (cloneCostEls[i]) cloneCostEls[i].style.transform = val; } catch (e) {} });
      try { if (document.body.contains(clone)) document.body.removeChild(clone); } catch (e) {}
      setIsExporting(false);
    }
  };

  // If a specific character tab is active, filter list to that character's cards or colorless/common cards
  if (activeChar !== 'ALL') {
    const allowedColorNames = new Set(['colorless', 'neutral', 'all', 'none', 'common', 'shared']);
    const norm = (s: any) => (typeof s === 'string' ? s.replace('CHARACTER.', '').replace('character.', '').toLowerCase() : '');
    list = list.filter((c: any) => {
      const api = cardInfoMap[c.id];
      if (!api) return true; // keep if no metadata
      const color = norm(api.color || api.colour || api.class || api.character || api.type);
      const isColorless = allowedColorNames.has(color) || color === 'colorless' || color === 'neutral';
      const isSameChar = color === activeChar.toLowerCase();
      if (isSameChar) return true;
      if (isColorless && includeColorless) return true;
      if (!isSameChar && includeOtherChar) return true;
      return false;
    });
  }

  return (
    <div>
      <nav className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <Link href="/" className="text-[10px] font-black text-[#64748b] hover:text-[#60a5fa] uppercase tracking-widest">← Return</Link>
      </nav>

      <div className="mb-4 overflow-x-auto text-center">
        <div className="inline-flex gap-1.5 p-1 bg-[#0f172a] rounded-sm border border-[#ffffff1a]">
          {chars.map((ch) => (
            <button key={ch} onClick={() => setActiveChar(ch)} className={`w-8 h-8 p-0 rounded-sm overflow-hidden flex items-center justify-center ${activeChar === ch ? 'ring-2 ring-[#2563eb]' : 'opacity-90 hover:opacity-100'}`} title={charactersMeta[ch]?.name || ch} aria-label={ch}>
              {charactersMeta[ch]?.image_url ? (
                <img src={formatImageUrl(charactersMeta[ch].image_url)} alt={charactersMeta[ch].name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-black uppercase text-[#64748b]">{ch}</span>
              )}
            </button>
          ))}
          {/* ALL タブは不要のため非表示 */}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold">ランタイプ:</label>
          <label className="text-[9px] flex items-center gap-1"><input type="radio" name="runType" checked={runType==='single'} onChange={() => setRunType('single')} /> シングル</label>
          <label className="text-[9px] flex items-center gap-1"><input type="radio" name="runType" checked={runType==='multi'} onChange={() => setRunType('multi')} /> マルチ</label>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[9px] flex items-center gap-1"><input type="checkbox" checked={includeColorless} onChange={(e) => setIncludeColorless(e.target.checked)} /> 無色カードを含める</label>
          <label className="text-[9px] flex items-center gap-1"><input type="checkbox" checked={includeOtherChar} onChange={(e) => setIncludeOtherChar(e.target.checked)} /> 他キャラカードを含める</label>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[9px] font-bold">ソート条件:</label>
          <div className="relative">
            <button onClick={() => setSortOpen(s => !s)} className="text-[9px] bg-[#071021] border border-[#ffffff1a] px-2 py-1 rounded-sm flex items-center gap-2">
              <span>{
                sortBy === 'pick_wr' ? 'Pick勝率' :
                sortBy === 'pick_rate' ? 'Pick率' :
                sortBy === 'final_wr' ? 'Final勝率' :
                sortBy === 'final_rate' ? 'Final所持率' :
                sortBy === 'floor1_pick_rate' ? '1層Pick率' :
                sortBy === 'floor1_pick_wr' ? '1層Pick勝率' :
                sortBy === 'floor2_pick_rate' ? '2層Pick率' :
                sortBy === 'floor2_pick_wr' ? '2層Pick勝率' :
                sortBy === 'floor3_pick_rate' ? '3層Pick率' :
                sortBy === 'floor3_pick_wr' ? '3層Pick勝率' : ''
              }</span>
              <span className="text-xs">▾</span>
            </button>
            {sortOpen && (
              <div className="absolute z-40 mt-1 right-0 md:right-0 left-0 md:left-auto w-48 max-h-64 overflow-auto bg-[#02111b] border border-[#ffffff1a] p-2 rounded-sm shadow-lg">
                <div className="mb-2 pb-2 border-b border-slate-800">
                  <p className="text-[8px] text-slate-400 mb-1">各指標の定義:</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Pick勝率: ピックしたランの勝率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Pick率: 提示されたランに対するピック率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Final勝率: 最終デッキに含まれていたランの勝率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Final所持率: 総ラン数に対する最終デッキ所持率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• 1層/2層/3層Pick率: 各層での提示に対するピック率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• 1層/2層/3層Pick勝率: 各層でピックしたランの勝率</p>
                </div>
                <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'pick_wr' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='pick_wr'} onChange={() => { setSortBy('pick_wr'); setSortOpen(false); }} /> Pick勝率</label>
                <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'pick_rate' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='pick_rate'} onChange={() => { setSortBy('pick_rate'); setSortOpen(false); }} /> Pick率</label>
                <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'final_wr' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='final_wr'} onChange={() => { setSortBy('final_wr'); setSortOpen(false); }} /> Final勝率</label>
                <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'final_rate' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='final_rate'} onChange={() => { setSortBy('final_rate'); setSortOpen(false); }} /> Final所持率</label>
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <p className="text-[8px] text-slate-400 mb-1">層ごとの統計:</p>
                  <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'floor1_pick_rate' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='floor1_pick_rate'} onChange={() => { setSortBy('floor1_pick_rate'); setSortOpen(false); }} /> 1層Pick率</label>
                  <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'floor1_pick_wr' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='floor1_pick_wr'} onChange={() => { setSortBy('floor1_pick_wr'); setSortOpen(false); }} /> 1層Pick勝率</label>
                  <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'floor2_pick_rate' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='floor2_pick_rate'} onChange={() => { setSortBy('floor2_pick_rate'); setSortOpen(false); }} /> 2層Pick率</label>
                  <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'floor2_pick_wr' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='floor2_pick_wr'} onChange={() => { setSortBy('floor2_pick_wr'); setSortOpen(false); }} /> 2層Pick勝率</label>
                  <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'floor3_pick_rate' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='floor3_pick_rate'} onChange={() => { setSortBy('floor3_pick_rate'); setSortOpen(false); }} /> 3層Pick率</label>
                  <label className={`flex items-center gap-2 mb-1 cursor-pointer ${sortBy === 'floor3_pick_wr' ? 'text-blue-400' : ''}`}><input type="radio" name="sortBy" checked={sortBy==='floor3_pick_wr'} onChange={() => { setSortBy('floor3_pick_wr'); setSortOpen(false); }} /> 3層Pick勝率</label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[9px] font-bold">バージョン:</label>
          <div className="relative">
            <button onClick={() => setVerOpen(s => !s)} className="text-[9px] bg-[#071021] border border-[#ffffff1a] px-2 py-1 rounded-sm flex items-center gap-2">
              <span>{
                selectedVersion === 'ALL' ? 'すべて' : (Array.isArray(selectedVersion) ? selectedVersion.join(', ') : String(selectedVersion))
              }</span>
              <span className="text-xs">▾</span>
            </button>
            {verOpen && (
              <div className="absolute z-40 mt-1 right-0 md:right-0 left-0 md:left-auto w-40 max-h-48 overflow-auto bg-[#02111b] border border-[#ffffff1a] p-2 rounded-sm shadow-lg">
                <label className="flex items-center gap-2 mb-1"><input type="checkbox" checked={selectedVersion === 'ALL'} onChange={(e) => { if (e.target.checked) setSelectedVersion('ALL'); else setSelectedVersion([]); }} /> 全て</label>
                {versions.filter(v => v !== 'ALL').map(v => {
                  const checked = selectedVersion === 'ALL' ? false : (Array.isArray(selectedVersion) ? selectedVersion.includes(v) : false);
                  return (
                    <label key={v} className="flex items-center gap-2 mb-1"><input type="checkbox" checked={checked} onChange={(e) => {
                      if (e.target.checked) {
                        const prev = selectedVersion === 'ALL' ? [] : (Array.isArray(selectedVersion) ? selectedVersion.slice() : []);
                        if (!prev.includes(v)) prev.push(v);
                        setSelectedVersion(prev);
                      } else {
                        const prev = Array.isArray(selectedVersion) ? selectedVersion.filter(x => x !== v) : [];
                        setSelectedVersion(prev);
                      }
                    }} /> {v}</label>
                  );
                })}
                <div className="mt-2 flex justify-between">
                  <button className="text-[9px] px-2 py-1 bg-[#0b1320] rounded-sm" onClick={() => { setSelectedVersion('ALL'); setVerOpen(false); }}>適用（全て）</button>
                  <button className="text-[9px] px-2 py-1 bg-[#0b1320] rounded-sm" onClick={() => { setVerOpen(false); }}>閉じる</button>
                </div>
              </div>
            )}
          </div>
          <label className="text-[9px] font-bold">アセンション:</label>
          <div className="relative">
            <button onClick={() => setAscOpen(s => !s)} className="text-[9px] bg-[#071021] border border-[#ffffff1a] px-2 py-1 rounded-sm flex items-center gap-2">
              <span>{
                selectedAscension === 'ALL' ? 'すべて' : (Array.isArray(selectedAscension) ? selectedAscension.join(', ') : String(selectedAscension))
              }</span>
              <span className="text-xs">▾</span>
            </button>
            {ascOpen && (
              <div className="absolute z-40 mt-1 right-0 md:right-0 left-0 md:left-auto w-40 max-h-48 overflow-auto bg-[#02111b] border border-[#ffffff1a] p-2 rounded-sm shadow-lg">
                <label className="flex items-center gap-2 mb-1"><input type="checkbox" checked={selectedAscension === 'ALL'} onChange={(e) => { if (e.target.checked) setSelectedAscension('ALL'); else setSelectedAscension([]); }} /> 全て</label>
                {ascensions.filter(a => a !== 'ALL').map(a => {
                  const checked = selectedAscension === 'ALL' ? false : (Array.isArray(selectedAscension) ? selectedAscension.includes(a) : false);
                  return (
                    <label key={a} className="flex items-center gap-2 mb-1"><input type="checkbox" checked={checked} onChange={(e) => {
                      if (e.target.checked) {
                        const prev = selectedAscension === 'ALL' ? [] : (Array.isArray(selectedAscension) ? selectedAscension.slice() : []);
                        if (!prev.includes(a)) prev.push(a);
                        setSelectedAscension(prev);
                      } else {
                        const prev = Array.isArray(selectedAscension) ? selectedAscension.filter(x => x !== a) : [];
                        setSelectedAscension(prev);
                      }
                    }} /> {a}</label>
                  );
                })}
                <div className="mt-2 flex justify-between">
                  <button className="text-[9px] px-2 py-1 bg-[#0b1320] rounded-sm" onClick={() => { setSelectedAscension('ALL'); setAscOpen(false); }}>適用（全て）</button>
                  <button className="text-[9px] px-2 py-1 bg-[#0b1320] rounded-sm" onClick={() => { setAscOpen(false); }}>閉じる</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-[10px] text-slate-500">
            ※ 各指標の分母が3以上のカードのみ表示しています。
            <br/>
            • Pick: ピックしたラン数 / Win: ピックしたランの勝利回数 / Final: 最終デッキに含まれていたラン数 / FinalWin: 最終デッキに含まれていたランの勝利回数 / Appear: 提示されたラン数（1ランにつき1回カウント）
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            対象ラン数: {(() => {
              const mergeSummary = (sources: any[]) => {
                const merged: Record<string, any> = {};
                sources.forEach(src => {
                  if (!src) return;
                  Object.entries(src).forEach(([char, data]: any) => {
                    if (!merged[char]) merged[char] = { total_runs_single: 0, total_runs_multi: 0 };
                    merged[char].total_runs_single += data.total_runs_single || 0;
                    merged[char].total_runs_multi += data.total_runs_multi || 0;
                  });
                });
                return merged;
              };

            let summarySource: any;
            if (selectedVersion === 'ALL' && selectedAscension === 'ALL') {
              summarySource = statsData.summary;
            } else if (selectedVersion !== 'ALL' && selectedAscension === 'ALL') {
              if (Array.isArray(selectedVersion)) {
                const sources = selectedVersion.map(v => statsData.by_version?.summary?.[v] || {});
                summarySource = mergeSummary(sources);
              } else {
                summarySource = statsData.by_version?.summary?.[selectedVersion as any] || {};
              }
            } else if (selectedVersion === 'ALL' && selectedAscension !== 'ALL') {
              if (Array.isArray(selectedAscension)) {
                const sources = selectedAscension.map(a => statsData.by_ascension?.summary?.[a] || {});
                summarySource = mergeSummary(sources);
              } else {
                summarySource = statsData.by_ascension?.summary?.[selectedAscension as any] || {};
              }
            } else {
              // both specified
              const vArr = Array.isArray(selectedVersion) ? selectedVersion : [selectedVersion];
              const aArr = Array.isArray(selectedAscension) ? selectedAscension : [selectedAscension];
              const sources: any[] = [];
              vArr.forEach(ver => {
                aArr.forEach(asc => {
                  if (statsData.by_version_ascension?.summary?.[ver]?.[asc]) {
                    sources.push(statsData.by_version_ascension.summary[ver][asc]);
                  }
                });
              });
              summarySource = mergeSummary(sources);

              // If by_version_ascension.summary is empty, return all data
              // We cannot accurately calculate intersection without proper data
              if (Object.keys(summarySource).length === 0) {
                summarySource = statsData.summary || {};
              }
            }

            if (activeChar === 'ALL') {
              return Object.values(summarySource).reduce((sum: number, char: any) => sum + (runType === 'single' ? char.total_runs_single : char.total_runs_multi), 0);
            }
            const charData = summarySource[activeChar];
            return charData ? (runType === 'single' ? charData.total_runs_single : charData.total_runs_multi) : 0;
          })()}
        </p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); exportTierPNG(); }}
          disabled={isExporting || list.length === 0}
          className="text-[9px] font-black text-[#60a5fa] border border-[#3b82f64d] px-3 py-1 rounded-sm uppercase hover:bg-[#3b82f61a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : 'Tier PNG'}
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {list.map((card: any) => {
          const api = cardInfoMap[card.id];
          const image = api?.image_url || api?.image || '';
          const color = getRarityColor(api?.rarity || '');
          const costParts = getCostParts(api, false);
          return (
            <div key={card.id} className="group relative flex flex-col transition-transform hover:scale-110 hover:z-50 bg-[#071021] border border-[#0f172a] rounded-sm overflow-hidden" onMouseEnter={(e) => { setHovered({ api, stat: card }); updatePos(e); }} onMouseMove={updatePos} onMouseLeave={() => setHovered(null)} onClick={(e) => { setHovered({ api, stat: card }); updatePos(e); }} onTouchStart={(e: any) => { const t = e.touches?.[0]; touchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null; touchMovedRef.current = false; }} onTouchMove={(e: any) => { touchMovedRef.current = true; /* keep updating pos so tooltip won't snap */ const t = e.touches?.[0]; if (t) updatePos(t); }} onTouchEnd={(e: any) => {
                const moved = touchMovedRef.current || isTouchScrollingRef.current;
                const t = e.changedTouches?.[0];
                // if it was a gentle tap (no move/scroll), toggle/show tooltip; otherwise dismiss
                if (!moved) {
                  setHovered((prev: any) => (prev && prev.api && prev.api === api) ? null : { api, stat: card });
                  if (t) updatePos(t);
                } else {
                  setHovered(null);
                }
                touchStartRef.current = null;
                touchMovedRef.current = false;
              }}>
              <div className="relative aspect-[1/1.32] w-full flex flex-col pointer-events-none overflow-hidden">
                <div className="w-full aspect-square relative bg-[#0f172a] border border-[#ffffff0d] flex items-center justify-center">
                  {image && <img src={formatImageUrl(image)} alt={api?.name || card.id} className="w-full h-full object-contain" />}
                  <div className="cost-badge absolute top-1 left-1 z-30 w-4.5 h-4.5 bg-[#000000cc] border border-[#ffffff4d] rounded-full flex items-center justify-center">
                    <span className="cost-text font-black italic block text-center" style={{ color, fontSize: '9px' }}>{costParts.isStar ? `★${costParts.text}` : costParts.text}</span>
                  </div>
                  <StarCostDiamond starCost={api?.star_cost} isXStarCost={api?.is_x_star_cost} size="large" />
                </div>
                <div className="flex-1 flex items-start justify-center px-1 pt-1.5">
                  <p className="card-name-text text-[7px] font-black text-white text-center uppercase break-words w-full">{api?.name || card.id.replace('CARD.', '')}</p>
                </div>
                <CardFrameStroke type={api?.type} color={color} />
              </div>

              <div className="p-2 bg-black/30 border-t border-slate-800">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {sortBy === 'pick_wr' ? 'Pick Win Rate' :
                     sortBy === 'pick_rate' ? 'Pick Rate' :
                     sortBy === 'final_wr' ? 'Final Win Rate' :
                     sortBy === 'final_rate' ? 'Final Rate' :
                     sortBy === 'floor1_pick_rate' ? '1層 Pick Rate' :
                     sortBy === 'floor1_pick_wr' ? '1層 Pick Win Rate' :
                     sortBy === 'floor2_pick_rate' ? '2層 Pick Rate' :
                     sortBy === 'floor2_pick_wr' ? '2層 Pick Win Rate' :
                     sortBy === 'floor3_pick_rate' ? '3層 Pick Rate' :
                     sortBy === 'floor3_pick_wr' ? '3層 Pick Win Rate' : 'Win Rate'}
                  </span>
                  <span className="text-sm font-mono font-bold text-green-400">
                    {sortBy === 'pick_wr' ? card.pickWr.toFixed(1) :
                     sortBy === 'pick_rate' ? card.pickRate.toFixed(1) :
                     sortBy === 'final_wr' ? card.finalWr.toFixed(1) :
                     sortBy === 'final_rate' ? card.finalRate.toFixed(1) :
                     sortBy === 'floor1_pick_rate' ? card.floor1PickRate.toFixed(1) :
                     sortBy === 'floor1_pick_wr' ? card.floor1PickWr.toFixed(1) :
                     sortBy === 'floor2_pick_rate' ? card.floor2PickRate.toFixed(1) :
                     sortBy === 'floor2_pick_wr' ? card.floor2PickWr.toFixed(1) :
                     sortBy === 'floor3_pick_rate' ? card.floor3PickRate.toFixed(1) :
                     sortBy === 'floor3_pick_wr' ? card.floor3PickWr.toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-green-400 transition-all duration-1000" style={{ 
                    width: `${sortBy === 'pick_wr' ? card.pickWr :
                            sortBy === 'pick_rate' ? card.pickRate :
                            sortBy === 'final_wr' ? card.finalWr :
                            sortBy === 'final_rate' ? card.finalRate :
                            sortBy === 'floor1_pick_rate' ? card.floor1PickRate :
                            sortBy === 'floor1_pick_wr' ? card.floor1PickWr :
                            sortBy === 'floor2_pick_rate' ? card.floor2PickRate :
                            sortBy === 'floor2_pick_wr' ? card.floor2PickWr :
                            sortBy === 'floor3_pick_rate' ? card.floor3PickRate :
                            sortBy === 'floor3_pick_wr' ? card.floor3PickWr : 0}%` 
                  }} />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>Pick: {card.picked}</span>
                  <span>Win: {card.wins}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mt-1">
                  <span>Final: {card.final}</span>
                  <span>FinalWin: {card.finalWins}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mt-1">
                  <span>Appear: {card.appeared}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hovered && hovered.api && (() => {
              // compute tooltip style: on narrow screens place top center
              const tooltipWidth = 320;
              const tooltipHeight = tooltipRef.current?.offsetHeight || 300;
              const isNarrow = typeof window !== 'undefined' && window.innerWidth < 640;
              let style: any = {};
              if (isNarrow) {
                style.left = Math.max(8, (window.innerWidth - tooltipWidth) / 2);
                style.top = 8;
                style.position = 'fixed';
                style.width = `${Math.min(tooltipWidth, window.innerWidth - 16)}px`;
              } else {
                let x = mousePos.x + 15;
                if (x + tooltipWidth > window.innerWidth) x = mousePos.x - tooltipWidth - 15;
                let y = mousePos.y - (tooltipHeight / 2);
                if (y + tooltipHeight > window.innerHeight) y = window.innerHeight - tooltipHeight - 10;
                if (y < 10) y = 10;
                style.left = x;
                style.top = y;
                style.position = 'fixed';
                style.width = `${tooltipWidth}px`;
              }
              return (
                <div ref={tooltipRef} className="fixed z-[9999] p-3 rounded-sm bg-[#020617] border border-[#1e293b] text-sm text-slate-200 shadow-2xl" style={style}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs text-slate-400 uppercase">{hovered.api.name}</div>
                    <div className="flex items-center gap-1">
                      {(hovered.api.is_x_star_cost || hovered.api.star_cost) && <span className="text-xs font-black text-blue-400">★{hovered.api.is_x_star_cost ? 'X' : hovered.api.star_cost}</span>}
                      <span className="text-sm font-black italic text-white">{hovered.api.is_x_cost ? 'X' : (hovered.api.cost === -1 ? 'X' : hovered.api.cost)}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-[#07121a] rounded-sm mb-2">
                    <div className="text-[11px] text-[#cbd5e1] leading-relaxed spire-desc" dangerouslySetInnerHTML={{ __html: parseDescription(hovered.api, false) }} />
                  </div>
                  {hovered.api.upgrade && (
                    <div className="p-2 bg-[#020617] rounded-sm border-t border-[#0f172a]">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-[10px] text-[#7cfc00] font-black">UPGRADED +</div>
                        <div className="flex items-center gap-1">
                          {(hovered.api.upgrade?.is_x_star_cost || hovered.api.upgrade?.star_cost || hovered.api.is_x_star_cost || hovered.api.star_cost) && <span className="text-xs font-black text-blue-400">★{hovered.api.upgrade?.is_x_star_cost ? 'X' : (hovered.api.upgrade?.star_cost || hovered.api.is_x_star_cost ? 'X' : hovered.api.star_cost)}</span>}
                          <span className="text-sm font-black italic" style={{ color: (hovered.api.upgrade?.cost !== undefined && hovered.api.upgrade.cost < hovered.api.cost) ? '#7cfc00' : 'white' }}>
                            {(hovered.api.upgrade?.is_x_cost || hovered.api.is_x_cost) ? 'X' : (hovered.api.upgrade?.cost !== undefined ? (hovered.api.upgrade.cost === -1 ? 'X' : hovered.api.upgrade.cost) : (hovered.api.cost === -1 ? 'X' : hovered.api.cost))}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#cbd5e1] leading-relaxed spire-desc" dangerouslySetInnerHTML={{ __html: parseDescription(hovered.api, true) }} />
                    </div>
                  )}
                </div>
              );
            })()}

      {/* Hidden tier list for PNG export - only rendered during export */}
      {isExporting && (
        <div ref={tierExportRef} className="fixed left-[-9999px] top-0 w-[1024px] bg-[#020617] border border-[#1e293b] rounded-sm overflow-hidden">
        <div className="p-3 border-b border-[#1e293b] bg-[#0d0d12]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-[#cbd5e1]">
            <span className="text-[#60a5fa]">{charactersMeta[activeChar]?.name || activeChar}</span>
            <span className="text-slate-500">|</span>
            <span>Ver: {selectedVersion === 'ALL' ? 'ALL' : (Array.isArray(selectedVersion) ? selectedVersion.join(',') : selectedVersion)}</span>
            <span className="text-slate-500">|</span>
            <span>Asc: {selectedAscension === 'ALL' ? 'ALL' : (Array.isArray(selectedAscension) ? selectedAscension.join(',') : selectedAscension)}</span>
            <span className="text-slate-500">|</span>
            <span>Type: {runType === 'single' ? 'Single' : 'Multi'}</span>
            <span className="text-slate-500">|</span>
            <span>Sort: {
              sortBy === 'pick_wr' ? 'Pick勝率' :
              sortBy === 'pick_rate' ? 'Pick率' :
              sortBy === 'final_wr' ? 'Final勝率' :
              sortBy === 'final_rate' ? 'Final所持率' :
              sortBy === 'floor1_pick_rate' ? '1層Pick率' :
              sortBy === 'floor1_pick_wr' ? '1層Pick勝率' :
              sortBy === 'floor2_pick_rate' ? '2層Pick率' :
              sortBy === 'floor2_pick_wr' ? '2層Pick勝率' :
              sortBy === 'floor3_pick_rate' ? '3層Pick率' :
              sortBy === 'floor3_pick_wr' ? '3層Pick勝率' : sortBy
            }</span>
            {includeColorless && <span className="text-blue-400">+無色</span>}
            {includeOtherChar && <span className="text-blue-400">+他キャラ</span>}
          </div>
          <div className="text-[9px] text-slate-500 mt-1">
            データ取得日時: {updatedAt ? new Date(updatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'} | 対象ラン数: {(() => {
              const mergeSummary = (sources: any[]) => {
                const merged: Record<string, any> = {};
                sources.forEach(src => {
                  if (!src) return;
                  Object.entries(src).forEach(([char, data]: any) => {
                    if (!merged[char]) merged[char] = { total_runs_single: 0, total_runs_multi: 0 };
                    merged[char].total_runs_single += data.total_runs_single || 0;
                    merged[char].total_runs_multi += data.total_runs_multi || 0;
                  });
                });
                return merged;
              };

              let summarySource: any;
              if (selectedVersion === 'ALL' && selectedAscension === 'ALL') {
                summarySource = statsData.summary;
              } else if (selectedVersion !== 'ALL' && selectedAscension === 'ALL') {
                if (Array.isArray(selectedVersion)) {
                  const sources = selectedVersion.map(v => statsData.by_version?.summary?.[v] || {});
                  summarySource = mergeSummary(sources);
                } else {
                  summarySource = statsData.by_version?.summary?.[selectedVersion as any] || {};
                }
              } else if (selectedVersion === 'ALL' && selectedAscension !== 'ALL') {
                if (Array.isArray(selectedAscension)) {
                  const sources = selectedAscension.map(a => statsData.by_ascension?.summary?.[a] || {});
                  summarySource = mergeSummary(sources);
                } else {
                  summarySource = statsData.by_ascension?.summary?.[selectedAscension as any] || {};
                }
              } else {
                const vArr = Array.isArray(selectedVersion) ? selectedVersion : [selectedVersion];
                const aArr = Array.isArray(selectedAscension) ? selectedAscension : [selectedAscension];
                const sources: any[] = [];
                vArr.forEach(ver => {
                  aArr.forEach(asc => {
                    if (statsData.by_version_ascension?.summary?.[ver]?.[asc]) {
                      sources.push(statsData.by_version_ascension.summary[ver][asc]);
                    }
                  });
                });
                summarySource = mergeSummary(sources);
                if (Object.keys(summarySource).length === 0) {
                  summarySource = statsData.summary || {};
                }
              }

              if (activeChar === 'ALL') {
                return Object.values(summarySource).reduce((sum: number, char: any) => sum + (runType === 'single' ? char.total_runs_single : char.total_runs_multi), 0);
              }
              const charData = summarySource[activeChar];
              return charData ? (runType === 'single' ? charData.total_runs_single : charData.total_runs_multi) : 0;
            })()} | 対象カード数: {list.length}
          </div>
        </div>
        <div className="flex flex-col">
          {TIER_ROWS.map(tier => (
            <div key={tier.id} className="flex border-b border-[#1e293b] min-h-[105px] bg-[#0d0d12]">
              <div style={{ backgroundColor: tier.color }} className="w-20 flex items-center justify-center shrink-0 border-r border-[#000000]">
                <span className="text-xl font-black text-[#000000]">{tier.label}</span>
              </div>
              <div className="flex-1 p-3 flex flex-wrap gap-x-2 gap-y-6 content-start">
                {tierData[tier.id as keyof typeof tierData].map((card: any) => {
                  const api = cardInfoMap[card.id];
                  const image = api?.image_url || api?.image || '';
                  const color = getRarityColor(api?.rarity || '');
                  const costParts = getCostParts(api, false);
                  const imageUrl = formatImageUrl(image);
                  return (
                    <div key={card.id} className="relative w-16 h-[95px] flex flex-col">
                      <div className="relative w-full h-full overflow-hidden flex flex-col">
                        <div className="w-full aspect-square relative bg-[#1a1a24] shrink-0">
                          {imageUrl && imageUrl !== '' && (
                            <img 
                              src={imageUrl} 
                              alt="" 
                              className="w-full h-full object-contain" 
                              crossOrigin="anonymous"
                              onError={() => { /* Ignore errors */ }}
                            />
                          )}
                          <div className="cost-badge absolute top-0.5 left-0.5 z-30 w-4.5 h-4.5 bg-[#000000cc] rounded-full border border-[#ffffff4d] flex items-center justify-center overflow-hidden">
                            <span className="cost-text font-black italic block text-center" style={{ color, fontSize: '9px', width: '100%', lineHeight: '1', transform: 'translateY(0.5px)' }}>
                              {costParts.isStar ? `★${costParts.text}` : costParts.text}
                            </span>
                          </div>
                          <StarCostDiamond starCost={api?.star_cost} isXStarCost={api?.is_x_star_cost} size="small" />
                        </div>
                        <div className="flex-1 flex items-start justify-center px-0.5 pt-1 z-20 overflow-visible relative">
                          <p className="card-name-text font-bold text-[#ffffff] text-center uppercase break-words w-full" style={{ fontSize: '7.5px', lineHeight: '1.1', display: 'block', minHeight: '2.4em' }}>
                            {api?.name || card.id.replace('CARD.', '')}
                          </p>
                        </div>
                        <CardFrameStroke type={api?.type} color={color} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
