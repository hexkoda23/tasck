// Tiny data hook with built-in fallback for v3 progressive layering.
// Usage:
//   const { data, loading, error } = useV3Resource(fetcher, fallback);
import { useEffect, useState, useRef } from 'react';

export function useV3Resource(fetcher, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('mock'); // 'api' | 'mock'
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    (async () => {
      try {
        const apiData = await fetcher();
        if (!cancelled && apiData != null) {
          setData(apiData);
          setSource('api');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setSource('mock');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
    // fetcher identity is expected to be stable per caller; pages pass useCallback or inline closures
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, source, setData };
}
