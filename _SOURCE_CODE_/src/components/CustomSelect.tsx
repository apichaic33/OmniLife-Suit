import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option { value: string; label: string; }

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: (string | Option)[];
}

export default function CustomSelect({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const items: Option[] = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const selected = items.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 active:scale-[0.98]"
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          border: `1px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
          boxShadow: open ? '0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent)' : undefined,
        }}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--color-muted)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {items.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left"
              style={{
                background: o.value === value ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: o.value === value ? 'var(--color-accent)' : 'var(--color-text)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => {
                if (o.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = o.value === value ? 'rgba(99,102,241,0.12)' : 'transparent';
              }}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
