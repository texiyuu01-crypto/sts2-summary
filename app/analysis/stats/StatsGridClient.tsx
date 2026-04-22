'use client';

import React, { useState, useEffect } from 'react';
import StatsGrid from './StatsGrid';

export default function StatsGridClient() {
  const [statsData, setStatsData] = useState<any>(null);
  const [cardInfoMap, setCardInfoMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Starting data load...');
        
        // Load summary data
        console.log('Loading summary...');
        const summaryRes = await fetch('/data/summary.json');
        console.log('Summary response status:', summaryRes.status);
        if (!summaryRes.ok) throw new Error('Failed to load summary data');
        const summary = await summaryRes.json();
        console.log('Summary loaded:', summary);

        // Load all character card data
        const cardsSource: Record<string, any> = {};
        const characters = ['ironclad', 'silent', 'defect', 'necrobinder', 'regent'];
        
        for (const char of characters) {
          try {
            console.log(`Loading cards for ${char}...`);
            const charRes = await fetch(`/data/cards_${char}.json`);
            console.log(`${char} response status:`, charRes.status);
            if (charRes.ok) {
              cardsSource[char] = await charRes.json();
              console.log(`${char} loaded successfully`);
            } else {
              console.warn(`${char} file not found (status ${charRes.status})`);
            }
          } catch (e) {
            console.warn(`Failed to load data for ${char}:`, e);
          }
        }

        console.log('All cards loaded:', Object.keys(cardsSource));

        // Load by_version summary for version selector
        let byVersionSummary: any = {};
        try {
          const bvRes = await fetch('/data/by_version_summary.json');
          if (bvRes.ok) {
            byVersionSummary = await bvRes.json();
            console.log('by_version summary loaded');
          }
        } catch (e) {
          console.warn('Failed to load by_version summary:', e);
        }

        // Load by_ascension summary for ascension selector
        let byAscensionSummary: any = {};
        try {
          const baRes = await fetch('/data/by_ascension_summary.json');
          if (baRes.ok) {
            byAscensionSummary = await baRes.json();
            console.log('by_ascension summary loaded');
          }
        } catch (e) {
          console.warn('Failed to load by_ascension summary:', e);
        }

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

        const finalData = {
          summary,
          cards: cardsSource,
          by_version: { summary: byVersionSummary, cards: {} },
          by_ascension: { summary: byAscensionSummary, cards: {} },
          by_version_ascension: { summary: {}, cards: {} },
          updated_at: updatedAt
        };
        console.log('Setting stats data:', finalData);
        setStatsData(finalData);

        // Load card info from API
        console.log('Loading card info from API...');
        const cardRes = await fetch('https://spire-codex.com/api/cards?lang=jpn');
        const allCardsApi = await cardRes.json();
        const cardMap: Record<string, any> = {};
        allCardsApi.forEach((card: any) => {
          const baseId = card.id.replace('CARD.', '');
          cardMap[baseId] = card;
          cardMap[`CARD.${baseId}`] = card;
        });
        console.log('Card info loaded, total cards:', Object.keys(cardMap).length);
        setCardInfoMap(cardMap);
      } catch (e) {
        console.error("Error loading data", e);
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        console.log('Data load complete, setting loading to false');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="text-xl">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="text-xl text-red-400">Error: {error}</div>
    );
  }

  return <StatsGrid statsData={statsData} cardInfoMap={cardInfoMap} />;
}
