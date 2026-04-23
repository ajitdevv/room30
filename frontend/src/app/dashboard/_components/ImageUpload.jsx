'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const BUCKET = 'property-images';
const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024;

export default function ImageUpload({ urls, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [dragOver, setDragOver] = useState(false);

  async function upload(files) {
    if (!files.length) return;
    if (urls.length + files.length > MAX_FILES) {
      setErr(`Maximum ${MAX_FILES} photos per listing.`);
      return;
    }
    setErr(''); setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getSession();
      const uid = userData.session?.user?.id;
      if (!uid) throw new Error('Please sign in first.');

      const newUrls = [];
      for (const file of files) {
        if (file.size > MAX_SIZE) {
          throw new Error(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 5 MB.`);
        }
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} isn't an image (got ${file.type || 'unknown'}).`);
        }
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
        if (upErr) {
          console.error('[image upload] storage error', upErr);
          // Supabase storage errors are often cryptic — translate common ones.
          const m = upErr.message || '';
          if (m.toLowerCase().includes('bucket not found')) {
            throw new Error('Storage bucket "property-images" missing. Run schema_patches/02_storage_bucket.sql in Supabase.');
          }
          if (m.toLowerCase().includes('row-level security') || m.toLowerCase().includes('policy')) {
            throw new Error('Upload blocked by storage policy. Run 02_storage_bucket.sql to set policies.');
          }
          if (m.toLowerCase().includes('mime')) {
            throw new Error(`File type not allowed. Only PNG, JPG, WebP, GIF.`);
          }
          throw upErr;
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (!pub?.publicUrl) throw new Error('Upload succeeded but public URL is empty. Check bucket is "public".');
        newUrls.push(pub.publicUrl);
      }
      onChange([...urls, ...newUrls]);
    } catch (e2) {
      console.error('[image upload] failed', e2);
      setErr(e2.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  function onInput(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    upload(files);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    upload(Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/')));
  }
  function remove(index) { onChange(urls.filter((_, i) => i !== index)); }
  function move(from, to) {
    if (to < 0 || to >= urls.length) return;
    const copy = [...urls];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    onChange(copy);
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Photos <span className="font-normal text-[var(--subtle)]">· {urls.length}/{MAX_FILES}</span>
        </div>
        <div className="text-[10px] text-[var(--subtle)]">Up to 5 MB each · First is cover</div>
      </div>

      {urls.length === 0 ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-12 text-center transition ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
              : 'border-[var(--border)] bg-[var(--bg)] hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5'
          } ${busy ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={onInput} disabled={busy} />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div className="mt-3 text-sm font-semibold">{busy ? 'Uploading…' : 'Drop photos here or click to upload'}</div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">PNG, JPG, WebP · Up to 10 photos</div>
        </label>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`grid grid-cols-3 gap-2 rounded-2xl p-2 sm:grid-cols-4 ${dragOver ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
        >
          {urls.map((u, i) => (
            <div key={u} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--elevated)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`photo ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <div className="flex w-full items-center justify-between text-white">
                  <div className="flex gap-1">
                    <IconBtn onClick={() => move(i, i - 1)} disabled={i === 0} label="Move left">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </IconBtn>
                    <IconBtn onClick={() => move(i, i + 1)} disabled={i === urls.length - 1} label="Move right">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </IconBtn>
                  </div>
                  <IconBtn onClick={() => remove(i)} label="Remove" danger>
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </IconBtn>
                </div>
              </div>
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Cover
                </span>
              )}
            </div>
          ))}

          {urls.length < MAX_FILES && (
            <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] text-center transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={onInput} disabled={busy} />
              <div className="text-2xl text-[var(--muted)]">＋</div>
              <div className="mt-1 px-2 text-[11px] text-[var(--muted)]">{busy ? 'Uploading…' : 'Add more'}</div>
            </label>
          )}
        </div>
      )}

      {err && <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{err}</div>}
    </div>
  );
}

function IconBtn({ onClick, children, disabled, danger, label }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur transition ${
        danger ? 'bg-red-600/90 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
