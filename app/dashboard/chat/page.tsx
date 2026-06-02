'use client';

import { MessageSquare } from 'lucide-react';

export default function ChatIAPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center gap-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <MessageSquare className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat IA</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Chateá con tus clientes usando IA multicanal.
        </p>
      </div>
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-secondary border border-border text-muted-foreground">
        Próximamente disponible
      </span>
    </div>
  );
}
