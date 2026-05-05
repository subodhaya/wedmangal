import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';  // ✅ one import at top
import Product from '../components/Product';
import Loader from '../components/Loader';
import Message from '../components/Message';
import Paginate from '../components/Paginate';
import FilterBar from '../components/FilterBar';
import api from '../utils/api';
import './CategoryScreen.css';

const CATEGORY_LABELS = {
  Makeup_Artist:    'Makeup Artists',
  Photographers:    'Photographers',
  Caterers:         'Caterers',
  Planners:         'Event Planners',
  Halls:            'Halls',
  Decorators:       'Decorators',
  Mehandi_Artist:   'Mehandi Artists',
  Invitation:       'Invitation',
  Jewellery:        'Jewellery',
  DJ_Artist:        'DJ Artists',
  Entertainment:    'Music & Entertainment',
  Travel_Transport: 'Travel & Transport',
  Pandit:           'Pandit',
};

function CategoryScreen() {
  const { category } = useParams();   // ✅ inside the component
  const navigate     = useNavigate();
  const location     = useLocation();

  // ✅ Helmet inside the component, using category from useParams
  const label = CATEGORY_LABELS[category] || category.replace(/_/g, ' ');
  const title = label;

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const pageNumber  = Number(queryParams.get('page') || 1);

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [filters, setFilters]   = useState({ sort: 'newest' });

  useEffect(() => {
    setFilters({ sort: 'newest' });
  }, [category]);

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoading(true); setError('');
        const params = {
          keyword: category,
          page: pageNumber,
          ...(filters.sort         && { sort: filters.sort }),
          ...(filters.city         && { city: filters.city }),
          ...(filters.area_name    && { area_name: filters.area_name }),
          ...(filters.min_price    && { min_price: filters.min_price }),
          ...(filters.max_price    && { max_price: filters.max_price }),
          ...(filters.min_rating   && { min_rating: filters.min_rating }),
          ...(filters.food_type    && { food_type: filters.food_type }),
          ...(filters.shoot_type   && { shoot_type: filters.shoot_type }),
          ...(filters.makeup_type  && { makeup_type: filters.makeup_type }),
          ...(filters.trial        && { trial: filters.trial }),
          ...(filters.hall_ac      && { hall_ac: filters.hall_ac }),
          ...(filters.hall_parking    && { hall_parking: filters.hall_parking }),
          ...(filters.hall_capacity   && { hall_capacity: filters.hall_capacity }),
          ...(filters.dj_venue        && { dj_venue: filters.dj_venue }),
          ...(filters.dj_equipment    && { dj_equipment: filters.dj_equipment }),
          ...(filters.mehandi_type    && { mehandi_type: filters.mehandi_type }),
          ...(filters.home_visit      && { home_visit: filters.home_visit }),
        };
        const { data } = await api.get('/api/products/all', { params });
        if (!isMounted) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setPage(Number(data.page) || 1);
        setPages(Number(data.pages) || 1);
      } catch {
        if (!isMounted) return;
        setError('Failed to fetch services. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProducts();
    return () => { isMounted = false; };
  }, [category, pageNumber, filters]);

  const handlePageChange = (newPage) => {
    navigate(`/category/${category}?page=${Math.max(1, Number(newPage) || 1)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="cs-page">

      {/* ✅ Helmet inside return, using dynamic values */}
      <Helmet>
        <title>{title} for Weddings in Tamil Nadu | WedMangal</title>
        <meta name="description" content={`Book trusted ${title.toLowerCase()} for your wedding in Tamil Nadu. Verified vendors on WedMangal.`} />
        <meta property="og:title" content={`${title} | WedMangal`} />
        <meta property="og:image" content="https://www.wedmangal.com/og-cover.jpg" />
        <link rel="canonical" href={`https://www.wedmangal.com/category/${category}`} />
      </Helmet>

      {/* Header */}
      <div className="cs-header">
        <button className="cs-back" onClick={() => navigate('/')}>← Back</button>
        <div className="cs-header-text">
          <h1 className="cs-title">{label}</h1>
          <p className="cs-subtitle">
            {loading ? 'Loading...' : `${products.length > 0 ? `${products.length} vendors found` : 'No vendors found'} in Chennai`}
          </p>
        </div>
      </div>

      {/* FilterBar */}
      <div className="cs-filters">
        <FilterBar
          category={category}
          filters={filters}
          onChange={(updater) => {
            setFilters(updater);
            navigate(`/category/${category}?page=1`);
          }}
        />
      </div>

      {/* Grid */}
      <div className="cs-body">
        {loading ? <Loader /> : error ? <Message variant="danger">{error}</Message> :
          products.length === 0 ? <Message>No vendors found for this category.</Message> : (
            <>
              <div className="product-grid">
                {products.map(product => (
                  <div key={product._id} className="product-card">
                    <Product product={product} />
                  </div>
                ))}
              </div>
              <div className="paginate-container">
                <Paginate
                  page={page}
                  pages={pages}
                  keyword={category}
                  handlePageChange={handlePageChange}
                />
              </div>
            </>
          )}
      </div>
    </div>
  );
}

export default CategoryScreen;
