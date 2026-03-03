import { ClerkProvider } from '@clerk/clerk-react';

interface IxosClerkProviderProps {
  children: React.ReactNode;
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function IxosClerkProvider({ children }: IxosClerkProviderProps) {
  if (!publishableKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-graphite-0 text-porcelain">
        Missing VITE_CLERK_PUBLISHABLE_KEY
      </div>
    );
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}

