"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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
  const [selectedCard, setSelectedCard] = useState<SpireCard | null>(null);

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

  const formatImageUrl = (url: string) => {
    if (!url) return "https://spire-codex.com/assets/images/card_back_regent.png";
    if (url.startsWith('http')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `https://spire-codex.com${cleanPath}`;
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">召喚中...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      <nav className="max-w-6xl mx-auto mb-8">
        <Link href="/" className="text-yellow-500 hover:text-yellow-400 font-bold">← 帰還する</Link>
      </nav>

      <header className="max-w-5xl mx-auto mb-12 text-center">
        <h1 className="text-3xl font-black text-yellow-500 italic">陛下専用カード名鑑</h1>
      </header>

      {/* グリッド: カードを小さく表示 (grid-cols-3 ～ 6) */}
      <div className="max-w-7xl mx-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {allCards.map((card) => (
          <div 
            key={card.id} 
            onClick={() => setSelectedCard(card)}
            className="cursor-pointer bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-yellow-500 hover:scale-105 transition-all group"
          >
            <div className="relative aspect-[3/4] bg-black">
              <img 
                src={formatImageUrl(card.image_url)} 
                alt={card.name}
                className="object-contain w-full h-full"
              />
              <div className="absolute top-1 right-1 bg-slate-900/90 text-yellow-400 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border border-yellow-500">
                {card.cost}
              </div>
            </div>
            <div className="p-1 text-center bg-slate-800">
              <p className="text-[10px] truncate font-bold">{card.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 拡大モーダル */}
      {selectedCard && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="bg-slate-900 border-2 border-yellow-500 rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] bg-black">
              <img src={formatImageUrl(selectedCard.image_url)} alt={selectedCard.name} className="object-contain w-full h-full" />
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-2 right-2 text-white bg-black/50 w-8 h-8 rounded-full"
              >✕</button>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-yellow-500 mb-2">[[{selectedCard.name}]]</h2>
              <div className="flex gap-2 mb-4">
                <span className="text-xs px-2 py-1 rounded bg-slate-700">{selectedCard.rarity}</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-700">{selectedCard.type}</span>
              </div>
              <p className="text-slate-300 italic border-t border-slate-700 pt-4" dangerouslySetInnerHTML={{ __html: selectedCard.description }} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}