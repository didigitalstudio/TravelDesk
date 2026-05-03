import React from 'react';

export function FeatureGate({
  enabled,
  children,
  message = 'Disponible en plan Pro',
}: {
  enabled: boolean;
  children: React.ReactNode;
  message?: string;
}) {
  if (enabled) return <>{children}</>;
  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="opacity-30 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl">
        <div className="flex flex-col items-center gap-3 text-center px-6 py-5 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl max-w-xs">
          <span className="text-[9px] font-bold uppercase tracking-[3px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/30">Pro</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-sm font-medium text-zinc-200">{message}</p>
          <a
            href="mailto:info@didigitalstudio.com?subject=Consulta%20plan%20Pro%20-%20TravelDesk"
            className="text-xs text-violet-400 hover:underline font-medium"
          >
            Contactar a DI Digital Studio →
          </a>
        </div>
      </div>
    </div>
  );
}
