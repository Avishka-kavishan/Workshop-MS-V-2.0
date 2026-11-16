/**
 * IPMIS Real-Time Cross-Tab & Cross-Module Broadcast Synchronization Engine
 * Enables all open dashboard tabs, monitoring screens, and operational pages
 * to instantly update whenever records (workshops, AIP activities, amendments, budgets) change.
 */

export const IPMIS_SYNC_CHANNEL = 'ipmis_live_sync';
export const IPMIS_SYNC_STORAGE_KEY = 'ipmis_data_sync_timestamp';

export interface SyncMessage {
  type: 'DATA_UPDATED' | 'WORKSHOP_UPDATED' | 'AIP_UPDATED' | 'BUDGET_UPDATED';
  entity?: string;
  id?: string;
  timestamp: number;
}

/**
 * Dispatches a live synchronization event across all open tabs and windows.
 */
export function broadcastDataChange(entity: string = 'general', id?: string) {
  if (typeof window === 'undefined') return;

  const message: SyncMessage = {
    type: 'DATA_UPDATED',
    entity,
    id,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel API for instantaneous cross-tab synchronization
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(IPMIS_SYNC_CHANNEL);
      channel.postMessage(message);
      // Close shortly after posting to avoid lingering open ports
      setTimeout(() => {
        try {
          channel.close();
        } catch {}
      }, 300);
    }
  } catch (err) {
    console.debug('BroadcastChannel dispatch non-critical error:', err);
  }

  // 2. LocalStorage Event fallback (supported universally across all browsers)
  try {
    localStorage.setItem(IPMIS_SYNC_STORAGE_KEY, JSON.stringify(message));
  } catch (err) {
    console.debug('LocalStorage sync fallback non-critical error:', err);
  }
}

/**
 * Subscribes to live synchronization events and triggers the callback on change.
 * Returns an unsubscription function for React useEffect cleanup.
 */
export function subscribeToDataChanges(callback: (msg: SyncMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let channel: BroadcastChannel | null = null;

  // 1. Setup BroadcastChannel listener
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(IPMIS_SYNC_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === 'DATA_UPDATED') {
          callback(event.data);
        }
      };
    }
  } catch (err) {
    console.debug('BroadcastChannel listener initialization non-critical error:', err);
  }

  // 2. Setup Storage Event listener for fallback
  const handleStorage = (e: StorageEvent) => {
    if (e.key === IPMIS_SYNC_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {
        callback({ type: 'DATA_UPDATED', timestamp: Date.now() });
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  // Return cleaner
  return () => {
    window.removeEventListener('storage', handleStorage);
    if (channel) {
      try {
        channel.close();
      } catch {}
    }
  };
}
