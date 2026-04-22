import React from 'react';
import StatsGridClient from './StatsGridClient';

export const dynamic = 'force-dynamic';

export default function TierPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-[#cbd5e1] p-8 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        .spire-desc b { color: #fde047; font-weight: 800; }
        .card-inner-shadow { box-shadow: inset 0 0 20px rgba(0,0,0,0.6); }
        .tier-glow { text-shadow: 0 0 10px currentColor; }
      `}} />

      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
            Slay the Spire 2 <br/>
            <span className="text-blue-500">Tier Statistics</span>
          </h1>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Data Source: Spire Codex
          </p>
        </header>

        <StatsGridClient />
      </div>
    </main>
  );
}