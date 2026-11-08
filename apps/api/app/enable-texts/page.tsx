'use client';

import dynamic from 'next/dynamic';

// TEMPORARY page, not linked from the site. See EnableTexts.tsx.
const EnableTexts = dynamic(() => import('./EnableTexts'), { ssr: false });

export default function Page() {
  return <EnableTexts />;
}
