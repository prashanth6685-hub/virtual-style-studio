import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { listLooks, deleteLook, createLook, ApiError, type SavedLook } from '../lib/api';
import { garmentDisplayName } from '../lib/catalog';
import { outfitPieceCount } from '../state/outfit';
import { PageTitle, EmptyState, Skeleton, Modal } from '../components/ui';

function outfitSummary(look: SavedLook): string {
  const names: string[] = [];
  const o = look.outfit;
  for (const slot of [o.top, o.bottom, o.dress, o.outerwear, o.shoes] as const) {
    if (slot) names.push(garmentDisplayName(slot.garmentId));
  }
  for (const a of o.accessories ?? []) names.push(garmentDisplayName(a.garmentId));
  return names.slice(0, 4).join(' · ') + (names.length > 4 ? ` +${names.length - 4}` : '');
}

function LookCard({
  look,
  selected,
  onToggleSelect,
  onReuse,
  onDuplicate,
  onDelete,
  compareMode,
}: {
  look: SavedLook;
  selected: boolean;
  onToggleSelect: () => void;
  onReuse: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  compareMode: boolean;
}) {
  return (
    <div className={`card overflow-hidden !p-0 transition ${selected ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="relative aspect-[3/4] bg-ink-100">
        {look.resultImageUrl ? (
          <img src={look.resultImageUrl} alt={look.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl" aria-hidden="true">👗</div>
        )}
        {compareMode && (
          <button
            onClick={onToggleSelect}
            aria-pressed={selected}
            aria-label={selected ? `Deselect ${look.name}` : `Select ${look.name} for comparison`}
            className={`absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-lg shadow-pop ${
              selected ? 'bg-brand-500 text-white' : 'bg-white text-ink-700'
            }`}
          >
            {selected ? '✓' : '+'}
          </button>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-bold text-ink-950">{look.name}</h3>
        <p className="truncate text-xs text-ink-400">{outfitSummary(look)}</p>
        <p className="text-xs text-ink-400">{new Date(look.createdAt).toLocaleDateString()}</p>
        {!compareMode && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={onReuse} className="chip bg-ink-950 text-xs font-bold text-white">Reuse →</button>
            <button onClick={onDuplicate} className="chip bg-ink-100 text-xs font-bold text-ink-700">Duplicate</button>
            <button onClick={onDelete} className="chip bg-red-50 text-xs font-bold text-red-700">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** /looks — saved looks grid + compare mode. */
export default function Looks() {
  const { replaceOutfit, setModel, toast } = useApp();
  const navigate = useNavigate();
  const [looks, setLooks] = useState<SavedLook[] | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<SavedLook | null>(null);

  const load = async () => {
    try {
      setLooks(await listLooks());
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not load looks.', 'error');
      setLooks([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => (looks ?? []).filter((l) => selectedIds.includes(l.id)),
    [looks, selectedIds],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id]));

  const reuse = (look: SavedLook) => {
    replaceOutfit({ ...look.outfit, accessories: look.outfit.accessories ?? [] });
    setModel(look.modelRef);
    toast(`"${look.name}" loaded into the studio.`, 'success');
    navigate('/studio');
  };

  const duplicate = async (look: SavedLook) => {
    try {
      const copy = await createLook({
        name: `${look.name} (copy)`,
        outfit: look.outfit,
        resultImageUrl: look.resultImageUrl ?? undefined,
        modelRef: look.modelRef,
      });
      setLooks((ls) => (ls ? [copy, ...ls] : [copy]));
      toast('Look duplicated.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not duplicate.', 'error');
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteLook(confirmDelete.id);
      setLooks((ls) => (ls ?? []).filter((l) => l.id !== confirmDelete.id));
      toast('Look deleted.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not delete.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="My Looks" sub="Saved outfits — reuse, compare, or remix." />
        {looks && looks.length > 1 && (
          <button
            onClick={() => {
              setCompareMode((m) => !m);
              setSelectedIds([]);
            }}
            className={compareMode ? 'btn-primary mb-5' : 'btn-ghost mb-5'}
            aria-pressed={compareMode}
          >
            {compareMode ? 'Done comparing' : '⚖️ Compare'}
          </button>
        )}
      </div>

      {compareMode && (
        <p className="card mb-4 text-sm text-ink-600" role="status">
          Select up to 4 looks to compare side by side ({selectedIds.length}/4 selected).
        </p>
      )}

      {looks === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : looks.length === 0 ? (
        <EmptyState
          icon="🖼️"
          title="No saved looks yet"
          body="Style something in the studio and save it — it'll live here."
          action={<Link to="/studio" className="btn-accent">Open Studio</Link>}
        />
      ) : compareMode && selected.length > 0 ? (
        <div className={`grid gap-3 ${selected.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {selected.map((look) => (
            <div key={look.id} className="card overflow-hidden !p-0">
              <div className="aspect-[3/4] bg-ink-100">
                {look.resultImageUrl ? (
                  <img src={look.resultImageUrl} alt={look.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl" aria-hidden="true">👗</div>
                )}
              </div>
              <div className="p-3">
                <h3 className="truncate font-bold text-ink-950">{look.name}</h3>
                <p className="text-xs text-ink-400">{outfitSummary(look)} · {outfitPieceCount(look.outfit)} pieces</p>
                <button onClick={() => reuse(look)} className="chip mt-2 bg-ink-950 text-xs font-bold text-white">
                  Reuse →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {looks.map((look) => (
            <LookCard
              key={look.id}
              look={look}
              compareMode={compareMode}
              selected={selectedIds.includes(look.id)}
              onToggleSelect={() => toggleSelect(look.id)}
              onReuse={() => reuse(look)}
              onDuplicate={() => duplicate(look)}
              onDelete={() => setConfirmDelete(look)}
            />
          ))}
        </div>
      )}

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete look?">
        <p className="text-sm text-ink-600">
          Delete <strong>"{confirmDelete?.name}"</strong>? This can't be undone.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Keep</button>
          <button onClick={doDelete} className="btn flex-1 bg-red-700 text-white">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
