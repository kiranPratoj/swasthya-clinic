'use client';

import { useState } from 'react';
import DemoModal from './DemoModal';

export default function DemoTrigger({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <span
        onClick={() => setIsOpen(true)}
        style={{ cursor: 'pointer', display: 'contents' }}
      >
        {children}
      </span>
      <DemoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
