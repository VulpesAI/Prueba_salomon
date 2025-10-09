import type React from "react"
import type { JSX as ReactJSX } from "react"
import { forwardRef } from "react"

type MotionExtras = {
  whileHover?: unknown
  whileTap?: unknown
  transition?: unknown
  animate?: unknown
  initial?: unknown
  exit?: unknown
}

type MotionProps<Tag extends keyof ReactJSX.IntrinsicElements> =
  ReactJSX.IntrinsicElements[Tag] & MotionExtras

function createMotionComponent<Tag extends keyof ReactJSX.IntrinsicElements>(tag: Tag) {
  return forwardRef<HTMLElement, MotionProps<Tag>>(function MotionComponent(
    { children, whileHover, whileTap, transition, animate, initial, exit, ...props },
    ref
  ) {
    const Component = tag as unknown as React.ElementType
    return (
      <Component ref={ref} {...props}>
        {children}
      </Component>
    )
  })
}

const handler: ProxyHandler<Record<string, unknown>> = {
  get: (_, element: string) => createMotionComponent(element as keyof ReactJSX.IntrinsicElements),
}

export const motion = new Proxy({}, handler) as unknown as typeof import("framer-motion").motion

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>

export default { motion, AnimatePresence }
