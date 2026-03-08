import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './CustomSelect.css';

/**
 * CustomSelect — a beautiful replacement for <select>.
 *
 * Props:
 *  value      — current selected value (string)
 *  onChange   — called as onChange({ target: { value } }) to stay compatible with existing handlers
 *  options    — array of strings OR { value, label } objects
 *  disabled   — shows value as read-only, no dropdown
 *  className  — extra CSS class on the trigger
 */
export default function CustomSelect({ value, onChange, options = [], disabled = false, className = '' }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const panelRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Keyboard support
    const handleKeyDown = (e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
        if (e.key === 'Escape') setOpen(false);
    };

    // Normalize options to { value, label }
    const normalized = options.map(o =>
        typeof o === 'string' ? { value: o, label: o } : { value: o.value ?? o.code, label: o.label }
    );

    const selected = normalized.find(o => o.value === value);

    const handleSelect = (val) => {
        onChange({ target: { value: val } });
        setOpen(false);
    };

    return (
        <div className={`cs-wrap ${disabled ? 'cs-disabled' : ''}`} ref={wrapRef}>
            <button
                type="button"
                className={`cs-trigger input-field ${open ? 'cs-trigger-open' : ''} ${className}`}
                onClick={() => !disabled && setOpen(o => !o)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="cs-display">{selected?.label ?? value}</span>
                {!disabled && (
                    <ChevronDown size={15} className={`cs-arrow ${open ? 'cs-arrow-up' : ''}`} />
                )}
            </button>

            {open && (
                <div className="cs-panel" role="listbox" ref={panelRef}>
                    {normalized.map(opt => {
                        const isSelected = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`cs-option ${isSelected ? 'cs-option-selected' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                <span>{opt.label}</span>
                                {isSelected && <Check size={13} strokeWidth={3} className="cs-check" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
