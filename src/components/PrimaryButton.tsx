import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import './PrimaryButton.css'

type PrimaryButtonProps = {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  variant?: 'solid' | 'ghost'
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  variant = 'solid',
}: PrimaryButtonProps) {
  return (
    <motion.button
      type={type}
      className={`primary-btn primary-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      whileHover={disabled ? undefined : { y: -1 }}
    >
      {children}
    </motion.button>
  )
}
