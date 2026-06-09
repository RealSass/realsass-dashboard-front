// app/auth/layout.tsx
// Layout para rutas de autenticación (/auth/sso, etc.)
// NO aplica guards ni redireccionamientos — es intencional.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
