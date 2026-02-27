import React, { useState } from 'react';
import { Bug, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface ThemeDebugInfo {
  view: 'landing' | 'checkout';
  productId?: string;
  merchantId?: string;
  templateId?: string | null;
  resolutionSource?: string | null;
  primaryColor?: string;
  brandName?: string;
  layoutStyle?: string;
  logoPath?: string | null;
}

interface ThemeDebugBadgeProps {
  info: ThemeDebugInfo;
}

/**
 * Dev-only badge that displays theme resolution details.
 * Only renders in development mode.
 */
export const ThemeDebugBadge: React.FC<ThemeDebugBadgeProps> = ({ info }) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show in development
  if (import.meta.env.PROD || dismissed) return null;

  const sourceColor: Record<string, string> = {
    product: '#22c55e',
    merchant_default: '#3b82f6',
    hardcoded: '#f59e0b',
  };

  const sourceLabel = info.resolutionSource || 'unknown';
  const badgeColor = sourceColor[sourceLabel] || '#6b7280';

  // Log to console for programmatic access
  if (typeof window !== 'undefined') {
    (window as any).__THEME_DEBUG__ = info;
    console.log(
      `%c[ThemeDebug] ${info.view.toUpperCase()}`,
      `color: white; background: ${badgeColor}; padding: 2px 6px; border-radius: 3px; font-weight: bold`,
      info
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 99999,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        lineHeight: 1.4,
        maxWidth: 320,
      }}
    >
      {/* Collapsed badge */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,0,0,0.85)',
            color: 'white',
            border: `2px solid ${badgeColor}`,
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          <Bug size={14} style={{ color: badgeColor }} />
          <span style={{ color: badgeColor, fontWeight: 700 }}>{sourceLabel}</span>
          <ChevronUp size={12} />
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            background: 'rgba(0,0,0,0.92)',
            color: '#e5e7eb',
            border: `2px solid ${badgeColor}`,
            borderRadius: 10,
            padding: 12,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bug size={14} style={{ color: badgeColor }} />
              <span style={{ fontWeight: 700, color: 'white' }}>Theme Debug</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setExpanded(false)} style={{ color: '#9ca3af', cursor: 'pointer', background: 'none', border: 'none' }}>
                <ChevronDown size={14} />
              </button>
              <button onClick={() => setDismissed(true)} style={{ color: '#9ca3af', cursor: 'pointer', background: 'none', border: 'none' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <Row label="View" value={info.view} />
            <Row label="Source" value={sourceLabel} color={badgeColor} />
            <Row label="Template ID" value={info.templateId || '—'} />
            <Row label="Product ID" value={info.productId || '—'} />
            <Row label="Merchant ID" value={info.merchantId || '—'} />
            <hr style={{ border: 'none', borderTop: '1px solid #374151', margin: '2px 0' }} />
            <Row label="Brand" value={info.brandName || '—'} />
            <Row label="Primary" value={info.primaryColor || '—'} color={info.primaryColor} />
            <Row label="Layout" value={info.layoutStyle || '—'} />
            <Row label="Logo" value={info.logoPath ? '✓' : '✗'} />
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
    <span style={{ color: '#9ca3af' }}>{label}</span>
    <span style={{ color: color || '#f3f4f6', fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

export default ThemeDebugBadge;
