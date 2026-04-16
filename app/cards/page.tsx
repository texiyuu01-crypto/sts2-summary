import React from 'react';

interface SpireCard {
  id: string;
  name: string;
  color: string;
  type: string;
  rarity: string;
  cost: string;
  text: string;
  image_url?: string; // 画像URL用のフィールドを追加
}

export default async function CardsPage() {
  // 画像を含むデータを取得するために color と lang を指定
  const res = await fetch('https://spire-codex.com/api/cards?color=regent&lang=jpn', {
    next: { revalidate: 3600 }
  });
  
  const allCards: SpireCard[] = await res.json();

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <header className="max-w-5xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-black text-yellow-500 mb-4 italic">陛下専用カード名鑑</h1>
        <p className="text-slate-400 font-bold tracking-widest">～ 王立図書館に刻まれしリージェントの力 ～</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allCards.map((card) => (
          <div 
            key={card.id} 
            className="bg-slate-800 border-2 border-slate-700 rounded-2xl overflow-hidden hover:border-yellow-500 transition-all group shadow-2xl flex flex-col"
          >
            {/* カード画像エリア：APIから画像URLを取得して表示 */}
            <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden border-b border-slate-700">
              <img 
                src={card.image_url || `https://spire-codex.com/images/cards/${card.id}.webp`} 
                alt={card.name}
                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                onError={(e) => {
                  // 画像がない場合のフォールバック（代わりの画像）
                  (e.target as HTMLImageElement).src = "https://spire-codex.com/images/cards/placeholder.webp";
                }}
              />
              <div className="absolute top-2 right-2 bg-yellow-600 text-white text-sm font-black w-8 h-8 flex items-center justify-center rounded-full shadow-lg border border-yellow-400">
                {card.cost === "-1" ? "X" : (card.cost ?? "?")}
              </div>
            </div>

            {/* カード情報エリア */}
            <div className="p-5 flex-grow flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h2 className="font-bold text-xl text-white group-hover:text-yellow-400 transition-colors">
                  [[{card.name || "不明なカード"}]]
                </h2>
              </div>

              <div className="flex gap-2 mb-4">
                <span className={`text-[10px] uppercase font-black px-2 py-1 rounded shadow-sm ${
                  card.rarity === 'Rare' ? 'bg-orange-600 text-white' :
                  card.rarity === 'Uncommon' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-100'
                }`}>
                  {card.rarity || 'Common'}
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-1 rounded bg-slate-700 text-slate-300 border border-slate-600">
                  {card.type || 'Unknown'}
                </span>
              </div>
              
              <div 
                className="text-sm text-slate-300 leading-relaxed italic mt-auto border-t border-slate-700 pt-3"
                dangerouslySetInnerHTML={{ 
                  __html: (card.text || "効果テキスト解析中...").replace(/\[|\]/g, '') 
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-slate-600 text-xs py-10 border-t border-slate-800">
        陛下「フハハ！この美しい肖像画を見よ！余の威光が画面越しに伝わるであろう！」<br />
        <span className="mt-2 block tracking-widest">Data & Images provided by Spire Codex API</span>
      </footer>
    </main>
  );
}