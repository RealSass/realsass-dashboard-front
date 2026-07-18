'use client';
import { MapPin } from 'lucide-react';

// Esta página era específica del dominio real-estate.
// En la versión genérica las categorías de productos se gestionan
// desde /dashboard/tienda/productos.
export default function ZonasRedirect() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center gap-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <MapPin className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zonas</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          El módulo de zonas ya no está disponible en esta versión.
          Las categorías se gestionan desde la sección Tienda → Productos.
        </p>
      </div>
    </div>
  );
}
