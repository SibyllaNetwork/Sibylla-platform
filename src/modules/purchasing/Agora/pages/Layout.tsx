/*
 * Layout — stub di compatibilità per le pagine portate da Newagora.
 *
 * Nel progetto originale, <Layout> era la shell dell'app Agorà (sidebar+header+cart).
 * Dentro Sibylla quella shell è fornita da `sibylla_dashboard.tsx`, quindi qui il
 * componente diventa un semplice contenitore trasparente. Lasciamo che le pagine
 * conservino la sintassi `<Layout>...</Layout>` senza modifiche invasive.
 */
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return <div className="agora-app-shell">{children}</div>;
}
