import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { uploadPhoto, ApiError } from '../../lib/api';

const CANVAS = 512;

/** Upload tab: pick/take a photo, reposition + zoom on canvas, then use it. */
export default function UploadTab() {
  const { setModel, toast } = useApp();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    // cover-fit, then apply zoom + pan
    const cover = Math.max(CANVAS / img.width, CANVAS / img.height);
    const scale = cover * zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (CANVAS - dw) / 2 + offset.x;
    const dy = (CANVAS - dh) / 2 + offset.y;
    ctx.drawImage(img, dx, dy, dw, dh);
  }, [zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file (JPG, PNG or WebP).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('That photo is over 10MB — please pick a smaller one.', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setHasImage(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => toast('Could not read that photo. Try another one.', 'error');
    img.src = url;
  };

  const usePhoto = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    setUploading(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9),
      );
      if (!blob) throw new Error('Could not process the photo');
      const uploaded = await uploadPhoto(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
      setModel({ kind: 'upload', imageUrl: uploaded.url });
      toast('Photo ready — let\'s style it!', 'success');
      navigate('/studio');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="card">
        <label className="label" htmlFor="photo-input">
          Choose a photo
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="field !py-3"
          onChange={(e) => onFile(e.target.files?.[0])}
          aria-describedby="photo-privacy"
        />
        <p className="mt-1 text-xs text-ink-400">
          On mobile this opens your camera. A clear, front-facing, well-lit photo works best.
        </p>

        <div className="mt-4">
          {hasImage ? (
            <>
              <div
                className="relative mx-auto aspect-square w-full max-w-[420px] cursor-grab touch-none overflow-hidden rounded-3xl bg-ink-100 active:cursor-grabbing"
                onPointerDown={(e) => {
                  setDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (drag) setOffset({ x: e.clientX - drag.x, y: e.clientY - drag.y });
                }}
                onPointerUp={() => setDrag(null)}
                role="application"
                aria-label="Reposition photo: drag to move"
              >
                <canvas ref={canvasRef} width={CANVAS} height={CANVAS} className="h-full w-full" />
              </div>
              <div className="mt-4">
                <label className="label" htmlFor="zoom">
                  Zoom
                </label>
                <input
                  id="zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-ink-900"
                  aria-valuetext={`${Math.round(zoom * 100)} percent`}
                />
              </div>
              <button onClick={usePhoto} disabled={uploading} className="btn-primary mt-4 w-full">
                {uploading ? 'Uploading…' : 'Use this photo →'}
              </button>
            </>
          ) : (
            <canvas ref={canvasRef} width={CANVAS} height={CANVAS} className="hidden" aria-hidden="true" />
          )}
        </div>
      </div>

      <div id="photo-privacy" className="card mt-4 border-brand-200 bg-brand-50">
        <h3 className="flex items-center gap-2 font-bold text-ink-900">
          <span aria-hidden="true">🔒</span> Privacy notice
        </h3>
        <p className="mt-1 text-sm text-ink-600">
          Your photo is used only to create your virtual try-on. You control whether it is
          stored or deleted — head to Profile → "Delete my photos" anytime.
        </p>
      </div>
    </div>
  );
}
