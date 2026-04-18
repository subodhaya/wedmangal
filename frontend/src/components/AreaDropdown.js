import React, { useState, useRef, useEffect } from 'react';
import './AreaDropdown.css';

const CHENNAI_AREAS = [
  'Adambakkam', 'Adyar', 'Alandur', 'Alapakkam', 'Alwarpet', 'Alwarthirunagar',
  'Ambattur', 'Ambattur Estate', 'Aminjikarai', 'Anakaputhur', 'Anna Nagar',
  'Anna Nagar East', 'Anna Nagar West', 'Arcot Road', 'Arumbakkam', 'Ashok Nagar',
  'Athipet', 'Avadi', 'Ayanavaram', 'Ayapakkam', 'Basin Bridge', 'Besant Nagar',
  'Chengalpattu', 'Chetpet', 'Chitlapakkam', 'Chitlapakkam East', 'Choolai',
  'Choolaimedu', 'Chromepet', 'Egmore', 'Ekkattuthangal', 'Gerugambakkam',
  'Gopalapuram', 'Guindy', 'Gummidipoondi', 'Injambakkam', 'Irumbuliyur',
  'Iyyappanthangal', 'Jafferkhanpet', 'Kadapakkam', 'Kanathur', 'Kattankulathur',
  'Kattupakkam', 'Keelambakkam', 'Kilpauk', 'Kodambakkam', 'Kolathur', 'Korattur',
  'Korukkupet', 'Kotturpuram', 'Kovalam', 'Kovur', 'Koyambedu', 'Madhavaram',
  'Madipakkam', 'Maduravoyal', 'Maduvinkarai', 'Mambalam', 'Manali', 'Mandaveli',
  'Mangadu', 'Maraimalai Nagar', 'Medavakkam', 'Meenambakkam', 'Minjur', 'Mogappair',
  'Moovarasampet', 'Mudichur', 'Mugalivakkam', 'Mylapore', 'Nandambakkam',
  'Nanganallur', 'Neelankarai', 'Nemam', 'Nerkundram', 'Nolambur', 'Nungambakkam',
  'Oragadam', 'Padappai', 'Padi', 'Pallavaram', 'Pallikaranai', 'Pammal',
  'Pattabiram', 'Perambur', 'Perungalathur', 'Perungudi', 'Ponneri', 'Poonamallee',
  'Porur', 'Pozhichalur', 'Puliyanthope', 'Puzhuthivakkam', 'Ramapuram', 'Red Hills',
  'Royapettah', 'Royapuram', 'Saidapet','Saligramam', 'Selaiyur', 'Selaiyur East', 'Sembakkam',
  'Sholinganallur', 'Sithalapakkam', 'Sriperumbudur', 'St. Thomas Mount', 'T Nagar',
  'Tambaram', 'Thirumazhisai', 'Thirumullaivoyal', 'Thiruvanmiyur', 'Thiruverkadu',
  'Thiruvottiyur', 'Thoraipakkam', 'Tondiarpet', 'Triplicane', 'Urapakkam',
  'Vadapalani', 'Valasaravakkam', 'Vanagaram', 'Vandalur', 'Velachery', 'Vepery',
  'Vichoor', 'Virugambakkam', 'West Mambalam', 'Wimco Nagar',
];

function AreaDropdown({ value, onChange, className = '' }) {
  const [search, setSearch]   = useState('');
  const [open, setOpen]       = useState(false);
  const containerRef          = useRef(null);
  const inputRef              = useRef(null);

  const filtered = search.trim()
    ? CHENNAI_AREAS.filter(a => a.toLowerCase().includes(search.toLowerCase()))
    : CHENNAI_AREAS;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (area) => {
    onChange(area);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div
      className={`city-dropdown-wrap ${className}`}
      ref={containerRef}
      aria-label="Filter by area"
    >
      {/* Trigger button */}
      <button
        type="button"
        className={`city-trigger ${value ? 'has-value' : ''}`}
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="city-pin">📍</span>
        <span className="city-label">{value || 'All Areas'}</span>
        {value
          ? <span className="city-clear-x" onClick={handleClear} aria-label="Clear area">✕</span>
          : <span className="city-chevron">{open ? '▲' : '▼'}</span>
        }
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="city-panel" role="listbox" aria-label="Chennai areas">
          <div className="city-search-wrap">
            <input
              ref={inputRef}
              type="text"
              className="city-search-input"
              placeholder="Search area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search Chennai areas"
            />
            {search && (
              <button className="city-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
            )}
          </div>

          <ul className="city-list">
            <li
              className={`city-option ${!value ? 'active' : ''}`}
              onClick={() => handleSelect('')}
              role="option"
              aria-selected={!value}
            >
              All Areas
            </li>
            {filtered.length > 0
              ? filtered.map(area => (
                  <li
                    key={area}
                    className={`city-option ${value === area ? 'active' : ''}`}
                    onClick={() => handleSelect(area)}
                    role="option"
                    aria-selected={value === area}
                  >
                    {area}
                  </li>
                ))
              : <li className="city-no-result">No areas found</li>
            }
          </ul>
        </div>
      )}
    </div>
  );
}

export default AreaDropdown;