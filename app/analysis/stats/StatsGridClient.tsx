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
        // Load summary data
        const summaryRes = await fetch('/data/summary.json');
        if (!summaryRes.ok) throw new Error('Failed to load summary data');
        const summary = await summaryRes.json();

        // Load all character card data
        const cardsSource: Record<string, any> = {};
        const characters = ['ironclad', 'silent', 'defect', 'necrobinder', 'regent'];
        
        for (const char of characters) {
          try {
            const charRes = await fetch(`/data/cards_${char}.json`);
            if (charRes.ok) {
              cardsSource[char] = await charRes.json();
            }
          } catch (e) {
            console.warn(`Failed to load data for ${char}:`, e);
          }
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

        setStatsData({
          summary,
          cards: cardsSource,
          by_version: { summary: {}, cards: {} },
          by_ascension: { summary: {}, cards: {} },
          by_version_ascension: { summary: {}, cards: {} },
          updated_at: updatedAt
        });

        // Load card info from API
        const cardRes = await fetch('https://spire-codex.com/api/cards?lang=jpn');
        const allCardsApi = await cardRes.json();
        const cardMap: Record<string, any> = {};
        allCardsApi.forEach((card: any) => {
          const baseId = card.id.replace('CARD.', '');
          cardMap[baseId] = card;
          cardMap[`CARD.${baseId}`] = card;
        });
        setCardInfoMap(cardMap);
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
