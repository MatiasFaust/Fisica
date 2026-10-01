export default function FilterChips({ options, value, onChange }) {
  return (
    <div className="chips" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          className={`chip ${value === option.value ? 'chip--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className="chip__count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
