'use client';

import React from 'react';

export default function UpdatedAtDisplay() {
  const [updatedAt, setUpdatedAt] = React.useState<string>('Loading...');

  React.useEffect(() => {
    fetch('/data/updated_at.json')
      .then(res => res.json())
      .then(data => {
        const dateStr = data.updated_at;
        if (dateStr) {
          setUpdatedAt(new Date(dateStr).toLocaleString('ja-JP', { 
            timeZone: 'Asia/Tokyo', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          }));
        } else {
          setUpdatedAt('N/A');
        }
      })
      .catch(() => setUpdatedAt('N/A'));
  }, []);

  return <span>{updatedAt}</span>;
}
