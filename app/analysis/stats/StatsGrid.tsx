"use client";

import React, { useEffect, useState, useRef } from 'react';

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
  if (!url) return 'https://spire-codex.com/assets/images/card_back_regent.png';
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

export default function StatsGrid({ statsData, cardInfoMap }: { statsData: any, cardInfoMap: Record<string, any> }) {
  const [versions, setVersions] = useState<string[]>([]);
  const [ascensions, setAscensions] = useState<string[]>([]);
  // allow multiple version selections: 'ALL' or string[] of choices
  const [selectedVersion, setSelectedVersion] = useState<string[] | 'ALL'>('ALL');
  // allow multiple ascension selections: 'ALL' or string[] of choices
  const [selectedAscension, setSelectedAscension] = useState<string[] | 'ALL'>('ALL');

  const resolveCardsSource = (version?: string[] | 'ALL', asc?: string[] | 'ALL') => {
    const v = version ?? selectedVersion;
    const a = asc ?? selectedAscension;
    console.log('resolveCardsSource called with v:', v, 'a:', a);
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
      console.log('Returning all cards from statsData.cards');
      return statsData.cards || {};
    }

    // if ascension is array (multiple) merge corresponding ascension groups
    const resolveAscGroup = (ascSel: string[] | 'ALL') => {
      if (ascSel === 'ALL') return null;
      const arr = Array.isArray(ascSel) ? ascSel : [ascSel];
      const groups = arr.map(x => (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[x]) || {});
      console.log('resolveAscGroup for', arr, 'groups:', groups.map(g => g ? Object.keys(g) : 'null'));
      return mergeGroups(groups);
    };

    // if version is array (multiple) merge corresponding version groups
    const resolveVerGroup = (verSel: string[] | 'ALL') => {
      if (verSel === 'ALL') return null;
      const arr = Array.isArray(verSel) ? verSel : [verSel];
      const groups = arr.map(x => (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[x]) || {});
      console.log('resolveVerGroup for', arr, 'groups:', groups.map(g => g ? Object.keys(g) : 'null'));
      return mergeGroups(groups);
    };

    if (v !== 'ALL' && a === 'ALL') {
      console.log('Path: version only');
      const verGroup = resolveVerGroup(v);
      const result = verGroup || (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[v as any]) || {};
      console.log('Result keys:', Object.keys(result));
      return result;
    }

    if (v === 'ALL' && a !== 'ALL') {
      console.log('Path: ascension only');
      const ascGroup = resolveAscGroup(a);
      const result = ascGroup || (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[a as any]) || {};
      console.log('Result keys:', Object.keys(result));
      return result;
    }

    // both specified: merge from by_version_ascension if available, otherwise intersect by_version and by_ascension
    if (v !== 'ALL' && a !== 'ALL') {
      console.log('Path: both version and ascension specified');
      const vArr = Array.isArray(v) ? v : [v];
      const aArr = Array.isArray(a) ? a : [a];
      console.log('vArr:', vArr, 'aArr:', aArr);
      
      // First try by_version_ascension
      const groups: any[] = [];
      vArr.forEach(ver => {
        aArr.forEach(asc => {
          if (statsData.by_version_ascension && statsData.by_version_ascension.cards && statsData.by_version_ascension.cards[ver] && statsData.by_version_ascension.cards[ver][asc]) {
            groups.push(statsData.by_version_ascension.cards[ver][asc]);
          }
        });
      });
      console.log('Groups from by_version_ascension:', groups.length);
      const merged = mergeGroups(groups);
      if (Object.keys(merged).length > 0) {
        console.log('Returning merged from by_version_ascension');
        return merged;
      }
      
      // Fallback: intersect by_version and by_ascension data
      console.log('by_version_ascension not available, intersecting by_version and by_ascension');
      const verGroup = resolveVerGroup(v);
      const ascGroup = resolveAscGroup(a);
      
      if (verGroup && ascGroup) {
        console.log('Intersecting version and ascension groups');
        const intersected: Record<string, any> = {};
        Object.entries(verGroup).forEach(([char, verCards]: any) => {
          if (ascGroup[char]) {
            intersected[char] = {};
            Object.entries(verCards).forEach(([cardId, verStats]: any) => {
              if (ascGroup[char][cardId]) {
                // Merge stats from both sources (take min for appeared to avoid double counting)
                const ascStats = ascGroup[char][cardId];
                const mergedStats: any = { ...verStats };
                Object.keys(verStats).forEach(key => {
                  const vVal = verStats[key];
                  const aVal = ascStats[key];
                  if (typeof vVal === 'number' && typeof aVal === 'number') {
                    // For appeared/appeared_single/appeared_multi, take min to avoid double counting
                    if (key.includes('appeared')) {
                      mergedStats[key] = Math.min(vVal, aVal);
                    } else {
                      mergedStats[key] = vVal; // Use version stats for other fields
                    }
                  }
                });
                intersected[char][cardId] = mergedStats;
              }
            });
          }
        });
        console.log('Intersected result keys:', Object.keys(intersected));
        if (Object.keys(intersected).length > 0) {
          return intersected;
        }
      }
    }

    // Fallback for single selections (not arrays)
    if (v !== 'ALL' && a === 'ALL' && !Array.isArray(v)) {
      console.log('Fallback: single version selection');
      return (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[v as any]) || {};
    }
    if (v === 'ALL' && a !== 'ALL' && !Array.isArray(a)) {
      console.log('Fallback: single ascension selection');
      return (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[a as any]) || {};
    }
    
    // Default to all cards
    console.log('Default: returning all cards');
    return statsData.cards || {};
  };

  const rawChars = Object.keys(resolveCardsSource());
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
  const [activeChar, setActiveChar] = useState<string>(chars[0] || '');
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
    const cardsSource = resolveCardsSource();
    const pickCountsFrom = (st: any) => {
      // Get metrics based on run type
      if (runType === 'single') {
        const picked = st.picked_single ?? st.picked_count ?? 0;
        const wins = st.picked_single_wins ?? st.picked_wins ?? 0;
        const appeared = st.appeared_single ?? st.appeared ?? 0;
        const final = st.final_count ?? 0;
        const finalWins = st.final_wins ?? 0;
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
        const picked = st.picked_multi ?? st.picked_count ?? 0;
        const wins = st.picked_multi_wins ?? st.picked_wins ?? 0;
        const appeared = st.appeared_multi ?? st.appeared ?? 0;
        const final = st.final_count ?? 0;
        const finalWins = st.final_wins ?? 0;
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
    // cardsSource already resolved above
    if (activeChar === 'ALL') {
      const map: Record<string, any> = {};
      Object.values(cardsSource).forEach((group: any) => {
        Object.entries(group).forEach(([id, st]: any) => {
          const counts = pickCountsFrom(st);
          if (!map[id]) map[id] = { ...st, picked: counts.picked, wins: counts.wins, appeared: counts.appeared, final: counts.final, finalWins: counts.finalWins, floor1Picked: counts.floor1Picked, floor1PickedWins: counts.floor1PickedWins, floor1Appeared: counts.floor1Appeared, floor2Picked: counts.floor2Picked, floor2PickedWins: counts.floor2PickedWins, floor2Appeared: counts.floor2Appeared, floor3Picked: counts.floor3Picked, floor3PickedWins: counts.floor3PickedWins, floor3Appeared: counts.floor3Appeared };
          else { map[id].picked += counts.picked; map[id].wins += counts.wins; map[id].appeared += counts.appeared; map[id].final += counts.final; map[id].finalWins += counts.finalWins; map[id].floor1Picked += counts.floor1Picked; map[id].floor1PickedWins += counts.floor1PickedWins; map[id].floor1Appeared += counts.floor1Appeared; map[id].floor2Picked += counts.floor2Picked; map[id].floor2PickedWins += counts.floor2PickedWins; map[id].floor2Appeared += counts.floor2Appeared; map[id].floor3Picked += counts.floor3Picked; map[id].floor3PickedWins += counts.floor3PickedWins; map[id].floor3Appeared += counts.floor3Appeared; }
        });
      });
      return Object.entries(map).map(([id, st]: any) => ({ 
        id, 
        ...st, 
        pickWr: st.picked ? (st.wins / st.picked) * 100 : 0,
        pickRate: st.appeared ? (st.picked / st.appeared) * 100 : 0,
        finalWr: st.final ? (st.finalWins / st.final) * 100 : 0,
        finalRate: st.appeared ? (st.final / st.appeared) * 100 : 0,
        floor1PickRate: st.floor1Appeared ? (st.floor1Picked / st.floor1Appeared) * 100 : 0,
        floor1PickWr: st.floor1Picked ? (st.floor1PickedWins / st.floor1Picked) * 100 : 0,
        floor2PickRate: st.floor2Appeared ? (st.floor2Picked / st.floor2Appeared) * 100 : 0,
        floor2PickWr: st.floor2Picked ? (st.floor2PickedWins / st.floor2Picked) * 100 : 0,
        floor3PickRate: st.floor3Appeared ? (st.floor3Picked / st.floor3Appeared) * 100 : 0,
        floor3PickWr: st.floor3Picked ? (st.floor3PickedWins / st.floor3Picked) * 100 : 0
      }));
    }
    const group = cardsSource[activeChar] || {};
    return Object.entries(group).map(([id, st]: any) => {
      const counts = pickCountsFrom(st);
      return ({ 
        id, 
        ...st, 
        picked: counts.picked, 
        wins: counts.wins, 
        appeared: counts.appeared,
        final: counts.final,
        finalWins: counts.finalWins,
        pickWr: counts.picked ? (counts.wins / counts.picked) * 100 : 0,
        pickRate: counts.appeared ? (counts.picked / counts.appeared) * 100 : 0,
        finalWr: counts.final ? (counts.finalWins / counts.final) * 100 : 0,
        finalRate: counts.appeared ? (counts.final / counts.appeared) * 100 : 0,
        floor1PickRate: counts.floor1Appeared ? (counts.floor1Picked / counts.floor1Appeared) * 100 : 0,
        floor1PickWr: counts.floor1Picked ? (counts.floor1PickedWins / counts.floor1Picked) * 100 : 0,
        floor2PickRate: counts.floor2Appeared ? (counts.floor2Picked / counts.floor2Appeared) * 100 : 0,
        floor2PickWr: counts.floor2Picked ? (counts.floor2PickedWins / counts.floor2Picked) * 100 : 0,
        floor3PickRate: counts.floor3Appeared ? (counts.floor3Picked / counts.floor3Appeared) * 100 : 0,
        floor3PickWr: counts.floor3Picked ? (counts.floor3PickedWins / counts.floor3Picked) * 100 : 0
      });
    });
  };

  let list = getList().filter((c: any) => c.picked >= 3);
  
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

  return (
    <div>
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
              <div className="absolute z-40 mt-1 right-0 w-48 max-h-64 overflow-auto bg-[#02111b] border border-[#ffffff1a] p-2 rounded-sm shadow-lg">
                <div className="mb-2 pb-2 border-b border-slate-800">
                  <p className="text-[8px] text-slate-400 mb-1">各指標の定義:</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Pick勝率: ピックしたランの勝率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Pick率: 提示されたランに対するピック率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Final勝率: 最終デッキに含まれていたランの勝率</p>
                  <p className="text-[8px] text-slate-500 leading-tight">• Final所持率: 提示されたランに対する最終デッキ所持率</p>
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
              <div className="absolute z-40 mt-1 right-0 w-40 max-h-48 overflow-auto bg-[#02111b] border border-[#ffffff1a] p-2 rounded-sm shadow-lg">
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
              <div className="absolute z-40 mt-1 right-0 w-40 max-h-48 overflow-auto bg-[#02111b] border border-[#ffffff1a] p-2 rounded-sm shadow-lg">
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
        <p className="text-[10px] text-slate-500">
          ※ 累計で3回以上ピックされたカードのみ表示しています。
          <br/>
          • Pick: ピックしたラン数 / Win: 勝利回数 / Final: 最終デッキに含まれていたラン数 / Appear: 提示されたラン数（1ランにつき1回カウント）
        </p>
        <p className="text-[10px] text-slate-400">
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
              
              // If by_version_ascension.summary is empty, intersect by_version.summary and by_ascension.summary
              if (Object.keys(summarySource).length === 0) {
                const verSummaries = vArr.map(v => statsData.by_version?.summary?.[v] || {});
                const ascSummaries = aArr.map(a => statsData.by_ascension?.summary?.[a] || {});
                const mergedVer = mergeSummary(verSummaries);
                const mergedAsc = mergeSummary(ascSummaries);
                
                // Intersect: take min of runs for each character
                const intersected: Record<string, any> = {};
                Object.keys(mergedVer).forEach(char => {
                  if (mergedAsc[char]) {
                    intersected[char] = {
                      total_runs_single: Math.min(mergedVer[char].total_runs_single || 0, mergedAsc[char].total_runs_single || 0),
                      total_runs_multi: Math.min(mergedVer[char].total_runs_multi || 0, mergedAsc[char].total_runs_multi || 0)
                    };
                  }
                });
                summarySource = intersected;
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
                  <img src={formatImageUrl(image)} alt={api?.name || card.id} className="w-full h-full object-contain" />
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
    </div>
  );
}
