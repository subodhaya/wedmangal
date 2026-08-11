import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import TopRatedVendors from '../components/TopRatedVendors';
import './BlogPostScreen.css';

export default function BlogPostScreen() {
  const { slug }            = useParams();
  const [post, setPost]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/api/blog/${slug}/`)
      .then(({ data }) => setPost(data))
      .catch(err => {
        setError(err.response?.status === 404
          ? 'This blog post could not be found.'
          : 'Failed to load post. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="bp-loading">Loading…</div>;
  if (error)   return <div className="bp-error">{error} <Link to="/blog">← Back to Blog</Link></div>;
  if (!post)   return null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'WedMangal',
      logo: { '@type': 'ImageObject', url: 'https://www.wedmangal.com/logo.png' },
    },
    datePublished: post.created_at,
    dateModified: post.updated_at,
    image: post.cover_image_url || 'https://www.wedmangal.com/og-image-1200x630.jpg',
    url: `https://www.wedmangal.com/blog/${post.slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.wedmangal.com/blog/${post.slug}` },
    keywords: post.tags,
  };

  return (
    <div className="bp-page">
      <Helmet>
        <title>{post.title} | WedMangal Blog</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={`https://www.wedmangal.com/blog/${post.slug}`} />
        <meta property="og:type"        content="article" />
        <meta property="og:title"       content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image"       content={post.cover_image_url || 'https://www.wedmangal.com/og-image-1200x630.jpg'} />
        <meta property="og:url"         content={`https://www.wedmangal.com/blog/${post.slug}`} />
        <meta property="article:published_time" content={post.created_at} />
        <meta property="article:modified_time"  content={post.updated_at} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        <meta name="twitter:image"       content={post.cover_image_url || 'https://www.wedmangal.com/og-image-1200x630.jpg'} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="bp-container">
        {/* Back link */}
        <Link to="/blog" className="bp-back">← Back to Blog</Link>

        {/* Header */}
        <header className="bp-header">
          <span className="bp-category">{post.category?.replace(/-/g, ' ')}</span>
          <h1 className="bp-title">{post.title}</h1>
          <div className="bp-meta">
            <span>✍️ {post.author}</span>
            <span>🕐 {post.read_time} min read</span>
            <span>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          {post.tags && (
            <div className="bp-tags">
              {post.tags.split(',').map(tag => (
                <span key={tag} className="bp-tag">{tag.trim()}</span>
              ))}
            </div>
          )}
        </header>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="bp-cover-wrap">
            <img src={post.cover_image_url} alt={post.title} className="bp-cover" />
          </div>
        )}

        {/* Content — rendered as HTML written in admin */}
        <article
          className="bp-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Live "top rated" listings — only renders if the post has a related category */}
        {post.related_category && (
          <TopRatedVendors category={post.related_category} city={post.related_city} />
        )}

        {/* Footer CTA */}
        <div className="bp-cta">
          <p>Looking for wedding vendors in Tamil Nadu?</p>
          <Link to="/" className="bp-cta-btn">Browse Vendors on WedMangal →</Link>
        </div>

        <Link to="/blog" className="bp-back-bottom">← More Articles</Link>
      </div>
    </div>
  );
}
