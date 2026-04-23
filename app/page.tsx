"use client";

import Link from 'next/link';

export default function Home() {
  // ツール・データベース系
  const tools = [
    {
      id: 'cards',
      title: 'Tier メーカー (カード一覧)',
      description: '全カードの閲覧と、自分だけの Tier表作成・書き出し',
      category: 'DATABASE / TOOL',
      path: '/cards',
      icon: '📖',
      status: 'published',
      color: 'border-yellow-500 shadow-yellow-500/10'
    },
    {
      id: 'tier-stats', // IDを変更
      title: '勝率・採用率統計レポート', // 件名を変更
      description: '5,000件超のRunデータから導き出した最新Tier', // 説明文を更新
      category: 'STATISTICS',
      path: '/analysis/stats', // 遷移先パス（後述）
      icon: '📈',
      status: 'published', // ステータスを published に
      color: 'border-blue-500 shadow-blue-500/10' // 色を青系に
    },
    {
      id: 'run-analyzer',
      title: 'Runデータ解析',
      description: 'あなたの敗因を陛下が指摘',
      category: 'TOOL',
      path: '#',
      icon: '📊',
      status: 'draft',
      color: 'border-slate-800 opacity-60'
    },
  ];

  // まとめ記事系
  const posts = [
    {
      id: 'block-issue',
      title: '【悲報】陛下（リージェント）、あまりにも紙耐久すぎて5ch民から心配される',
      date: '2026.04.16',
      category: 'キャラ攻略',
      status: 'published'
    },
    {
      id: 'tier-maker-update',
      title: '【攻略】カード名鑑に Tier Maker 機能を統合！最強ランキングを共有せよ',
      date: '2026.04.16',
      category: 'アップデート',
      status: 'published'
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-slate-900 text-slate-200 font-sans">
      <header className="w-full max-w-4xl mb-10 border-b border-slate-700 pb-6 text-center">
        <h1 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-600">
          Slay the Spire 2
        </h1>
        <p className="text-slate-400 text-sm mt-2 font-bold tracking-widest">～ 統計・データベース・解析ツール ～</p>
      </header>

      <div className="w-full max-w-3xl space-y-12">
        
        {/* --- ツール・データベース セクション --- */}
        <section>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-yellow-500">
            <span className="w-1.5 h-6 bg-yellow-500"></span>
            TOOLS & DATABASE
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <Link 
                key={tool.id}
                href={tool.status === 'draft' ? '#' : tool.path}
                className={`p-4 rounded-xl border-2 bg-slate-800 transition-all flex items-center gap-4 group ${
                  tool.status === 'draft' ? 'cursor-not-allowed border-slate-800' : `hover:scale-[1.02] hover:bg-slate-700 ${tool.color}`
                }`}
              >
                <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{tool.icon}</div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-yellow-500 tracking-tighter">{tool.category}</span>
                    {tool.status === 'draft' && (
                      <span className="text-[8px] bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-bold">準備中</span>
                    )}
                  </div>
                  <h3 className={`font-bold leading-tight ${tool.status === 'draft' ? 'text-slate-500' : 'text-slate-100'}`}>{tool.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">{tool.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* --- まとめ記事 セクション --- */}
        {/* <section>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-orange-500">
            <span className="w-1.5 h-6 bg-orange-600"></span>
            LATEST POSTS
          </h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <Link 
                key={post.id}
                href={post.status === 'published' ? `/posts/${post.id}` : '#'} 
                className={`block p-4 rounded-lg border transition-all ${
                  post.status === 'published' 
                  ? 'bg-slate-800 border-slate-700 hover:border-orange-500 shadow-sm' 
                  : 'bg-slate-800/40 border-slate-800 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                    {post.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{post.date}</span>
                </div>
                <h3 className={`font-bold ${post.status === 'published' ? 'text-slate-200' : 'text-slate-500'}`}>
                  {post.title}
                </h3>
              </Link>
            ))}
          </div>
        </section> */}

      </div>

      <footer className="mt-20 py-10 text-slate-600 text-[10px] tracking-widest text-center border-t border-slate-800 w-full max-w-3xl">
        陛下「フハハ！名鑑に Tier Maker も付けておいたぞ。存分に自説を垂れ流すが良い！」<br />
        © 2026 StS2 Summary Project / 監修：リージェント陛下
      </footer>
    </main>
  );
}