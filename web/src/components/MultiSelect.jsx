import { useEffect, useRef, useState } from 'react';

/* Sélection multiple avec puces bleues (comme st.multiselect) et liste déroulante. */
export default function MultiSelect({ label, options, value, onChange }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const fermer = e => {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert]);

  const basculer = nom => onChange(value.includes(nom) ? value.filter(v => v !== nom) : options.filter(o => o === nom || value.includes(o)));
  const restantes = options.filter(o => !value.includes(o));

  return (
    <div className="pk-field" ref={ref}>
      <span className="pk-field-label">{label}</span>
      <div className="pk-multi">
        <div className="pk-multi-box" onClick={() => setOuvert(o => !o)}>
          <div className="pk-tags">
            {value.map(v => (
              <span className="pk-tag" key={v}>
                {v}
                <button
                  type="button"
                  aria-label={`Retirer ${v}`}
                  onClick={e => {
                    e.stopPropagation();
                    basculer(v);
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="pk-multi-ctl">
            {value.length > 0 && (
              <button
                type="button"
                aria-label="Tout effacer"
                className="pk-clear"
                onClick={e => {
                  e.stopPropagation();
                  onChange([]);
                }}
              >
                ×
              </button>
            )}
            <span className="pk-chevron" aria-hidden="true">
              ⌄
            </span>
          </div>
        </div>
        {ouvert && (
          <ul className="pk-menu" role="listbox" aria-multiselectable="true">
            {restantes.length === 0 && <li className="pk-menu-empty">Aucune autre option</li>}
            {restantes.map(o => (
              <li key={o} role="option" aria-selected="false" onClick={() => basculer(o)}>
                {o}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
