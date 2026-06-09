// app/auth/layout.tsx
// Sin guard de autenticación — necesario para que /auth/sso sea accesible
// sin token previo.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
