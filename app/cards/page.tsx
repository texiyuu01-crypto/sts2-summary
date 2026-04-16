"use client";

import React, { useEffect, useState } from 'react';

// スキーマに基づいた型定義
interface SpireCard {
  id: string;
  name: string;
  description: string; // 仕様書では 'text' ではなく 'description'
  cost: number;
  type: string;
  rarity: string;
  color: string;
  image_url: string;   // 仕様書に明記されているフィールド
  beta_image_url?: string;
}

export default function CardsPage() {
  const [allCards, setAllCards] = useState<SpireCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 陛下（Regent）のカードを日本語で取得
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 flex items-center justify-center font-bold italic">
        陛下「待て、今王立図書館からデータを引き出している...」
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <header className="max-w-5xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-black text-yellow-500 mb-4 italic">陛下専用カード名鑑</h1>
        <p className="text-slate-400 font-bold tracking-widest">～ Spire Codex API 仕様準拠版 ～</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allCards.map((card) => (
          <div 
            key={card.id} 
            className="bg-slate-800 border-2 border-slate-700 rounded-2xl overflow-hidden hover:border-yellow-500 transition-all group shadow-2xl flex flex-col"
          >
            {/* 画像エリア: 仕様書の image_url を使用 */}
            <div className="relative aspect-[4/3] bg-black overflow-hidden border-b border-slate-700 flex items-center justify-center">
              {card.image_url ? (
                <img 
                  src={card.image_url} 
                  alt={card.name}
                  className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // 万が一画像URLが切れている場合の対策
                    (e.target as HTMLImageElement).src = "https://spire-codex.com/assets/images/card_back_regent.png";
                  }}
                />
              ) : (
                <div className="text-slate-600 italic text-sm">No Image Provided</div>
              )}
              
              <div className="absolute top-2 right-2 bg-slate-900/90 text-yellow-400 text-lg font-black w-10 h-10 flex items-center justify-center rounded-full border-2 border-yellow-500 shadow-lg">
                {card.cost}
              </div>
            </div>

            {/* 情報エリア */}
            <div className="p-5 flex-grow flex flex-col bg-gradient-to-b from-slate-800 to-slate-900">
              <h2 className="font-bold text-xl text-white group-hover:text-yellow-400 transition-colors mb-2">
                [[{card.name}]]
              </h2>

              <div className="flex gap-2 mb-4">
                <span className="text-[10px] uppercase font-black px-2 py-1 rounded bg-slate-700 text-slate-300 border border-slate-600">
                  {card.rarity}
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-1 rounded bg-slate-700 text-slate-300 border border-slate-600">
                  {card.type}
                </span>
              </div>
              
              {/* 仕様書の description フィールドを使用 */}
              <div 
                className="text-sm text-slate-300 leading-relaxed italic mt-auto border-t border-slate-700 pt-3"
                dangerouslySetInnerHTML={{ 
                  __html: (card.description || "効果テキストなし")
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-slate-600 text-xs py-10 border-t border-slate-800">
        <p>API Endpoint: GET /api/cards</p>
        <p className="mt-2 tracking-widest uppercase">Data & Images provided by Spire Codex</p>
      </footer>
    </main>
  );
}