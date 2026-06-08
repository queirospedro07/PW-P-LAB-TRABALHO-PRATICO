import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import './Dropdown.css';

export default function Dropdown({ options = [], value, onChange, placeholder = 'Selecionar', showPlaceholder = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className={`dropdown-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className={selected ? 'dropdown-value' : 'dropdown-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <FiChevronDown size={14} className={`dropdown-arrow ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="dropdown-menu">
          {showPlaceholder && placeholder && (
            <div
              className={`dropdown-item ${value === '' ? 'active' : ''}`}
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </div>
          )}
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`dropdown-item ${value === opt.value ? 'active' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
