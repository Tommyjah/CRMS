'use client'

import { useState, useEffect } from 'react'

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative min-h-screen w-full bg-slate-50/50 dark:bg-zinc-950">
      {visible && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/90 dark:bg-zinc-950/90 backdrop-blur-sm">
          <div className="splash-logo">
            <img
              src="/logo.png"
              alt="Ethio Telecom"
              className="h-36 w-36 object-contain"
            />
          </div>
          <p className="mt-6 text-base font-medium text-slate-700 dark:text-zinc-300 splash-text">
            Loading Change Request Management System...
          </p>
        </div>
      )}
      <div className={`transition-opacity duration-700 ease-out ${visible ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>

      <style jsx global>{`
        .splash-logo {
          animation: splashFadeIn 0.9s ease-out forwards;
        }
        .splash-text {
          animation: splashFadeIn 0.9s ease-out 0.25s forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        @keyframes splashFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
