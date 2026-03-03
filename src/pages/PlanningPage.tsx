import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type AffectationType = 'installation' | 'sav' | 'maintenance' | 'etude';

interface Affectation {
  id: string;
  technicien_nom: string;
  technicien_initiales: string;
  chantier_id: string | null;
  chantier_nom: string;
  date_debut: string;
  date_fin: string;
  type: AffectationType;
  notes: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<AffectationType, { label: string; color: string; bg: string; borderColor: string }> = {
  installation: { label: 'Installation', color: '#2563EB', bg: '#EFF6FF', borderColor: '#2563EB' },
  sav: { label: 'SAV', color: '#DC2626', bg: '#FEF2F2', borderColor: '#DC2626' },
  maintenance: { label: 'Maintenance', color: '#16A34A', bg: '#F0FDF4', borderColor: '#16A34A' },
  etude: { label: 'Étude', color: '#7C3AED', bg: '#FAF5FF', borderColor: '#7C3AED' },
};

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDayIndex(date: Date, monday: Date): number {
  const diff = Math.round((date.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(4, diff));
}

function getDemoData(monday: Date): Affectation[] {
  const mon = formatDate(monday);
  const tue = formatDate(addDays(monday, 1));
  const wed = formatDate(addDays(monday, 2));
  const thu = formatDate(addDays(monday, 3));
  const fri = formatDate(addDays(monday, 4));
  return [
    { id: 'demo-1', technicien_nom: 'Thomas D.', technicien_initiales: 'TD', chantier_id: null, chantier_nom: 'Collège J.M. — Montage hottes', date_debut: mon, date_fin: wed, type: 'installation', notes: null, created_at: mon },
    { id: 'demo-2', technicien_nom: 'Thomas D.', technicien_initiales: 'TD', chantier_id: null, chantier_nom: 'Mairie — Étude', date_debut: thu, date_fin: thu, type: 'etude', notes: null, created_at: mon },
    { id: 'demo-3', technicien_nom: 'Marc L.', technicien_initiales: 'ML', chantier_id: null, chantier_nom: 'EHPAD — Livraison froid', date_debut: mon, date_fin: tue, type: 'installation', notes: null, created_at: mon },
    { id: 'demo-4', technicien_nom: 'Marc L.', technicien_initiales: 'ML', chantier_id: null, chantier_nom: 'BNP — SAV urgent', date_debut: wed, date_fin: wed, type: 'sav', notes: null, created_at: mon },
    { id: 'demo-5', technicien_nom: 'Julie M.', technicien_initiales: 'JM', chantier_id: null, chantier_nom: 'Gr. Pasteur — Maint.', date_debut: mon, date_fin: mon, type: 'maintenance', notes: null, created_at: mon },
    { id: 'demo-6', technicien_nom: 'Julie M.', technicien_initiales: 'JM', chantier_id: null, chantier_nom: 'Collège J.M. — Formation', date_debut: thu, date_fin: fri, type: 'installation', notes: null, created_at: mon },
    { id: 'demo-7', technicien_nom: 'Pierre B.', technicien_initiales: 'PB', chantier_id: null, chantier_nom: 'EHPAD Vincennes — Installation complète', date_debut: mon, date_fin: fri, type: 'installation', notes: null, created_at: mon },
  ];
}

export default function PlanningPage() {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    technicien_nom: '',
    technicien_initiales: '',
    chantier_nom: '',
    date_debut: '',
    date_fin: '',
    type: 'installation' as AffectationType,
    notes: '',
  });

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentMonday, i));
  const friday = addDays(currentMonday, 4);
  const monthName = MONTH_NAMES[currentMonday.getMonth()];
  const year = currentMonday.getFullYear();

  const fetchAffectations = useCallback(async () => {
    setLoading(true);
    try {
      const weekStart = formatDate(currentMonday);
      const weekEnd = formatDate(addDays(currentMonday, 4));
      const { data, error } = await supabase
        .from('planning_affectations')
        .select('*')
        .or(`date_debut.lte.${weekEnd},date_fin.gte.${weekStart}`)
        .order('technicien_nom', { ascending: true });
      if (error) throw error;
      setAffectations(data || []);
    } catch {
      setAffectations([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonday]);

  useEffect(() => {
    fetchAffectations();
  }, [fetchAffectations]);

  const handleSubmit = async () => {
    if (!form.technicien_nom || !form.chantier_nom || !form.date_debut || !form.date_fin) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('planning_affectations').insert({
        technicien_nom: form.technicien_nom.trim(),
        technicien_initiales: form.technicien_initiales.trim() || form.technicien_nom.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        chantier_nom: form.chantier_nom.trim(),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        type: form.type,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      toast.success('Affectation ajoutée');
      setShowModal(false);
      setForm({ technicien_nom: '', technicien_initiales: '', chantier_nom: '', date_debut: '', date_fin: '', type: 'installation', notes: '' });
      fetchAffectations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const technicians: string[] = [];
  const techMap: Record<string, Affectation[]> = {};
  for (const aff of affectations) {
    if (!techMap[aff.technicien_nom]) {
      techMap[aff.technicien_nom] = [];
      technicians.push(aff.technicien_nom);
    }
    techMap[aff.technicien_nom].push(aff);
  }

  interface PlacedBlock {
    aff: Affectation;
    colStart: number;
    colEnd: number;
  }

  function getPlacedBlocks(techAffectations: Affectation[]): PlacedBlock[] {
    return techAffectations.map(aff => {
      const startDate = new Date(aff.date_debut + 'T00:00:00');
      const endDate = new Date(aff.date_fin + 'T00:00:00');
      let colStart = getDayIndex(startDate, currentMonday);
      let colEnd = getDayIndex(endDate, currentMonday);
      if (startDate < currentMonday) colStart = 0;
      if (endDate > friday) colEnd = 4;
      return { aff, colStart, colEnd };
    }).filter(b => b.colStart <= 4 && b.colEnd >= 0);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      {/* Week navigation */}
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
          Planning équipe — {monthName} {year}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setCurrentMonday(addDays(currentMonday, -7))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}
            aria-label="Semaine prÃ©cÃ©dente"
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 14, color: '#6B7280' }}>
            Semaine du {currentMonday.getDate()} au {friday.getDate()} {monthName.toLowerCase()}
          </span>
          <button
            onClick={() => setCurrentMonday(addDays(currentMonday, 7))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}
            aria-label="Semaine suivante"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            backgroundColor: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 500,
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={15} />
          Ajouter
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 className="animate-spin" size={32} color="#6B7280" />
          </div>
        ) : (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}>
            {/* Day header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '150px repeat(5, 1fr)',
              borderBottom: '1px solid #F3F4F6',
            }}>
              <div style={{ borderRight: '1px solid #F3F4F6', padding: '12px 0' }} />
              {weekDays.map((day, i) => (
                <div key={i} style={{
                  textAlign: 'center',
                  padding: '10px 0',
                  borderRight: i < 4 ? '1px solid #F3F4F6' : 'none',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{DAY_NAMES[i]}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{day.getDate()}</div>
                </div>
              ))}
            </div>

            {/* Technician rows */}
            {technicians.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>
                Aucune affectation cette semaine
              </div>
            ) : (
              technicians.map((techName, rowIdx) => {
                const blocks = getPlacedBlocks(techMap[techName]);
                return (
                  <div
                    key={techName}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '150px repeat(5, 1fr)',
                      minHeight: 80,
                      borderBottom: rowIdx < technicians.length - 1 ? '1px solid #F3F4F6' : 'none',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 500, color: '#6B7280',
                      borderRight: '1px solid #F3F4F6', padding: '8px 12px',
                    }}>
                      {techName}
                    </div>
                    {weekDays.map((_, i) => (
                      <div key={i} style={{
                        borderRight: i < 4 ? '1px solid #F3F4F6' : 'none',
                        minHeight: 80,
                      }} />
                    ))}
                    {blocks.map((block) => {
                      const cfg = TYPE_CONFIG[block.aff.type];
                      const colSpan = block.colEnd - block.colStart + 1;
                      return (
                        <div
                          key={block.aff.id}
                          style={{
                            position: 'absolute',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            left: `calc(150px + ${block.colStart} * ((100% - 150px) / 5) + 4px)`,
                            width: `calc(${colSpan} * ((100% - 150px) / 5) - 8px)`,
                            backgroundColor: cfg.bg,
                            color: cfg.color,
                            borderLeft: `3px solid ${cfg.borderColor}`,
                            borderRadius: 6,
                            padding: '6px 8px',
                            fontSize: 12,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            zIndex: 2,
                            cursor: 'default',
                          }}
                          title={block.aff.chantier_nom}
                        >
                          {block.aff.chantier_nom}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16, padding: '10px 0' }}>
          {(Object.entries(TYPE_CONFIG) as [AffectationType, typeof TYPE_CONFIG[AffectationType]][]).map(([, cfg]) => (
            <div key={cfg.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: cfg.color }} />
              <span style={{ fontSize: 13, color: '#6B7280' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, backgroundColor: 'rgba(0,0,0,0.4)',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '1px solid #E5E7EB',
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Nouvelle affectation</h2>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Planifier un technicien sur un chantier</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="#6B7280" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Technicien *</label>
                <input
                  value={form.technicien_nom}
                  onChange={e => setForm(f => ({ ...f, technicien_nom: e.target.value }))}
                  placeholder="Ex: Thomas D."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Chantier *</label>
                <input
                  value={form.chantier_nom}
                  onChange={e => setForm(f => ({ ...f, chantier_nom: e.target.value }))}
                  placeholder="Ex: Collège J.M. — Montage hottes"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Début *</label>
                  <input type="date" lang="fr-FR" placeholder="jj/mm/aaaa" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Fin *</label>
                  <input type="date" lang="fr-FR" placeholder="jj/mm/aaaa" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Type *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(Object.entries(TYPE_CONFIG) as [AffectationType, typeof TYPE_CONFIG[AffectationType]][]).map(([key, cfg]) => (
                    <button key={key}
                      onClick={() => setForm(f => ({ ...f, type: key as AffectationType }))}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                        border: form.type === key ? `2px solid ${cfg.color}` : '1px solid #D1D5DB',
                        backgroundColor: form.type === key ? cfg.bg : '#fff',
                        color: form.type === key ? cfg.color : '#6B7280', cursor: 'pointer',
                      }}>{cfg.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="Notes optionnelles..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #E5E7EB' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', backgroundColor: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  backgroundColor: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                }}>
                {submitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
