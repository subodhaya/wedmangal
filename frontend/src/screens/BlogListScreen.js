import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import './BlogListScreen.css';

const CATEGORIES = [
  { value: '',                label: 'All Posts' },
  { value: 'tamil-weddings',  label: 'Tamil Weddings' },
  { value: 'wedding-rituals', label: 'Wedding Rituals' },
  { value: 'wedding-tips',    label: 'Wedding Tips' },
  { value: 'vendor-tips',     label: 'Vendor Tips' },
  { value: 'real-weddings',   label: 'Real Weddings' },
];

function BlogCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="bl-card">
      <div className="bl-card-img-wrap">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="bl-card-img" />
        ) : (
          <div className="bl-card-img-placeholder">💍</div>
        )}
        <span className="bl-category-badge">
          {CATEGORIES.find(c => c.value === post.category)?.label || post.category}
        </span>
      </div>
      <div className="bl-card-body">
        <h2 className="bl-card-title">{post.title}</h2>
        <p className="bl-card-excerpt">{post.excerpt}</p>
        <div className="bl-card-meta">
          <span>✍️ {post.author}</span>
          <span>🕐 {post.read_time} min read</span>
          <span>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogListScreen() {
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/api/blog/', { params: activeCategory ? { category: activeCategory } : {} })
      .then(({ data }) => setPosts(data))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="bl-page">
      <Helmet>
        <title>Wedding Blog — Tamil Wedding Rituals, Tips & Traditions | WedMangal</title>
        <meta name="description" content="Read about Tamil wedding rituals, caste traditions, wedding planning tips and vendor advice on the WedMangal blog." />
        <link rel="canonical" href="https://www.wedmangal.com/blog" />
      </Helmet>

      <div className="bl-hero">
        <h1 className="bl-hero-title">WedMangal Blog</h1>
        <p className="bl-hero-sub">Wedding rituals, traditions, planning tips and more</p>
      </div>

      {/* Category filter */}
      <div className="bl-filter-bar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`bl-filter-btn${activeCategory === cat.value ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="bl-container">
        {loading ? (
          <div className="bl-loading">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="bl-empty">
            <span>📝</span>
            <p>No posts yet — check back soon!</p>
          </div>
        ) : (
          <div className="bl-grid">
            {posts.map(post => <BlogCard key={post.id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  );
}
