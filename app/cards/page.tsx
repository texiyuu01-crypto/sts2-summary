"use client";

import React, { useEffect, useState } from 'react';

interface SpireCard {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: string;
  rarity: string;
  image_url: string;
}

export default function CardsPage() {
  const [allCards, setAllCards] = useState<SpireCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://spire-codex.com/api/cards?color=regent&lang=jpn')
      .then(res => res.json())
      .then(data => {
        setAllCards(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("API Error:", err);
        setLoading(false);
      });
  }, []);

  // 画像URLを確実に Spire Codex のドメインに向ける関数
  const formatImageUrl = (url: string) => {
    if (!url) return "https://spire-codex.com/assets/images/card_back_regent.png";
    
    // すでにフルパスの場合はそのまま
    if (url.startsWith('http')) return url;

    // ログにあった "static/images/cards/..." の形式を
    // "https://spire-codex.com/static/images/cards/..." に変換
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `https://spire-codex.com${cleanPath}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 flex items-center justify-center font-bold italic">
        陛下「王立図書館の回線が細いようだな...」
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <header className="max-w-5xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-black text-yellow-500 mb-4 italic">陛下専用カード名鑑</h1>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allCards.map((card) => (
          <div key={card.id} className="bg-slate-800 border-2 border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="relative aspect-[4/3] bg-black border-b border-slate-700 flex items-center justify-center">
              <img 
                src={formatImageUrl(card.image_url)} 
                alt={card.name}
                className="object-contain w-full h-full"
                onError={(e) => {
                  // バックアップ：それでも404なら、IDベースの直接リンクを試す
                  const target = e.target as HTMLImageElement;
                  const fallbackUrl = `https://spire-codex.com/static/images/cards/${card.id}.webp`;
                  if (target.src !== fallbackUrl) {
                    target.src = fallbackUrl;
                  } else {
                    target.src = "https://spire-codex.com/assets/images/card_back_regent.png";
                  }
                }}
              />
              <div className="absolute top-2 right-2 bg-slate-900/90 text-yellow-400 text-lg font-black w-10 h-10 flex items-center justify-center rounded-full border-2 border-yellow-500">
                {card.cost}
              </div>
            </div>

            <div className="p-5 flex-grow">
              <h2 className="font-bold text-xl text-white mb-2">[[{card.name}]]</h2>
              <div className="flex gap-2 mb-4">
                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-700 text-slate-300">{card.rarity}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-700 text-slate-300">{card.type}</span>
              </div>
              <div 
                className="text-sm text-slate-300 leading-relaxed italic border-t border-slate-700 pt-3"
                dangerouslySetInnerHTML={{ __html: card.description }}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}