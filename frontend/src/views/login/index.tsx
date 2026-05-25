import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/ui/LoginForm';

export function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
