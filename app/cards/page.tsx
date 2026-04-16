import React from 'react';

// APIから取得するデータの型定義
interface SpireCard {
  id: string;
  name: string;
  color: string;
  type: string;
  rarity: string;
  cost: string;
  text: string;
}

export default async function CardsPage() {
  // 1. Spire Codex APIからリージェント（陛下）のカードを取得
  // ?lang=jpn で日本語、color=regent で陛下専用カードを指定
  const res = await fetch('https://spire-codex.com/api/cards?color=regent&lang=jpn', {
    next: { revalidate: 3600 } // 1時間ごとにデータを更新
  });
  
  const allCards: SpireCard[] = await res.json();

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <header className="max-w-5xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-black text-yellow-500 mb-4">陛下専用カード名鑑</h1>
        <p className="text-slate-400">王立図書館に記録された、リージェントの全カードデータ</p>
      </header>

      {/* カードリストのグリッド表示 */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allCards.map((card) => (
          <div 
            key={card.id} 
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-yellow-500 transition-colors group shadow-lg"
          >
            {/* カードの上部（名前・コスト） */}
            <div className="p-4 bg-slate-700/50 flex justify-between items-center border-b border-slate-700">
              <h2 className="font-bold text-lg text-white group-hover:text-yellow-400">
                [[{card.name}]]
              </h2>
              <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                Cost: {card.cost === "-1" ? "X" : card.cost}
              </span>
            </div>

            {/* カードの中身 */}
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  card.rarity === 'Rare' ? 'bg-orange-900 text-orange-300' :
                  card.rarity === 'Uncommon' ? 'bg-blue-900 text-blue-300' : 'bg-slate-600 text-slate-300'
                }`}>
                  {card.rarity}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                  {card.type}
                </span>
              </div>
              
              {/* APIから取得した説明文を表示（HTMLタグが含まれる場合を考慮） */}
              <p 
                className="text-sm text-slate-300 leading-relaxed italic"
                dangerouslySetInnerHTML={{ __html: card.text.replace(/\[|\]/g, '') }}
              />
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-slate-600 text-xs">
        Data provided by Spire Codex API
      </footer>
    </main>
  );
}