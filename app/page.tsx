import Link from 'next/link';

export default function Home() {
  // 記事の一覧データ
  const posts = [
    {
      id: 'cards', // カード名鑑への遷移用に追加
      title: '【DB】陛下専用カード名鑑 - 王立図書館に刻まれしリージェントの力',
      date: '2026.04.16',
      category: 'データベース',
      status: 'published',
      isNew: true, // 新着フラグ
      path: '/cards' // cardsページへのパス
    },
    {
      id: 'block-issue',
      title: '【悲報】陛下（リージェント）、あまりにも紙耐久すぎて5ch民から心配される',
      date: '2026.04.16',
      category: 'キャラ攻略',
      status: 'published',
      path: '/posts/block-issue'
    },
    {
      id: 'tier-list',
      title: '【準備中】Slay the Spire 2 全カード・レリック Tier表 (β版)',
      date: 'COMING SOON',
      category: '統計・解析',
      status: 'draft'
    },
    {
      id: 'post-stats',
      title: '【準備中】5ch・Reddit 投稿頻度統計レポート - 今、旬のビルドは？',
      date: 'COMING SOON',
      category: '統計・解析',
      status: 'draft'
    },
    {
      id: 'run-analyzer',
      title: '【準備中】Runデータ解析ツール - あなたの敗因を陛下が指摘',
      date: 'COMING SOON',
      category: 'ツール',
      status: 'draft'
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-slate-900 text-slate-200 font-sans">
      <header className="w-full max-w-3xl mb-12 border-b border-slate-700 pb-6 text-center">
        <h1 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600">
          スレスパ2攻略：陛下速報
        </h1>
        <p className="text-slate-400 text-sm mt-2 font-bold tracking-widest">
          ～ 塔の王立図書館・非公式まとめ支部 ～
        </p>
      </header>

      <div className="w-full max-w-2xl space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="relative group">
            <Link 
              href={post.status === 'published' ? (post.path || '#') : '#'} 
              className={`block p-5 rounded-lg border transition-all shadow-md ${
                post.status === 'published' 
                ? 'bg-slate-800 border-slate-700 group-hover:border-yellow-500 group-hover:shadow-yellow-500/20' 
                : 'bg-slate-800/50 border-slate-800 cursor-not-allowed opacity-70'
              } ${post.isNew ? 'border-yellow-600/50' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2 items-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    post.category === 'ツール' ? 'bg-blue-900 text-blue-300' : 
                    post.category === '統計・解析' ? 'bg-purple-900 text-purple-300' : 
                    post.category === 'データベース' ? 'bg-green-900 text-green-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>
                    {post.category}
                  </span>
                  {post.isNew && (
                    <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full animate-bounce">
                      NEW
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-mono">{post.date}</span>
              </div>
              
              <h2 className={`text-lg font-bold transition-colors ${
                post.status === 'published' 
                ? 'text-slate-200 group-hover:text-yellow-400' 
                : 'text-slate-500'
              }`}>
                {post.title}
              </h2>

              {post.status === 'draft' && (
                <div className="mt-2 text-xs text-orange-500 font-bold italic animate-pulse">
                  UNDER CONSTRUCTION...
                </div>
              )}
            </Link>
          </div>
        ))}
      </div>

      <footer className="mt-auto pt-20 text-slate-600 text-[10px] tracking-widest text-center">
        陛下「フハハ！余の偉大なる記録が刻まれるのを待つが良い！」<br />
        © 2026 StS2 Summary Project
      </footer>
    </main>
  );
}