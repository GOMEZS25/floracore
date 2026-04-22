import { useState, useEffect } from 'react';
import axiosInstance from '../services/axiosInstance';

const useTablePreferences = (preferenceKey, defaultVisible, defaultPinned = []) => {
  const [visibleColumns, setVisibleColumns] = useState(new Set(defaultVisible));
  const [pinnedColumns, setPinnedColumns] = useState(new Set(defaultPinned));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/preferences/${preferenceKey}`);
        if (res.data?.data) {
          const { visible, pinned } = res.data.data;
          if (visible) setVisibleColumns(new Set(visible));
          if (pinned) setPinnedColumns(new Set(pinned));
        }
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, [preferenceKey]);

  const save = async (visible, pinned) => {
    try {
      await axiosInstance.put(`/preferences/${preferenceKey}`, {
        value: {
          visible: [...visible],
          pinned: [...pinned]
        }
      });
    } catch { }
  };

  const toggleVisible = (key) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      save(next, pinnedColumns);
      return next;
    });
  };

  const togglePinned = (key) => {
    setPinnedColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      save(visibleColumns, next);
      return next;
    });
  };

  return { visibleColumns, pinnedColumns, toggleVisible, togglePinned, loading };
};

export default useTablePreferences;
