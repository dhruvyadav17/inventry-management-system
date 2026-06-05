import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@common/services/api';

export function useApiQuery<T>(url: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const fallbackRef = useRef(fallback);

  fallbackRef.current = fallback;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    apiGet<T>(url)
      .then((payload) => {
        if (mounted) {
          setData(payload);
        }
      })
      .catch(() => {
        if (mounted) {
          setData(fallbackRef.current);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  return { data, loading, setData };
}
