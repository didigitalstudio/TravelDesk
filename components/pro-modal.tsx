'use client'

export function ProModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-[3px] text-violet-400 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded">
            Plan Pro
          </span>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition ml-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-2">
          {feature} requiere el plan Pro
        </h3>
        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
          Esta función está disponible en el plan Pro. Contactanos y la activamos en menos de 24 horas hábiles.
        </p>
        <div className="flex gap-2">
          <a
            href="mailto:info@didigitalstudio.com?subject=Consulta%20plan%20Pro%20-%20TravelDesk"
            className="flex-1 text-center bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-2.5 text-sm font-semibold transition"
          >
            Contactar a DI Digital
          </a>
          <button
            onClick={onClose}
            className="px-4 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
