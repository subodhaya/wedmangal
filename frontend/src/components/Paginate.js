import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Paginate.css';

function Paginate({ pages, page, keyword = '', isAdmin = false, handlePageChange }) {
  const navigate = useNavigate();

  if (pages <= 1) return null;

  const goTo = (p) => {
    if (handlePageChange) {
      handlePageChange(p);
    } else {
      const base = isAdmin ? '/admin/productlist' : '/';
      const q = keyword ? keyword.split('?keyword=')[1]?.split('&')[0] || '' : '';
      navigate(`${base}?keyword=${q}&page=${p}`);
    }
  };

  // build page numbers with ellipsis
  const getPages = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
      range.push(i);
    }
    if (range[0] > 1) {
      if (range[0] > 2) range.unshift('...');
      range.unshift(1);
    }
    if (range[range.length - 1] < pages) {
      if (range[range.length - 1] < pages - 1) range.push('...');
      range.push(pages);
    }
    return range;
  };

  return (
    <div className="pg-root">
      {/* Prev */}
      <button
        className={`pg-btn pg-arrow ${page === 1 ? 'pg-disabled' : ''}`}
        onClick={() => goTo(page - 1)}
        disabled={page === 1}
      >
        ← Prev
      </button>

      {/* Numbers */}
      <div className="pg-numbers">
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pg-btn ${p === page ? 'pg-active' : ''}`}
              onClick={() => goTo(p)}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Next */}
      <button
        className={`pg-btn pg-arrow ${page === pages ? 'pg-disabled' : ''}`}
        onClick={() => goTo(page + 1)}
        disabled={page === pages}
      >
        Next →
      </button>
    </div>
  );
}

export default Paginate;