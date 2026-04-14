'use client';

import { useState } from 'react';
import DemoModal from './DemoModal';

export default function NavDemoButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className ?? 'bda-nav-link bda-nav-link--primary'}
        style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Start Free Trial
      </button>
      <DemoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
