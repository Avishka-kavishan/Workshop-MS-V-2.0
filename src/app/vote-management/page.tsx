'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import VoteManagementTab from '@/components/monitoring/VoteManagementTab';

export default function VoteManagementPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/monitoring?tab=vote_management');
  }, [router]);

  return (
    <AppShell>
      <div style={{ padding: '1.5rem 2rem', maxWidth: '1440px', margin: '0 auto' }}>
        <VoteManagementTab />
      </div>
    </AppShell>
  );
}
