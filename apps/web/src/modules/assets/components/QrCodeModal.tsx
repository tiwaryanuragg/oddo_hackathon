import { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { assetsApi } from '../api/assets.api';

interface QrCodeModalProps {
  open:    boolean;
  onClose: () => void;
  assetId: string;
  assetTag: string;
  assetName: string;
}

export function QrCodeModal({ open, onClose, assetId, assetTag, assetName }: QrCodeModalProps) {
  const [format, setFormat]   = useState<'svg' | 'png'>('svg');
  const [loading, setLoading] = useState(false);

  const svgUrl = assetsApi.getQrUrl(assetId, 'svg');
  const pngUrl = assetsApi.getQrUrl(assetId, 'png');

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url    = format === 'svg' ? svgUrl : pngUrl;
      const resp   = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      });
      const blob   = await resp.blob();
      const link   = document.createElement('a');
      link.href    = URL.createObjectURL(blob);
      link.download = `${assetTag}-qr.${format}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asset QR Code"
      description={`${assetTag} — ${assetName}`}
      size="sm"
      footer={
        <>
          {/* Format toggle */}
          <div style={{ display: 'flex', gap: 6, marginRight: 'auto' }}>
            {(['svg', 'png'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  background: format === f ? 'var(--color-accent)' : 'transparent',
                  borderColor: format === f ? 'var(--color-accent)' : 'var(--color-border)',
                  color: format === f ? '#fff' : 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            loading={loading}
            leftIcon={<Download size={14} />}
          >
            Download {format.toUpperCase()}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-5)',
        }}
      >
        {/* QR image */}
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: 'var(--radius-lg)',
            background: '#fff',
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <img
            src={svgUrl}
            alt={`QR Code for ${assetTag}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Info */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--color-accent)',
              letterSpacing: '0.08em',
            }}
          >
            {assetTag}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Scan to view asset details
          </div>
        </div>

        {/* URL preview */}
        <div
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {`${import.meta.env.VITE_APP_URL ?? 'http://localhost:5173'}/assets/${assetId}`}
        </div>
      </div>
    </Modal>
  );
}
