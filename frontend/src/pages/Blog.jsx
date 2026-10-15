import React, { useState, useEffect, useRef, useCallback } from 'react';
import { blogApi, getStoredUser } from '../services/api';
import './Blog.css';

const CATEGORIES = [
  'ISSUE',
  'DEVELOPMENT_OVERFLOW',
  'TAGGED_ISSUES',
  'BUGS',
  'IMPROVEMENTS',
  'NORMAL_CHAT_MESSAGES'
];

const CATEGORY_LABELS = {
  ISSUE: 'Issue',
  DEVELOPMENT_OVERFLOW: 'Dev Overflow',
  TAGGED_ISSUES: 'Tagged Issues',
  BUGS: 'Bugs',
  IMPROVEMENTS: 'Improvements',
  NORMAL_CHAT_MESSAGES: 'Chat'
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Lightweight ambient particles
function BlogParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        o: Math.random() * 0.3 + 0.05
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${p.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="blog-particles-canvas" />;
}

// Create / Compose Post Modal
function CreatePostModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!title.trim()) { setError('Title is required.'); return; }
    if (!content.trim()) { setError('Content is required.'); return; }
    if (!category) { setError('Please select a category.'); return; }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    setSubmitting(true);
    try {
      await blogApi.createPost(title.trim(), content.trim(), category, tags);
      setSuccess(true);
      setTitle('');
      setContent('');
      setCategory('');
      setTagsInput('');
      if (onCreated) onCreated();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err.message || 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="blog-modal-overlay" onClick={onClose}>
      <div className="blog-modal" onClick={e => e.stopPropagation()}>
        <div className="blog-modal-header">
          <h2 className="blog-modal-title">Compose Post</h2>
          <button className="blog-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {success && <div className="blog-form-success">Post published successfully.</div>}
        {error && <div className="blog-form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="blog-form-group">
            <label className="blog-form-label" htmlFor="blog-title">Title</label>
            <input
              id="blog-title"
              className="blog-form-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Post title..."
              maxLength={200}
              disabled={submitting}
            />
          </div>

          <div className="blog-form-group">
            <label className="blog-form-label" htmlFor="blog-category">Category</label>
            <select
              id="blog-category"
              className="blog-form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={submitting}
            >
              <option value="">— Select category —</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div className="blog-form-group">
            <label className="blog-form-label" htmlFor="blog-content">Content</label>
            <textarea
              id="blog-content"
              className="blog-form-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your post content..."
              maxLength={10000}
              disabled={submitting}
            />
            <div className="blog-form-hint">{content.length} / 10,000</div>
          </div>

          <div className="blog-form-group">
            <label className="blog-form-label" htmlFor="blog-tags">Tags (optional, comma-separated)</label>
            <input
              id="blog-tags"
              className="blog-form-input"
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="consensus, security, pbft..."
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="blog-submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Publishing…' : 'Publish Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Single Post View Modal
function PostViewModal({ post, onClose }) {
  if (!post) return null;

  return (
    <div className="blog-modal-overlay" onClick={onClose}>
      <div className="blog-modal" onClick={e => e.stopPropagation()}>
        <div className="blog-modal-header">
          <span className="blog-post-category-badge">{CATEGORY_LABELS[post.category] || post.category}</span>
          <button className="blog-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <h1 className="blog-post-full-title">{post.title}</h1>

        <div className="blog-post-full-meta">
          <span className="blog-post-author">{post.authorUsername}</span>
          <span className="blog-post-date">{formatDate(post.createdAt)}</span>
        </div>

        <div className="blog-post-full-content">{post.content}</div>

        {post.tags && post.tags.length > 0 && (
          <div className="blog-post-full-tags">
            {post.tags.map((tag, i) => (
              <span key={i} className="blog-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Blog Page
export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [viewPost, setViewPost] = useState(null);
  const searchTimeout = useRef(null);

  const user = getStoredUser();

  const fetchPosts = useCallback(async (category, search) => {
    setLoading(true);
    setError('');
    try {
      const data = await blogApi.getPosts(category || undefined, search || undefined);
      setPosts(data.posts || []);
    } catch (err) {
      setError(err.message || 'Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(selectedCategory, searchQuery);
  }, [selectedCategory, fetchPosts]);

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchPosts(selectedCategory, value);
    }, 400);
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(prev => prev === cat ? '' : cat);
  };

  const handlePostClick = async (post) => {
    try {
      const data = await blogApi.getPost(post.id);
      setViewPost(data.post || post);
    } catch {
      setViewPost(post);
    }
  };

  const handlePostCreated = () => {
    fetchPosts(selectedCategory, searchQuery);
  };

  return (
    <div className="c55-blog-page">
      <BlogParticles />

      <div className="c55-blog-container">
        {/* Header */}
        <div className="blog-header">
          <div className="blog-header-top">
            <div className="blog-title-block">
              <span className="blog-page-label">Community</span>
              <h1 className="blog-page-title">Project <span>Blog</span></h1>
            </div>
            {user && (
              <button
                id="blog-compose-btn"
                className="blog-compose-btn"
                onClick={() => setShowCompose(true)}
              >
                + Compose
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="blog-filters-bar">
            <input
              id="blog-search-input"
              className="blog-search-input"
              type="text"
              placeholder="Search posts…"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
            <div className="blog-category-chips">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`blog-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="blog-loading">
            <div className="blog-loading-spinner" />
            <div className="blog-loading-text">Loading posts…</div>
          </div>
        ) : error ? (
          <div className="blog-error">{error}</div>
        ) : posts.length === 0 ? (
          <div className="blog-empty-state">
            <div className="blog-empty-icon">◇</div>
            <div className="blog-empty-text">No posts yet — be the first to publish</div>
          </div>
        ) : (
          <div className="blog-feed">
            {posts.map(post => (
              <article
                key={post.id}
                className="blog-post-card"
                onClick={() => handlePostClick(post)}
              >
                <div className="blog-post-meta">
                  <span className="blog-post-author">{post.authorUsername}</span>
                  <span className="blog-post-date">{formatDate(post.createdAt)}</span>
                  <span className="blog-post-category-badge">
                    {CATEGORY_LABELS[post.category] || post.category}
                  </span>
                </div>
                <h2 className="blog-post-title">{post.title}</h2>
                <p className="blog-post-excerpt">{post.content}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="blog-post-tags">
                    {post.tags.map((tag, i) => (
                      <span key={i} className="blog-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <CreatePostModal
          onClose={() => setShowCompose(false)}
          onCreated={handlePostCreated}
        />
      )}

      {/* View Post Modal */}
      {viewPost && (
        <PostViewModal
          post={viewPost}
          onClose={() => setViewPost(null)}
        />
      )}
    </div>
  );
}
