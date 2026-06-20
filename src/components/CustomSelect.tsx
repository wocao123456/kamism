import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CustomSelect({ value, options, onChange, placeholder = '请选择', className = '', style }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = options.find(o => o.value === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className={`custom-select-v2 ${open ? 'is-open' : ''} ${className}`} style={style}>
      <button type="button" className="custom-select-v2__button" onClick={() => setOpen(v => !v)}>
        <span className={!active ? 'is-placeholder' : ''}>{active?.label || placeholder}</span>
        <ChevronDown className="custom-select-v2__chevron" size={18} />
      </button>
      {open && (
        <div className="custom-select-v2__menu">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              className={`custom-select-v2__option ${opt.value === value ? 'is-active' : ''}`}
              onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}
            >
              <span>{opt.label}</span>{opt.value === value && <i className="custom-select-v2__dot" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
