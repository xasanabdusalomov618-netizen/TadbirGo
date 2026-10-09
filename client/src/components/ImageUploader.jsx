import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

/** Uploads images to the server and returns their URLs (max 8). */
export default function ImageUploader({ value = [], onChange, max = 8 }) {
  const { t } = useTranslation();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files) => {
    const list = Array.from(files).slice(0, max - value.length);
    if (!list.length) return;
    setBusy(true);
    try {
      const { files: urls } = await api.upload(list);
      onChange([...value, ...urls].slice(0, max));
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(error.message || t('errors.serverError'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, index) => (
          <div key={url + index} className="soft-inset-sm relative aspect-square overflow-hidden">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white transition hover:bg-[color:var(--danger)]"
              aria-label={t('common.remove')}
            >
              <X size={13} />
            </button>
            {index === 0 && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                Asosiy
              </span>
            )}
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="soft-inset-sm flex aspect-square flex-col items-center justify-center gap-2 text-muted transition hover:text-accent"
          >
            {busy ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span className="text-[11px] font-semibold">{t('common.add')}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {!value.length && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <ImageIcon size={13} /> JPG, PNG yoki WEBP · 5 MB gacha · {max} ta rasm
        </p>
      )}
    </div>
  );
}
