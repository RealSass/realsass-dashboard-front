export interface PuntoDeVenta {
  id: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  isActive: boolean;
}

export interface PuntoDeVentaInput {
  nombre: string;
  direccion?: string;
  ciudad?: string;
}
