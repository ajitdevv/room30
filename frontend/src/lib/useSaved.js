'use client';
import { useEffect, useState, useCallback } from 'react';

const KEY = 'r30-saved';
const EVT = 'r30-saved-changed';

function read() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(ids) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useSaved() {
  const [ids, setIds] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', (e) => { if (e.key === KEY) sync(); });
    return () => window.removeEventListener(EVT, sync);
  }, []);

  const isSaved = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback((id) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
    write(next);
    setIds(next);
    return !current.includes(id);
  }, []);

  const remove = useCallback((id) => {
    const next = read().filter((x) => x !== id);
    write(next);
    setIds(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setIds([]);
  }, []);

  return { ids, isSaved, toggle, remove, clear, count: ids.length, mounted };
}
