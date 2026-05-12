'use client';

import { useState } from 'react';
import { Bot, Plus, Copy, ToggleLeft, ToggleRight, Pencil, Loader2, Shield, Link, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useWhatsAppBots, BotConfig, BotConfigCreate, BotConfigUpdate } from '@/hooks/useWhatsAppBots';

export default function WhatsAppBotsPage() {
  const { bots, jefes, createBot, updateBot, toggleBot } = useWhatsAppBots();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showTokenFor, setShowTokenFor] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState<BotConfigCreate>({
    slug: '',
    nombre_bot: '',
    jefe_comercial_id: 0,
    whatsapp_token: '',
    whatsapp_phone_id: '',
    whatsapp_verify_token: '',
  });

  const resetForm = () => {
    setForm({
      slug: '', nombre_bot: '', jefe_comercial_id: 0,
      whatsapp_token: '', whatsapp_phone_id: '', whatsapp_verify_token: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updateData: BotConfigUpdate & { id: number } = { id: editingId };
        if (form.slug) updateData.slug = form.slug;
        if (form.nombre_bot) updateData.nombre_bot = form.nombre_bot;
        if (form.jefe_comercial_id) updateData.jefe_comercial_id = form.jefe_comercial_id;
        if (form.whatsapp_token) updateData.whatsapp_token = form.whatsapp_token;
        if (form.whatsapp_phone_id) updateData.whatsapp_phone_id = form.whatsapp_phone_id;
        if (form.whatsapp_verify_token) updateData.whatsapp_verify_token = form.whatsapp_verify_token;
        await updateBot.mutateAsync(updateData);
        toast.success('Bot actualizado correctamente');
      } else {
        await createBot.mutateAsync(form);
        toast.success('Bot creado correctamente');
      }
      resetForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || 'Error al guardar');
    }
  };

  const handleEdit = (bot: BotConfig) => {
    setEditingId(bot.id);
    setForm({
      slug: bot.slug,
      nombre_bot: bot.nombre_bot,
      jefe_comercial_id: bot.jefe_comercial_id,
      whatsapp_token: '',  // No prellenar token por seguridad
      whatsapp_phone_id: bot.whatsapp_phone_id,
      whatsapp_verify_token: bot.whatsapp_verify_token,
    });
    setShowForm(true);
  };

  const handleToggle = async (id: number, nombre: string, isActive: boolean) => {
    try {
      await toggleBot.mutateAsync(id);
      toast.success(`Bot "${nombre}" ${isActive ? 'desactivado' : 'activado'}`);
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const copyWebhookUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('URL del webhook copiada');
  };

  if (bots.isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-azul-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-6 shadow-xl shadow-emerald-900/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
              <Bot className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp Bots</h1>
              <p className="text-emerald-200 text-sm mt-0.5">Gestiona los bots de WhatsApp Business por equipo comercial</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Plus size={16} />
            Nuevo Bot
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? '✏️ Editar Bot' : '➕ Nuevo Bot'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slug */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Slug (URL del webhook)
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="equipo-ventas"
                required={!editingId}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              <p className="text-[11px] text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
            </div>

            {/* Nombre Bot */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Nombre del Bot
              </label>
              <input
                type="text"
                value={form.nombre_bot}
                onChange={e => setForm(f => ({ ...f, nombre_bot: e.target.value }))}
                placeholder="Corby"
                required={!editingId}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            {/* Jefe Comercial */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Jefe Comercial (Equipo)
              </label>
              <select
                value={form.jefe_comercial_id || ''}
                onChange={e => setForm(f => ({ ...f, jefe_comercial_id: Number(e.target.value) }))}
                required={!editingId}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">Seleccionar jefe...</option>
                {jefes.data?.map(j => (
                  <option key={j.id} value={j.id}>{j.nombre}</option>
                ))}
              </select>
            </div>

            {/* Verify Token */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Verify Token (lo inventas tú)
              </label>
              <input
                type="text"
                value={form.whatsapp_verify_token}
                onChange={e => setForm(f => ({ ...f, whatsapp_verify_token: e.target.value }))}
                placeholder="mi_clave_secreta"
                required={!editingId}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            {/* Token de acceso */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Token de Acceso de Meta {editingId && <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>}
              </label>
              <input
                type="password"
                value={form.whatsapp_token}
                onChange={e => setForm(f => ({ ...f, whatsapp_token: e.target.value }))}
                placeholder={editingId ? '••••••••' : 'EAAGn...'}
                required={!editingId}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            {/* Phone ID */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Identificador de Número de Teléfono
              </label>
              <input
                type="text"
                value={form.whatsapp_phone_id}
                onChange={e => setForm(f => ({ ...f, whatsapp_phone_id: e.target.value }))}
                placeholder="123456789012345"
                required={!editingId}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            {/* Actions */}
            <div className="md:col-span-2 flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="cursor-pointer px-5 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createBot.isPending || updateBot.isPending}
                className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {(createBot.isPending || updateBot.isPending) && <Loader2 size={14} className="animate-spin" />}
                {editingId ? 'Guardar Cambios' : 'Crear Bot'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Bots */}
      <div className="space-y-4">
        {!bots.data?.length && !showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Bot size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No hay bots configurados</p>
            <p className="text-gray-400 text-sm mt-1">Haz clic en &quot;Nuevo Bot&quot; para agregar uno</p>
          </div>
        )}

        {bots.data?.map(bot => (
          <div
            key={bot.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              bot.is_active
                ? 'border-gray-200'
                : 'border-red-200 bg-red-50/30 opacity-70'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${bot.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
                <div>
                  <h3 className="font-bold text-gray-800">{bot.nombre_bot}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Equipo de <span className="font-semibold text-gray-600">{bot.jefe_nombre}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(bot)}
                  className="cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Editar"
                >
                  <Pencil size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => handleToggle(bot.id, bot.nombre_bot, bot.is_active)}
                  disabled={toggleBot.isPending}
                  className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title={bot.is_active ? 'Desactivar' : 'Activar'}
                >
                  {bot.is_active
                    ? <ToggleRight size={28} className="text-emerald-500" />
                    : <ToggleLeft size={28} className="text-gray-300" />
                  }
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
              {/* Webhook URL */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Link size={12} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Webhook URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg text-gray-700 font-mono truncate">
                    ...{bot.webhook_url}
                  </code>
                  <button
                    onClick={() => copyWebhookUrl(bot.webhook_url)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                    title="Copiar URL completa"
                  >
                    <Copy size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Phone ID */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Shield size={12} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone ID</span>
                </div>
                <code className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg text-gray-700 font-mono block">
                  {bot.whatsapp_phone_id}
                </code>
              </div>

              {/* Token */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Shield size={12} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Token</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg text-gray-700 font-mono truncate">
                    {showTokenFor === bot.id ? bot.whatsapp_token_masked : '••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowTokenFor(showTokenFor === bot.id ? null : bot.id)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                  >
                    {showTokenFor === bot.id
                      ? <EyeOff size={14} className="text-gray-400" />
                      : <Eye size={14} className="text-gray-400" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
