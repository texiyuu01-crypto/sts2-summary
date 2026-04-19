"use client";

import React, { useEffect, useState, useRef } from 'react';

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
  let parsed = text
    .replace(/\n/g, '<br/>')
    .replace(/\[gold\](.*?)\[\/gold\]/gi, '<span style="color: #fde047; font-weight: bold;">$1</span>')
    .replace(/\[relic\](.*?)\[\/relic\]/gi, '<span style="color: #fb7185; font-weight: bold;">$1</span>')
    .replace(/\[kw\](.*?)\[\/kw\]/gi, '<span style="color: #ffffff; font-weight: 800; border-bottom: 1px dashed #666;">$1</span>')
    .replace(/\[energy\]/gi, '⚡️');
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

const CHARACTER_ORDER = ["ironclad", "silent", "regent", "necrobinder", "defect"];

export default function StatsGrid({ statsData, cardInfoMap }: { statsData: any, cardInfoMap: Record<string, any> }) {
  const [versions, setVersions] = useState<string[]>([]);
  const [ascensions, setAscensions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('ALL');
  // allow multiple ascension selections: 'ALL' or string[] of choices
  const [selectedAscension, setSelectedAscension] = useState<string[] | 'ALL'>('ALL');

  const resolveCardsSource = (version?: string, asc?: string) => {
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
    if (v === 'ALL' && a === 'ALL') return statsData.cards || {};

    // if ascension is array (multiple) merge corresponding ascension groups
    const resolveAscGroup = (ascSel: string[] | 'ALL') => {
      if (ascSel === 'ALL') return null;
      const arr = Array.isArray(ascSel) ? ascSel : [ascSel];
      const groups = arr.map(x => (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[x]) || {});
      return mergeGroups(groups);
    };

    if (v !== 'ALL' && a === 'ALL') return (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[v]) || {};

    if (v === 'ALL' && a !== 'ALL') {
      const ascGroup = resolveAscGroup(a as any);
      return ascGroup || (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[a as any]) || {};
    }

    // both specified: if asc is array merge from by_version_ascension if available per asc, otherwise fallback
    if (v !== 'ALL' && a !== 'ALL') {
      if (Array.isArray(a)) {
        const groups = a.map(x => (statsData.by_version_ascension && statsData.by_version_ascension.cards && statsData.by_version_ascension.cards[v] && statsData.by_version_ascension.cards[v][x]) || {});
        const merged = mergeGroups(groups);
        if (Object.keys(merged).length > 0) return merged;
      } else {
        if (statsData.by_version_ascension && statsData.by_version_ascension.cards && statsData.by_version_ascension.cards[v] && statsData.by_version_ascension.cards[v][a]) {
          return statsData.by_version_ascension.cards[v][a];
        }
      }
    }

    return (statsData.by_version && statsData.by_version.cards && statsData.by_version.cards[v]) || (statsData.by_ascension && statsData.by_ascension.cards && statsData.by_ascension.cards[a as any]) || {};
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
  const [charactersMeta, setCharactersMeta] = useState<Record<string, any>>({});
  const [runType, setRunType] = useState<'single'|'multi'>('single');
  const [includeColorless, setIncludeColorless] = useState(false);
  const [includeOtherChar, setIncludeOtherChar] = useState(false);
  const [ascOpen, setAscOpen] = useState(false);

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
    // defaults: ALL & A10 if present
    setSelectedVersion('ALL');
    if (sortedA.includes('A10')) setSelectedAscension(['A10']);
    else if (sortedA.length > 0) setSelectedAscension([sortedA[0]]);
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
      if (runType === 'single') {
        const picked = st.picked_single ?? st.picked ?? 0;
        const wins = st.wins_single ?? st.wins ?? 0;
        const appeared = st.appeared_single ?? st.appeared ?? 0;
        return { picked, wins, appeared };
      } else {
        const picked = st.picked_multi ?? st.picked ?? 0;
        const wins = st.wins_multi ?? st.wins ?? 0;
        const appeared = st.appeared_multi ?? st.appeared ?? 0;
        return { picked, wins, appeared };
      }
    };
    // cardsSource already resolved above
    if (activeChar === 'ALL') {
      const map: Record<string, any> = {};
      Object.values(cardsSource).forEach((group: any) => {
        Object.entries(group).forEach(([id, st]: any) => {
          const counts = pickCountsFrom(st);
          if (!map[id]) map[id] = { ...st, picked: counts.picked, wins: counts.wins, appeared: counts.appeared };
          else { map[id].picked += counts.picked; map[id].wins += counts.wins; map[id].appeared += counts.appeared; }
        });
      });
      return Object.entries(map).map(([id, st]: any) => ({ id, ...st, wr: st.picked ? (st.wins / st.picked) * 100 : 0 }));
    }
    const group = cardsSource[activeChar] || {};
    return Object.entries(group).map(([id, st]: any) => {
      const counts = pickCountsFrom(st);
      return ({ id, ...st, picked: counts.picked, wins: counts.wins, appeared: counts.appeared, wr: counts.picked ? (counts.wins / counts.picked) * 100 : 0 });
    });
  };

  let list = getList().filter((c: any) => c.picked >= 3).sort((a: any, b: any) => b.wr - a.wr);

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
          <label className="text-[9px] font-bold">バージョン:</label>
          <select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)} className="text-[9px] bg-[#071021] border border-[#ffffff1a] px-2 py-1 rounded-sm">
            {versions.map(v => (<option key={v} value={v}>{v === 'ALL' ? '全て' : v}</option>))}
          </select>
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

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {list.map((card: any) => {
          const api = cardInfoMap[card.id];
          const image = api?.image_url || api?.image || '';
          const color = getRarityColor(api?.rarity || '');
          return (
            <div key={card.id} className="group relative flex flex-col transition-transform hover:scale-110 hover:z-50 bg-[#071021] border border-[#0f172a] rounded-sm overflow-hidden" onMouseEnter={(e) => { setHovered({ api, stat: card }); updatePos(e); }} onMouseMove={updatePos} onMouseLeave={() => setHovered(null)} onClick={(e) => { setHovered({ api, stat: card }); updatePos(e); }} onTouchStart={(e) => { setHovered({ api, stat: card }); updatePos(e); }}>
              <div className="relative aspect-[1/1.32] w-full flex flex-col pointer-events-none overflow-hidden">
                <div className="w-full aspect-square relative bg-[#0f172a] border border-[#ffffff0d] flex items-center justify-center">
                  <img src={formatImageUrl(image)} alt={api?.name || card.id} className="w-full h-full object-contain" />
                  <div className="cost-badge absolute top-1 left-1 z-30 w-4.5 h-4.5 bg-[#000000cc] border border-[#ffffff4d] rounded-full flex items-center justify-center">
                    <span className="cost-text font-black italic block text-center" style={{ color, fontSize: '9px' }}>{api?.cost === -1 ? 'X' : (api?.cost ?? '?')}</span>
                  </div>
                </div>
                <div className="flex-1 flex items-start justify-center px-1 pt-1.5">
                  <p className="card-name-text text-[7px] font-black text-white text-center uppercase break-words w-full">{api?.name || card.id.replace('CARD.', '')}</p>
                </div>
                <CardFrameStroke type={api?.type} color={color} />
              </div>

              <div className="p-2 bg-black/30 border-t border-slate-800">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Win Rate</span>
                  <span className="text-sm font-mono font-bold text-green-400">{card.wr.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-green-400 transition-all duration-1000" style={{ width: `${card.wr}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>Pick: {card.picked}</span>
                  <span>Win: {card.wins}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hovered && hovered.api && (() => {
              // compute tooltip style: on narrow screens place top center
              const tooltipWidth = 320;
              const isNarrow = typeof window !== 'undefined' && window.innerWidth < 640;
              let style: any = {};
              if (isNarrow) {
                style.left = Math.max(8, (window.innerWidth - tooltipWidth) / 2);
                style.top = 8;
                style.position = 'fixed';
                style.width = `${Math.min(tooltipWidth, window.innerWidth - 16)}px`;
              } else {
                style.left = mousePos.x;
                style.top = mousePos.y;
                style.position = 'fixed';
                style.width = `${tooltipWidth}px`;
              }
              return (
                <div ref={tooltipRef} className="fixed z-[9999] p-3 rounded-sm bg-[#020617] border border-[#1e293b] text-sm text-slate-200 shadow-2xl" style={style}>
                  <div className="text-xs text-slate-400 mb-1 uppercase">{hovered.api.name}</div>
                  <div className="p-2 bg-[#07121a] rounded-sm mb-2">
                    <div className="text-[11px] text-[#cbd5e1] leading-relaxed spire-desc" dangerouslySetInnerHTML={{ __html: parseDescription(hovered.api, false) }} />
                  </div>
                  {hovered.api.upgrade && (
                    <div className="p-2 bg-[#020617] rounded-sm border-t border-[#0f172a]">
                      <div className="text-[10px] text-[#7cfc00] font-black mb-1">UPGRADED +</div>
                      <div className="text-[11px] text-[#cbd5e1] leading-relaxed spire-desc" dangerouslySetInnerHTML={{ __html: parseDescription(hovered.api, true) }} />
                    </div>
                  )}
                </div>
              );
            })()}
    </div>
  );
}
