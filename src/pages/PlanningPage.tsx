import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, User, Briefcase, FileText, Loader2 } from 'lucide-react';
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

const TYPE_CONFIG: Record<AffectationType, { label: string; color: string; bg: string; border: string; badge: string }> = {
  installation: { label: 'Installation', color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  sav: { label: 'SAV', color: '#F97316', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  maintenance: { label: 'Maintenance', color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  etude: { label: 'Étude', color: '#8B5CF6', bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700' },
};

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const DAY_NAMES_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

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

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isDateInRange(date: Date, start: string, end: string): boolean {
  const d = formatDate(date);
  return d >= start && d <= end;
}

export default function PlanningPage() {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentMonday]);

  useEffect(() => {
    fetchAffectations();
  }, [fetchAffectations]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const techniciens = Array.from(
    new Map(affectations.map((a) => [a.technicien_nom, { nom: a.technicien_nom, initiales: a.technicien_initiales || getInitials(a.technicien_nom) }])).values()
  ).sort((a, b) => a.nom.localeCompare(b.nom));

  const existingTechniciens = Array.from(new Set(affectations.map((a) => a.technicien_nom))).sort();

  const handlePrevWeek = () => setCurrentMonday((d) => addDays(d, -7));
  const handleNextWeek = () => setCurrentMonday((d) => addDays(d, 7));
  const handleToday = () => setCurrentMonday(getMonday(new Date()));

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'technicien_nom') {
        const existing = affectations.find((a) => a.technicien_nom === value);
        if (existing) {
          updated.technicien_initiales = existing.technicien_initiales;
        } else {
          updated.technicien_initiales = getInitials(value);
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.technicien_nom.trim() || !form.chantier_nom.trim() || !form.date_debut || !form.date_fin) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (form.date_fin < form.date_debut) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }
    setSubmitting(true);
    try {
      const initiales = form.technicien_initiales || getInitials(form.technicien_nom);
      const { error } = await supabase.from('planning_affectations').insert({
        id: crypto.randomUUID(),
        technicien_nom: form.technicien_nom.trim(),
        technicien_initiales: initiales,
        chantier_nom: form.chantier_nom.trim(),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        type: form.type,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      toast.success('Affectation ajoutée avec succès');
      setShowModal(false);
      setForm({ technicien_nom: '', technicien_initiales: '', chantier_nom: '', date_debut: '', date_fin: '', type: 'installation', notes: '' });
      fetchAffectations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getAffectationsForCell = (technicienNom: string, day: Date) => {
    return affectations.filter(
      (a) => a.technicien_nom === technicienNom && isDateInRange(day, a.date_debut, a.date_fin)
    );
  };

  const getAffectationsForTechnicien = (technicienNom: string) => {
    return affectations.filter((a) => a.technicien_nom === technicienNom);
  };

  const isToday = (day: Date) => formatDate(day) === formatDate(new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="max-w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestion des affectations techniciens</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            Ajouter une affectation
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Week navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Semaine suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400 hidden sm:block" />
            <span className="text-sm font-semibold text-gray-800">
              Semaine du {formatDisplayDate(currentMonday)}
            </span>
          </div>
          <button
            onClick={handleToday}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-500">Chargement du planning...</span>
          </div>
        ) : isMobile ? (
          /* Mobile: list view */
          <div className="space-y-4">
            {techniciens.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Aucune affectation cette semaine</p>
              </div>
            ) : (
              techniciens.map((tech) => {
                const techAffectations = getAffectationsForTechnicien(tech.nom);
                return (
                  <div key={tech.nom} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
                      >
                        {tech.initiales}
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{tech.nom}</span>
                      <span className="ml-auto text-xs text-gray-400">{techAffectations.length} affectation(s)</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {techAffectations.length === 0 ? (
                        <p className="text-sm text-gray-400 px-4 py-3">Aucune affectation</p>
                      ) : (
                        techAffectations.map((aff) => {
                          const cfg = TYPE_CONFIG[aff.type];
                          return (
                            <div key={aff.id} className="px-4 py-3 flex items-start gap-3">
                              <div
                                className="w-1 rounded-full flex-shrink-0 self-stretch"
                                style={{ backgroundColor: cfg.color, minHeight: '1.5rem' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{aff.chantier_nom}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(aff.date_debut).toLocaleDateString('fr-FR')} → {new Date(aff.date_fin).toLocaleDateString('fr-FR')}
                                </p>
                                {aff.notes && <p className="text-xs text-gray-400 mt-1 italic truncate">{aff.notes}</p>}
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Desktop: grid view */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44 border-r border-gray-200">
                      Technicien
                    </th>
                    {weekDays.map((day, i) => (
                      <th
                        key={i}
                        className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider ${
                          isToday(day) ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
                        } ${i < 4 ? 'border-r border-gray-200' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{DAY_NAMES[i]}</span>
                          <span
                            className={`text-base font-bold ${
                              isToday(day)
                                ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs'
                                : 'text-gray-700'
                            }`}
                          >
                            {day.getDate()}
                          </span>
                          <span className="text-gray-400 font-normal normal-case">
                            {day.toLocaleDateString('fr-FR', { month: 'short' })}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {techniciens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-gray-400">
                        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Aucune affectation pour cette semaine</p>
                        <p className="text-sm mt-1">Cliquez sur "Ajouter une affectation" pour commencer</p>
                      </td>
                    </tr>
                  ) : (
                    techniciens.map((tech, rowIdx) => (
                      <tr
                        key={tech.nom}
                        className={`transition-colors hover:bg-gray-50/50 ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                      >
                        <td className="px-4 py-3 border-r border-gray-200">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
                            >
                              {tech.initiales}
                            </div>
                            <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{tech.nom}</span>
                          </div>
                        </td>
                        {weekDays.map((day, dayIdx) => {
                          const cells = getAffectationsForCell(tech.nom, day);
                          return (
                            <td
                              key={dayIdx}
                              className={`px-1.5 py-2 align-top ${
                                isToday(day) ? 'bg-blue-50/40' : ''
                              } ${dayIdx < 4 ? 'border-r border-gray-200' : ''}`}
                              style={{ minWidth: '120px', minHeight: '56px' }}
                            >
                              {cells.length === 0 ? (
                                <div className="h-10" />
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {cells.map((aff) => {
                                    const cfg = TYPE_CONFIG[aff.type];
                                    return (
                                      <div
                                        key={aff.id}
                                        title={`${aff.chantier_nom} — ${cfg.label}${aff.notes ? '\n' + aff.notes : ''}`}
                                        className={`rounded-md px-2 py-1 border text-xs cursor-default flex flex-col gap-0.5 ${cfg.bg} ${cfg.border}`}
                                      >
                                        <span
                                          className="font-medium text-gray-800 truncate block"
                                          style={{ maxWidth: '110px' }}
                                        >
                                          {aff.chantier_nom}
                                        </span>
                                        <span className={`text-[10px] font-semibold px-1 py-0.5 rounded self-start ${cfg.badge}`}>
                                          {cfg.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Légende</p>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(TYPE_CONFIG) as [AffectationType, typeof TYPE_CONFIG[AffectationType]][]).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs text-gray-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nouvelle affectation</h2>
                <p className="text-sm text-gray-500">Planifier un technicien sur un chantier</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Technicien */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <User className="w-4 h-4 inline mr-1 text-gray-400" />
                  Technicien <span className="text-red-500">*</span>
                </label>
                {existingTechniciens.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={form.technicien_nom}
                      onChange={(e) => handleFormChange('technicien_nom', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
                    >
                      <option value="">— Sélectionner un technicien existant —</option>
                      {existingTechniciens.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">ou nouveau :</span>
                      <input
                        type="text"
                        placeholder="Nom du nouveau technicien"
                        value={existingTechniciens.includes(form.technicien_nom) ? '' : form.technicien_nom}
                        onChange={(e) => handleFormChange('technicien_nom', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg pl-24 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                      />
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Nom complet du technicien"
                    value={form.technicien_nom}
                    onChange={(e) => handleFormChange('technicien_nom', e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  />
                )}
              </div>

              {/* Chantier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Briefcase className="w-4 h-4 inline mr-1 text-gray-400" />
                  Chantier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nom du chantier"
                  value={form.chantier_nom}
                  onChange={(e) => handleFormChange('chantier_nom', e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={(e) => handleFormChange('date_debut', e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_fin}
                    min={form.date_debut}
                    onChange={(e) => handleFormChange('date_fin', e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type d'intervention <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [AffectationType, typeof TYPE_CONFIG[AffectationType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleFormChange('type', key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.type === key
                          ? 'border-current text-white shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      }`}
                      style={form.type === key ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: form.type === key ? 'rgba(255,255,255,0.8)' : cfg.color }}
                      />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FileText className="w-4 h-4 inline mr-1 text-gray-400" />
                  Notes <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Informations complémentaires..."
                  value={form.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Ajouter l'affectation</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
