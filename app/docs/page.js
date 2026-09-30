'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '../components/Icons';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/openapi.json')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading OpenAPI spec:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading API Documentation...</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="app-shell" style={{ padding: '20px', textAlign: 'center' }}>
        <p>Failed to load API specification.</p>
      </div>
    );
  }

  // Parse paths into a flat endpoint list
  const endpoints = [];
  Object.entries(spec.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, def]) => {
      endpoints.push({
        path,
        method: method.toUpperCase(),
        tag: def.tags ? def.tags[0] : 'General',
        summary: def.summary || '',
        description: def.description || '',
        parameters: def.parameters || [],
        requestBody: def.requestBody,
        responses: def.responses || {}
      });
    });
  });

  const tags = ['All', ...(spec.tags || []).map(t => t.name)];

  const filtered = endpoints.filter(ep => {
    const matchesTag = activeTag === 'All' || ep.tag === activeTag;
    const matchesSearch = !search || ep.path.toLowerCase().includes(search.toLowerCase()) || ep.summary.toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const getMethodBadge = (m) => {
    const colors = {
      GET: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
      POST: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
      PUT: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
      PATCH: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
      DELETE: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
    };
    const c = colors[m] || { bg: 'rgba(255,255,255,0.1)', text: '#fff' };
    return (
      <span style={{
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        background: c.bg,
        color: c.text,
        letterSpacing: '0.5px'
      }}>
        {m}
      </span>
    );
  };

  return (
    <div className="app-shell" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Topbar */}
      <div className="screen-topbar">
        <Link href="/" className="circle-icon-btn" aria-label="Back">
          <ChevronLeftIcon size={20} color="var(--text-primary, #fff)" />
        </Link>
        <h1 className="screen-title">API Documentation</h1>
        <div style={{ width: '40px' }} />
      </div>

      {/* Hero Banner */}
      <div style={{
        margin: '16px 0',
        padding: '24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.08))',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>
          OpenAPI v{spec.info.version}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>{spec.info.title}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          {spec.info.description}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search endpoints (e.g. /vouchers, transfer)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'var(--card-bg, #1a1b23)',
            border: '1px solid var(--border-color, #2d3139)',
            color: '#fff',
            fontSize: '13px'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid ' + (activeTag === t ? '#3b82f6' : 'var(--border-color, #2d3139)'),
                background: activeTag === t ? '#3b82f6' : 'var(--card-bg, #1a1b23)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((ep, idx) => (
          <div
            key={idx}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--card-bg, #1a1b23)',
              border: '1px solid var(--border-color, #2d3139)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getMethodBadge(ep.method)}
              <code style={{ fontSize: '13px', fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>
                {ep.path}
              </code>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              {ep.summary}
            </p>

            {ep.parameters.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <strong>Query Parameters:</strong>{' '}
                {ep.parameters.map(p => `${p.name} (${p.schema?.type || 'string'})`).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
