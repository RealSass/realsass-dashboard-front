'use client';

import { useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/helpers';
import { useMensajes, useEnviarMensaje } from '../hooks';
import { CanalBadge } from './canal-badge';
import { EtapaBadge } from './etapa-badge';
import type { Conversacion } from '../types';

interface MensajeSkeletonProps { count?: number }
function MensajeSkeleton({ count = 3 }: MensajeSkeletonProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
          <Skeleton className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-48' : 'w-64')} />
        </div>
      ))}
    </div>
  );
}

interface ChatWindowProps {
  selected: Conversacion | null;
  headerExtra?: React.ReactNode;
}

export function ChatWindow({ selected, headerExtra }: ChatWindowProps) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const { data: msgData, isLoading: msgLoading } = useMensajes(selected?.id ?? null);
  const enviarMensaje = useEnviarMensaje();

  const mensajes = msgData?.items ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length, selected?.id]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || !selected) return;
    const contenido = input.value.trim();
    input.value = '';
    enviarMensaje.mutate({ conversacionId: selected.id, contenido });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card h-14 flex-shrink-0">
        <div className="flex items-center gap-3">
          {headerExtra}
          {selected ? (
            <>
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium flex-shrink-0">
                {selected.cliente.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
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
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {!selected?.id ? (
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
                        : 'bg-secondary text-foreground rounded-bl-sm',
                    )}
                  >
                    {msg.origen === 'bot' && (
                      <p className="text-[10px] font-semibold opacity-70 mb-1">Bot IA</p>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
                    <p className={cn('text-[10px] mt-1', isAgente ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground')}>
                      {formatRelativeTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            placeholder={selected ? 'Escribe un mensaje...' : 'Selecciona una conversacion'}
            disabled={!selected || enviarMensaje.isPending}
            className="flex-1 bg-secondary border-border"
          />
          <Button type="submit" size="icon" disabled={!selected || enviarMensaje.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
