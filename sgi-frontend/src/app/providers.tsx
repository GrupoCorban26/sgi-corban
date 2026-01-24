'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient optimizado con configuración de caché y reintentos
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutos - datos frescos
        retry: 1, // Solo 1 reintento en caso de error
        refetchOnWindowFocus: false, // No refetch al cambiar de pestaña
      },
    },
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}