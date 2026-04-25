'use client';

import React, { useState, useEffect } from 'react';
import StatsGrid from './StatsGrid';

export default function StatsGridClient() {
  const [statsData, setStatsData] = useState<any>(null);
  const [cardInfoMap, setCardInfoMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingStage('基本データ読み込み中...');
        setLoadingProgress(5);
        
        // Load summary data
        const summaryRes = await fetch('/data/summary.json');
        if (!summaryRes.ok) throw new Error('Failed to load summary data');
        const summary = await summaryRes.json();
        setLoadingProgress(10);

        // Load all character card data in parallel
        setLoadingStage('キャラクターデータ読み込み中...');
        const characters = ['ironclad', 'silent', 'defect', 'necrobinder', 'regent'];
        const cardsSource: Record<string, any> = {};
        
        const characterPromises = characters.map(async (char, idx) => {
          try {
            const charRes = await fetch(`/data/cards_${char}.json`);
            if (charRes.ok) {
              return { char, data: await charRes.json() };
            }
          } catch (e) {
            console.warn(`Failed to load data for ${char}:`, e);
          }
          return null;
        });
        
        const characterResults = await Promise.all(characterPromises);
        characterResults.forEach(result => {
          if (result) {
            cardsSource[result.char] = result.data;
          }
        });
        setLoadingProgress(30);

        // Load by_version summary and cards in parallel
        setLoadingStage('バージョンデータ読み込み中...');
        let byVersionSummary: any = {};
        let byVersionCards: any = {};
        try {
          const bvRes = await fetch('/data/by_version_summary.json');
          if (bvRes.ok) {
            byVersionSummary = await bvRes.json();
          }
        } catch (e) {
          console.warn('Failed to load by_version summary:', e);
        }
        setLoadingProgress(35);

        // Load by_version cards data in parallel
        const versions = Object.keys(byVersionSummary);
        const versionCardPromises = versions.map(async (version) => {
          try {
            const bvCardsRes = await fetch(`/data/by_version_cards_${version}.json`);
            if (bvCardsRes.ok) {
              return { version, data: await bvCardsRes.json() };
            }
          } catch (e) {
            console.warn(`Failed to load by_version cards for ${version}:`, e);
          }
          return null;
        });
        
        const versionCardResults = await Promise.all(versionCardPromises);
        versionCardResults.forEach(result => {
          if (result) {
            byVersionCards[result.version] = result.data;
          }
        });
        setLoadingProgress(50);

        // Load by_ascension summary and cards in parallel
        setLoadingStage('昇格データ読み込み中...');
        let byAscensionSummary: any = {};
        let byAscensionCards: any = {};
        try {
          const baRes = await fetch('/data/by_ascension_summary.json');
          if (baRes.ok) {
            byAscensionSummary = await baRes.json();
          }
        } catch (e) {
          console.warn('Failed to load by_ascension summary:', e);
        }
        setLoadingProgress(55);

        // Load by_ascension cards data in parallel
        const ascensions = Object.keys(byAscensionSummary);
        const ascensionCardPromises = ascensions.map(async (asc) => {
          try {
            const baCardsRes = await fetch(`/data/by_ascension_cards_${asc.toLowerCase()}.json`);
            if (baCardsRes.ok) {
              return { asc, data: await baCardsRes.json() };
            }
          } catch (e) {
            console.warn(`Failed to load by_ascension cards for ${asc}:`, e);
          }
          return null;
        });
        
        const ascensionCardResults = await Promise.all(ascensionCardPromises);
        ascensionCardResults.forEach(result => {
          if (result) {
            byAscensionCards[result.asc] = result.data;
          }
        });
        setLoadingProgress(70);

        // Load by_version_ascension summary and cards in parallel
        setLoadingStage('バージョン×昇格データ読み込み中...');
        let byVersionAscensionSummary: any = {};
        let byVersionAscensionCards: any = {};
        try {
          const bvaRes = await fetch('/data/by_version_ascension_summary.json');
          if (bvaRes.ok) {
            byVersionAscensionSummary = await bvaRes.json();
          }
        } catch (e) {
          console.warn('Failed to load by_version_ascension summary:', e);
        }
        setLoadingProgress(75);

        // Load by_version_ascension cards data in parallel
        const bvaCardPromises: Promise<{ version: string; ascension: string; data: any } | null>[] = [];
        for (const version of Object.keys(byVersionAscensionSummary)) {
          const versionData = byVersionAscensionSummary[version];
          for (const ascension of Object.keys(versionData)) {
            bvaCardPromises.push(
              (async () => {
                try {
                  const bvaCardsRes = await fetch(`/data/by_version_ascension_cards_${version}_${ascension}.json`);
                  if (bvaCardsRes.ok) {
                    return { version, ascension, data: await bvaCardsRes.json() };
                  }
                } catch (e) {
                  console.warn(`Failed to load by_version_ascension cards for ${version}_${ascension}:`, e);
                }
                return null;
              })()
            );
          }
        }
        
        const bvaCardResults = await Promise.all(bvaCardPromises);
        bvaCardResults.forEach(result => {
          if (result) {
            if (!byVersionAscensionCards[result.version]) {
              byVersionAscensionCards[result.version] = {};
            }
            byVersionAscensionCards[result.version][result.ascension] = result.data;
          }
        });
        setLoadingProgress(85);

        // Load updated_at
        let updatedAt = '';
        try {
          const uaRes = await fetch('/data/updated_at.json');
          if (uaRes.ok) {
            const uaData = await uaRes.json();
            updatedAt = uaData.updated_at || '';
          }
        } catch (e) {
          console.warn('Failed to load updated_at:', e);
        }
        setLoadingProgress(90);

        const finalData = {
          summary,
          cards: cardsSource,
          by_version: { summary: byVersionSummary, cards: byVersionCards },
          by_ascension: { summary: byAscensionSummary, cards: byAscensionCards },
          by_version_ascension: { summary: byVersionAscensionSummary, cards: byVersionAscensionCards },
          updated_at: updatedAt
        };
        setStatsData(finalData);
        setLoadingProgress(95);

        // Load card info from API
        setLoadingStage('カード情報読み込み中...');
        const cardRes = await fetch('https://spire-codex.com/api/cards?lang=jpn');
        const allCardsApi = await cardRes.json();
        const cardMap: Record<string, any> = {};
        allCardsApi.forEach((card: any) => {
          const baseId = card.id.replace('CARD.', '');
          cardMap[baseId] = card;
          cardMap[`CARD.${baseId}`] = card;
        });
        setCardInfoMap(cardMap);
        setLoadingProgress(100);
      } catch (e) {
        console.error("Error loading data", e);
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] text-[#cbd5e1]">
        <div className="text-xl font-black tracking-widest mb-4">LOADING</div>
        <div className="text-sm text-[#64748b] mb-2">{loadingStage}</div>
        <div className="w-64 h-2 bg-[#1e293b] rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <div className="text-xs text-[#64748b] mt-2">{loadingProgress}%</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xl text-red-400">Error: {error}</div>
    );
  }

  return <StatsGrid statsData={statsData} cardInfoMap={cardInfoMap} updatedAt={statsData?.updated_at} />;
}
