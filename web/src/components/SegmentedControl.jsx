export default function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div className="pk-field">
      <span className="pk-field-label" id={`seg-${label}`}>
        {label}
      </span>
      <div className="pk-seg" role="group" aria-labelledby={`seg-${label}`}>
        {options.map(o => (
          <button key={o.value} type="button" className={o.value === value ? 'on' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
