'use client';

import React from 'react';

export default function UpdatedAtDisplay() {
  const [updatedAt, setUpdatedAt] = React.useState<string>('Loading...');

  React.useEffect(() => {
    fetch('/data/updated_at.json')
      .then(res => res.json())
      .then(data => setUpdatedAt(data.updated_at || 'N/A'))
      .catch(() => setUpdatedAt('N/A'));
  }, []);

  return <span>{updatedAt}</span>;
}
