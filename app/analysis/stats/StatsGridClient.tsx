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

        // Load by_version summary for version selector
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

        // Load by_version cards data
        const versions = Object.keys(byVersionSummary);
        for (const version of versions) {
          try {
            const bvCardsRes = await fetch(`/data/by_version_cards_${version}.json`);
            if (bvCardsRes.ok) {
              byVersionCards[version] = await bvCardsRes.json();
            }
          } catch (e) {
            console.warn(`Failed to load by_version cards for ${version}:`, e);
          }
        }

        // Load by_ascension summary for ascension selector
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

        // Load by_ascension cards data
        const ascensions = Object.keys(byAscensionSummary);
        for (const asc of ascensions) {
          try {
            const baCardsRes = await fetch(`/data/by_ascension_cards_${asc.toLowerCase()}.json`);
            if (baCardsRes.ok) {
              byAscensionCards[asc] = await baCardsRes.json();
            }
          } catch (e) {
            console.warn(`Failed to load by_ascension cards for ${asc}:`, e);
          }
        }

        // Load by_version_ascension summary for accurate calculation
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

        // Load by_version_ascension cards data
        for (const version of versions) {
          for (const ascension of ascensions) {
            try {
              const bvaCardsRes = await fetch(`/data/by_version_ascension_cards_${version}_${ascension}.json`);
              if (bvaCardsRes.ok) {
                const cardsData = await bvaCardsRes.json();
                if (!byVersionAscensionCards[version]) {
                  byVersionAscensionCards[version] = {};
                }
                byVersionAscensionCards[version][ascension] = cardsData;
              }
            } catch (e) {
              console.warn(`Failed to load by_version_ascension cards for ${version}_${ascension}:`, e);
            }
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

        const finalData = {
          summary,
          cards: cardsSource,
          by_version: { summary: byVersionSummary, cards: byVersionCards },
          by_ascension: { summary: byAscensionSummary, cards: byAscensionCards },
          by_version_ascension: { summary: byVersionAscensionSummary, cards: byVersionAscensionCards },
          updated_at: updatedAt
        };
        setStatsData(finalData);

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
