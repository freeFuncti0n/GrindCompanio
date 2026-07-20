import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useBleStore } from '@/src/store/bleStore';

/**
 * Redirects tab focus: Analytics when offline, Grind when connected.
 */
export function useTabFocusRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const status = useBleStore((s) => s.status);
  const prevStatus = useRef(status);
  const initialRedirect = useRef(false);

  useEffect(() => {
    const inTabs = segments[0] === '(tabs)';
    if (!inTabs) return;

    if (!initialRedirect.current && status === 'disconnected') {
      initialRedirect.current = true;
      router.replace('/(tabs)/analytics');
      return;
    }

    if (status === 'connected' && prevStatus.current !== 'connected') {
      router.replace('/(tabs)' as never);
    } else if (
      status === 'disconnected' &&
      (prevStatus.current === 'connected' || prevStatus.current === 'connecting')
    ) {
      router.replace('/(tabs)/analytics');
    }

    prevStatus.current = status;
  }, [status, router, segments]);
}
