// app/auth/sso/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

type State = 'loading' | 'error'

export default function SsoPage() {
  const router = useRouter()
  const [state,   setState]   = useState<State>('loading')
  const [message, setMessage] = useState('Iniciando sesión...')

  useEffect(() => {
    const run = async () => {
      try {
        const params      = new URLSearchParams(window.location.search)
        const customToken = params.get('token')

        if (!customToken) {
          setMessage('Token no encontrado. Volvé a intentarlo desde el inicio.')
          setState('error')
          return
        }

        setMessage('Verificando credenciales...')
        await signInWithCustomToken(auth, customToken)

        setMessage('Sesión iniciada. Redirigiendo...')
        router.replace('/dashboard')

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        console.error('[SSO] Error:', msg)
        setMessage('No se pudo iniciar sesión. El enlace puede haber expirado.')
        setState('error')
      }
    }

    run()
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      {state === 'loading' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-destructive text-center max-w-xs">{message}</p>
          <a href="/" className="text-xs text-primary underline underline-offset-2">
            Volver al inicio
          </a>
        </>
      )}
    </main>
  )
}