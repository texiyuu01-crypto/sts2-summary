import React from 'react';
import fs from 'fs';
import path from 'path';
import StatsGrid from './StatsGrid';

// --- page.tsx から継承した説明文パース関数 ---
function parseDescription(card: any) {
  let desc = card.description_raw || card.description || "";
  
  // 変数置換 (!d!, !b!等)
  if (card.vars) {
    Object.entries(card.vars).forEach(([key, value]: [string, any]) => {
      const val = Array.isArray(value) ? value[0] : value;
      desc = desc.replace(new RegExp(`!${key}!`, 'g'), `<b>${val}</b>`);
    });
  }

  // 特殊タグを HTML <b> に変換 (spire-descスタイル用)
  desc = desc
    .replace(/<name>.*?<\/name>/g, '')
    .replace(/\[\w+\]/g, (m) => `<b class="text-yellow-400">${m}</b>`)
    .replace(/<[^>]*>(.*?)<\/[^>]*>/g, '<b>$1</b>')
    .replace(/\n/g, '<br/>');

  return desc.trim();
}

// 勝率に基づいたティア判定ロジック
const getTier = (winRate: number) => {
  if (winRate >= 45) return { label: 'S', color: '#ff1f1f' };
  if (winRate >= 35) return { label: 'A', color: '#ff8c00' };
  if (winRate >= 28) return { label: 'B', color: '#ffd700' };
  return { label: 'C', color: '#4ade80' };
};

// --- 画像とフレーム用ヘルパー (cards ページに合わせる) ---
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

export default async function TierPage() {
  const filePath = path.join(process.cwd(), 'src/data/tier_stats.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const statsData = JSON.parse(fileContents);

  // APIから日本語名・説明文を取得 (キャッシュ利用)
  let cardInfoMap: Record<string, any> = {};
  try {
    const res = await fetch('https://spire-codex.com/api/cards?lang=jpn');
    const allCardsApi = await res.json();
    allCardsApi.forEach((card: any) => {
      const baseId = card.id.replace('CARD.', '');
      cardInfoMap[baseId] = card;
      cardInfoMap[`CARD.${baseId}`] = card;
    });
  } catch (e) { console.error("API Error", e); }

  return (
    <main className="min-h-screen bg-[#020617] text-[#cbd5e1] p-8 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        .spire-desc b { color: #fde047; font-weight: 800; }
        .card-inner-shadow { box-shadow: inset 0 0 20px rgba(0,0,0,0.6); }
        .tier-glow { text-shadow: 0 0 10px currentColor; }
      `}} />

      <div className="max-w-7xl mx-auto">
        <header className="mb-16 border-b border-slate-800 pb-8">
          <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
            Slay the Spire 2 <br/>
            <span className="text-blue-500">Tier Statistics</span>
          </h1>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Data Source: Spire Codex / Last Updated: {statsData.updated_at || "2026-04-19"}
          </p>
        </header>

        <StatsGrid statsData={statsData} cardInfoMap={cardInfoMap} />
      </div>
    </main>
  );
}