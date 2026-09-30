// Spring presets (Motion). PiSuite is a work tool → "snappy" for menus/toasts, "calm" for dialogs.
export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 },
  calm: { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 },
} as const
