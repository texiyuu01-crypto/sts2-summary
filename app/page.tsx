export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-slate-900 text-white">
      <h1 className="text-4xl font-bold mb-8">スレスパ2 まとめ（仮）</h1>
      
      <div className="bg-slate-800 p-6 rounded-lg border-2 border-yellow-600 max-w-2xl">
        <p className="text-yellow-400 font-bold">リージェント：</p>
        <p className="mb-4">「フハハ！このサイトこそが、塔の真理を解き明かす王の書庫である！」</p>
        
        <p className="text-green-400 font-bold">サイレント：</p>
        <p className="italic">「……まだ『Hello World』しか書いてないけど。無駄な自信。」</p>
      </div>

      <div className="mt-12 text-gray-400 text-sm">
        現在、5chの反応と統計データを解析中...
      </div>
    </main>
  );
}