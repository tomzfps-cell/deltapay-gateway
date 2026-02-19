import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type State = 'loading' | 'ready' | 'invalid' | 'success';

export const ResetPassword: React.FC = () => {
  const [state, setState] = useState<State>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase intercepta el hash #access_token=...&type=recovery y dispara onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setState('ready');
      } else if (event === 'SIGNED_IN' && state === 'loading') {
        // Ya logueado pero no es recovery
        setState('invalid');
      }
    });

    // Timeout: si en 5s no llegó el evento PASSWORD_RECOVERY, el token es inválido/expirado
    const timeout = setTimeout(() => {
      setState((prev) => (prev === 'loading' ? 'invalid' : prev));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setState('invalid');
          return;
        }
        toast({
          title: 'Error al cambiar contraseña',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setState('success');
      toast({ title: '¡Contraseña actualizada!', description: 'Podés iniciar sesión con tu nueva contraseña.' });

      setTimeout(() => navigate('/login'), 2500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">Δ</span>
            </div>
            <span className="text-3xl font-bold text-foreground">DeltaPay</span>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Nueva contraseña</h2>
        </div>

        <div className="glass rounded-xl p-8">
          {state === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando link de recuperación...</p>
            </div>
          )}

          {state === 'invalid' && (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div>
                <p className="font-semibold text-foreground text-lg">Link inválido o expirado</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  El link de recuperación ya fue usado o expiró. Solicitá uno nuevo.
                </p>
              </div>
              <Button
                onClick={() => navigate('/forgot-password')}
                className="btn-primary-glow mt-2"
              >
                Solicitar nuevo link
              </Button>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <div>
                <p className="font-semibold text-foreground text-lg">¡Contraseña actualizada!</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Redirigiendo al login...
                </p>
              </div>
            </div>
          )}

          {state === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repetí la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                className="w-full btn-primary-glow"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Establecer nueva contraseña'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
