export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-slate-900 text-slate-200">
      <header className="w-full max-w-3xl mb-12 border-b border-slate-700 pb-4 text-center">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600">
          スレスパ2攻略：リージェント速報
        </h1>
      </header>

      <article className="w-full max-w-2xl space-y-8">
        <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-white border-l-4 border-yellow-500 pl-3">
            【悲報】陛下、あまりにも紙耐久すぎて5ch民から心配される
          </h2>

          {/* リージェントのターン */}
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-yellow-600 text-white p-2 rounded-lg text-xs font-bold w-16 text-center shrink-0">陛下</div>
            <div className="bg-slate-700 p-4 rounded-lg relative">
              「フハハハ！見よこの火力を！ブロックなどという卑小な概念、余の辞書には存在せぬ！全てを消し飛ばせば被ダメージは実質ゼロなのだ！！」
            </div>
          </div>

          {/* サイレントのターン */}
          <div className="flex items-start gap-4 flex-row-reverse">
            <div className="bg-green-700 text-white p-2 rounded-lg text-xs font-bold w-16 text-center shrink-0">沈黙</div>
            <div className="bg-slate-700 p-4 rounded-lg relative border-r-4 border-green-500">
              「……さっき第1層のエリート相手に『あばばば』って言いながら、HP1桁で逃げ出してたのは誰？ 私がフットワーク貸してあげようか？」
            </div>
          </div>
        </section>

        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-yellow-500">5chの反応</h3>
          <ul className="space-y-3 text-sm italic text-slate-400">
            <li>1. 「リージェント、攻めてる時は王様だけど守りに入った瞬間ただの不審者だよな」</li>
            <li>2. 「ブロックカードの数値が1層基準のまま3層まで行くのやめろ」</li>
            <li>3. 「無形がないリージェントとか、ただのサンドバッグで草」</li>
          </ul>
        </section>
      </article>

      <footer className="mt-20 text-slate-500 text-xs text-center">
        © 2026 塔の王立図書館 - StS2 Strategy Blog
      </footer>
    </main>
  );
}