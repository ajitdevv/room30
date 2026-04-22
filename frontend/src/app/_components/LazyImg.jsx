'use client';
import { useEffect, useRef, useState } from 'react';

export default function LazyImg({ src, alt = '', className = '', eager = false, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [inView, setInView] = useState(eager);
  const [prevSrc, setPrevSrc] = useState(src);
  const ref = useRef(null);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setLoaded(false);
    setErrored(false);
  }

  useEffect(() => {
    if (eager || inView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, inView]);

  if (!src || errored) {
    return (
      <div
        ref={ref}
        className={`flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[var(--elevated)] to-[var(--surface)] text-[var(--subtle)] ${className}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)]/80 text-[var(--muted)] ring-1 ring-[var(--border)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="1.5" />
            <path d="M21 15l-5-5-9 9" />
          </svg>
        </span>
        <span className="text-[11px] font-medium">
          {errored ? 'Image unavailable' : 'No image added'}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative overflow-hidden bg-[var(--elevated)] ${className}`} onClick={onClick}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[var(--elevated)] via-[var(--border)] to-[var(--elevated)]" />
      )}
      {inView && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'low'}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`h-full w-full object-cover transition-all duration-500 ease-out ${loaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-[1.03] blur-sm'}`}
        />
      )}
    </div>
  );
}
