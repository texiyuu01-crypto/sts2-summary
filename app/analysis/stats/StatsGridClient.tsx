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
            console.log('by_version summary loaded:', Object.keys(byVersionSummary));
          }
        } catch (e) {
          console.warn('Failed to load by_version summary:', e);
        }

        // Load by_version cards data
        const versions = Object.keys(byVersionSummary);
        console.log('Loading by_version cards for versions:', versions);
        for (const version of versions) {
          try {
            const bvCardsRes = await fetch(`/data/by_version_cards_${version}.json`);
            console.log(`Fetching /data/by_version_cards_${version}.json, status:`, bvCardsRes.status);
            if (bvCardsRes.ok) {
              byVersionCards[version] = await bvCardsRes.json();
              console.log(`Loaded by_version_cards_${version}.json`);
            } else {
              console.warn(`Failed to load by_version cards for ${version}: status ${bvCardsRes.status}`);
            }
          } catch (e) {
            console.warn(`Failed to load by_version cards for ${version}:`, e);
          }
        }
        console.log('by_version cards loaded:', Object.keys(byVersionCards));

        // Load by_ascension summary for ascension selector
        let byAscensionSummary: any = {};
        let byAscensionCards: any = {};
        try {
          const baRes = await fetch('/data/by_ascension_summary.json');
          if (baRes.ok) {
            byAscensionSummary = await baRes.json();
            console.log('by_ascension summary loaded:', Object.keys(byAscensionSummary));
          }
        } catch (e) {
          console.warn('Failed to load by_ascension summary:', e);
        }

        // Load by_ascension cards data
        const ascensions = Object.keys(byAscensionSummary);
        console.log('Loading by_ascension cards for ascensions:', ascensions);
        for (const asc of ascensions) {
          try {
            const baCardsRes = await fetch(`/data/by_ascension_cards_${asc}.json`);
            console.log(`Fetching /data/by_ascension_cards_${asc}.json, status:`, baCardsRes.status);
            if (baCardsRes.ok) {
              byAscensionCards[asc] = await baCardsRes.json();
              console.log(`Loaded by_ascension_cards_${asc}.json`);
            } else {
              console.warn(`Failed to load by_ascension cards for ${asc}: status ${baCardsRes.status}`);
            }
          } catch (e) {
            console.warn(`Failed to load by_ascension cards for ${asc}:`, e);
          }
        }
        console.log('by_ascension cards loaded:', Object.keys(byAscensionCards));

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
          by_version_ascension: { summary: {}, cards: {} },
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
