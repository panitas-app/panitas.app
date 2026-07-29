"use client"

import { useEffect, useCallback, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface MobileSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  title?: string
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const sheetVariants = {
  hidden: { x: "-100%" },
  visible: { x: 0 },
}

const sheetTransition = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }

export function MobileSheet({ isOpen, onClose, children, className = "" }: MobileSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      document.body.style.touchAction = "none"
    } else {
      document.body.style.overflow = ""
      document.body.style.touchAction = ""
    }
    return () => {
      document.body.style.overflow = ""
      document.body.style.touchAction = ""
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div onKeyDown={handleKeyDown} className="lg:hidden">
          <motion.div
            key="mobile-sheet-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15 }}
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
            className="fixed inset-0 z-40 perf-overlay"
          />
          <motion.div
            key="mobile-sheet-panel"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={sheetTransition}
            className={`fixed inset-y-0 left-0 z-50 w-[75vw] max-w-[300px] shadow-2xl gpu will-change-transform ${className}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
