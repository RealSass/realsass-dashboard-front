'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Send, Search, SlidersHorizontal,
  Phone, Instagram, Globe, X,
  ShoppingCart, Clock, TrendingUp, Menu, AlertCircle,
} from 'lucide-react';
import {
  useConversaciones,
  useMensajes,
  useEnviarMensaje,
  useMarcarLeidos,
  useTomarOportunidad,
} from '@/features/chat/hooks';
import type { Canal, EtapaCliente, Conversacion, Mensaje } from '@/features/chat/types';

// ─── Config maps ──────────────────────────────────────────────────────────────

const CANAL_CONFIG: Record<Canal, { label: string; color: string; Icon: React.ElementType }> = {
  whatsapp:  { label: 'WhatsApp',  color: 'rgba(37,211,102,0.15)',  Icon: Phone },
  instagram: { label: 'Instagram', color: 'rgba(225,48,108,0.15)',  Icon: Instagram },
  telegram:  { label: 'Telegram',  color: 'rgba(36,161,222,0.15)',  Icon: MessageSquare },
  web:       { label: 'Web',       color: 'rgba(120,120,120,0.15)', Icon: Globe },
};

const ETAPA_CONFIG: Record<EtapaCliente, { label: string; bg: string; color: string; border: string }> = {
  prospecto:   { label: 'Prospecto',  bg: 'rgba(120,120,120,0.15)', color: '#a1a1aa', border: 'rgba(120,120,120,0.3)' },
  oportunidad: { label: 'Oportunidad',bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  post_venta:  { label: 'Post-Venta', bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  recompra:    { label: 'Recompra',   bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  inactivo:    { label: 'Inactivo',   bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1)    return 'ahora';
  if (diffMin < 60)   return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function getInitials(nombre: string): string {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CanalBadge({ canal }: { canal: Canal }) {
  const cfg = CANAL_CONFIG[canal];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border"
      style={{ background: cfg.color, color: 'var(--foreground)', borderColor: cfg.color }}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function EtapaBadge({ etapa }: { etapa: EtapaCliente }) {
  const cfg = ETAPA_CONFIG[etapa];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <div className={cn('rounded-full bg-accent flex items-center justify-center flex-shrink-0 font-medium text-foreground', className)}>
      {getInitials(nombre)}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ConversacionSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

function MensajeSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
          <Skeleton className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-48' : 'w-64')} />
        </div>
      ))}
    </div>
  );
}

// ─── Panel lateral del cliente ────────────────────────────────────────────────

function ClientePanel({
  conversacion,
  onClose,
  onTomarOportunidad,
}: {
  conversacion: Conversacion;
  onClose: () => void;
  onTomarOportunidad: () => void;
}) {
  const { cliente } = conversacion;
  const etapaCfg = ETAPA_CONFIG[cliente.etapa];

  return (
    <div className="w-72 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Detalle del cliente</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Perfil */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar nombre={cliente.nombre} className="h-16 w-16 text-xl" />
            <div>
              <p className="font-semibold">{cliente.nombre}</p>
              {cliente.telefono && (
                <p className="text-xs text-muted-foreground">{cliente.telefono}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <CanalBadge canal={cliente.canal} />
              <EtapaBadge etapa={cliente.etapa} />
            </div>
          </div>

          {/* Etapa */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapa actual</p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
              <TrendingUp className="h-4 w-4" style={{ color: etapaCfg.color }} />
              <span className="text-sm font-medium" style={{ color: etapaCfg.color }}>
                {etapaCfg.label}
              </span>
            </div>
          </div>

          {/* Preferencias */}
          {cliente.preferencias && cliente.preferencias.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferencias detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {cliente.preferencias.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded-md text-xs bg-secondary text-muted-foreground border border-border">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Historial de compras */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Historial ({(cliente.historialCompras || []).length})
            </p>
            {(cliente.historialCompras || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin compras registradas</p>
            ) : (
              <div className="space-y-2">
                {cliente.historialCompras.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-secondary space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-tight">{c.producto}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{c.fecha}</span>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                      ${c.monto.toLocaleString('es-AR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ultima interaccion */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ultima interaccion</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(cliente.ultimaInteraccion).toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* CTA */}
      {(cliente.etapa === 'prospecto' || cliente.etapa === 'oportunidad') && (
        <div className="p-4 border-t border-border">
          <Button className="w-full gap-2 text-sm" onClick={onTomarOportunidad}>
            <ShoppingCart className="h-4 w-4" />
            Tomar como oportunidad
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [inputMsg, setInputMsg]        = useState('');
  const [search, setSearch]            = useState('');
  const [filterCanal, setFilterCanal]  = useState<Canal | ''>('');
  const [filterEtapa, setFilterEtapa]  = useState<EtapaCliente | ''>('');
  const [showFilters, setShowFilters]  = useState(false);
  const [showDetail, setShowDetail]    = useState(true);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: convData,
    isLoading: convLoading,
    error: convError,
  } = useConversaciones({ canal: filterCanal || undefined, etapa: filterEtapa || undefined, limit: 50 });

  const {
    data: msgData,
    isLoading: msgLoading,
  } = useMensajes(selectedId);

  const enviarMensaje   = useEnviarMensaje();
  const marcarLeidos    = useMarcarLeidos();
  const tomarOportunidad = useTomarOportunidad();

  const conversaciones = convData?.items ?? [];

  // Set first conversation as default once loaded
  useEffect(() => {
    if (!selectedId && conversaciones.length > 0) {
      setSelectedId(conversaciones[0].id);
    }
  }, [conversaciones, selectedId]);

  const selected = conversaciones.find(c => c.id === selectedId) ?? null;
  const mensajes: Mensaje[] = msgData?.items ?? [];
  const totalNoLeidos = conversaciones.reduce((acc, c) => acc + (c.noLeidos ?? 0), 0);

  // Client-side search filter (server already filters by canal/etapa)
  const filtered = useMemo(() => {
    if (!search) return conversaciones;
    const q = search.toLowerCase();
    return conversaciones.filter(c =>
      c.cliente.nombre.toLowerCase().includes(q) ||
      c.ultimoMensaje?.contenido.toLowerCase().includes(q)
    );
  }, [conversaciones, search]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length, selectedId]);

  // Mark as read when selecting a conversation
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileListOpen(false);
    marcarLeidos.mutate(id);
  };

  const handleSend = () => {
    if (!inputMsg.trim() || !selectedId) return;
    enviarMensaje.mutate(
      { conversacionId: selectedId, contenido: inputMsg.trim() },
      { onSuccess: () => setInputMsg('') }
    );
  };

  const handleTomarOportunidad = () => {
    if (!selectedId) return;
    tomarOportunidad.mutate(selectedId);
  };

  // ─── List Panel ─────────────────────────────────────────────────────────────

  const ListPanel = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Conversaciones</h2>
            {totalNoLeidos > 0 && (
              <span
                className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                {totalNoLeidos}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-secondary border-border"
          />
        </div>

        {showFilters && (
          <div className="space-y-2">
            <select
              value={filterCanal}
              onChange={e => setFilterCanal(e.target.value as Canal | '')}
              className="w-full h-8 text-xs rounded-md bg-secondary border border-border text-foreground px-2"
            >
              <option value="">Todos los canales</option>
              {(Object.keys(CANAL_CONFIG) as Canal[]).map(c => (
                <option key={c} value={c}>{CANAL_CONFIG[c].label}</option>
              ))}
            </select>
            <select
              value={filterEtapa}
              onChange={e => setFilterEtapa(e.target.value as EtapaCliente | '')}
              className="w-full h-8 text-xs rounded-md bg-secondary border border-border text-foreground px-2"
            >
              <option value="">Todas las etapas</option>
              {(Object.keys(ETAPA_CONFIG) as EtapaCliente[]).map(e => (
                <option key={e} value={e}>{ETAPA_CONFIG[e].label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {convLoading ? (
          <>{[1,2,3,4].map(i => <ConversacionSkeleton key={i} />)}</>
        ) : convError ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-xs text-muted-foreground">Error al cargar conversaciones</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Sin conversaciones</p>
          </div>
        ) : (
          filtered.map(conv => {
            const isSelected = conv.id === selectedId;
            const ultimoMensaje = conv.ultimoMensaje;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50',
                  isSelected ? 'bg-secondary' : 'hover:bg-secondary/50'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar nombre={conv.cliente.nombre} className="h-10 w-10 text-sm" />
                  {conv.oportunidadDetectada && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{conv.cliente.nombre}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.noLeidos > 0 && (
                        <span
                          className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-bold"
                          style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}
                        >
                          {conv.noLeidos}
                        </span>
                      )}
                      {ultimoMensaje && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTime(ultimoMensaje.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CanalBadge canal={conv.cliente.canal} />
                    <EtapaBadge etapa={conv.cliente.etapa} />
                  </div>
                  {ultimoMensaje && (
                    <p className="text-xs text-muted-foreground truncate">{ultimoMensaje.contenido}</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden">
      {/* List panel — desktop */}
      <div className="hidden md:flex w-80 flex-shrink-0 border-r border-border bg-card flex-col">
        <ListPanel />
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card h-14 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile list trigger */}
            <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-card border-r border-border">
                <ListPanel />
              </SheetContent>
            </Sheet>

            {selected ? (
              <>
                <Avatar nombre={selected.cliente.nombre} className="h-8 w-8 text-xs" />
                <div>
                  <p className="text-sm font-semibold leading-none">{selected.cliente.nombre}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CanalBadge canal={selected.cliente.canal} />
                    <EtapaBadge etapa={selected.cliente.etapa} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona una conversacion</p>
            )}
          </div>

          {selected && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowDetail(v => !v)}
              title={showDetail ? 'Ocultar detalle' : 'Ver detalle'}
            >
              <X className={cn('h-4 w-4 transition-transform', showDetail ? 'rotate-0' : 'rotate-45')} />
            </Button>
          )}
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 p-4">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Selecciona una conversacion para comenzar</p>
            </div>
          ) : msgLoading ? (
            <MensajeSkeleton />
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Sin mensajes aun</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl mx-auto">
              {mensajes.map((msg) => {
                const isAgente = msg.origen === 'agente' || msg.origen === 'bot';
                return (
                  <div key={msg.id} className={cn('flex', isAgente ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                        isAgente
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-secondary text-foreground rounded-bl-sm'
                      )}
                    >
                      {msg.origen === 'bot' && (
                        <p className="text-[10px] font-semibold opacity-70 mb-1">Bot IA</p>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                      <p className={cn(
                        'text-[10px] mt-1',
                        isAgente ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'
                      )}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t border-border bg-card flex-shrink-0">
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 max-w-3xl mx-auto"
          >
            <Input
              placeholder={selectedId ? 'Escribe un mensaje...' : 'Selecciona una conversacion'}
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              disabled={!selectedId || enviarMensaje.isPending}
              className="flex-1 bg-secondary border-border"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputMsg.trim() || !selectedId || enviarMensaje.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Detail panel */}
      {selected && showDetail && (
        <ClientePanel
          conversacion={selected}
          onClose={() => setShowDetail(false)}
          onTomarOportunidad={handleTomarOportunidad}
        />
      )}
    </div>
  );
}
