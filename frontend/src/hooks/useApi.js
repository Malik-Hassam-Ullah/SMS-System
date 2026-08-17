import { useState, useEffect, useCallback } from 'react';

export function useApi(apiFunc, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      setData(result);
      return result;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'An unexpected error occurred';
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const result = await apiFunc();
        if (mounted) setData(result);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || err.message || 'An unexpected error occurred');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: execute };
}
