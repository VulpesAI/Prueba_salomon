import type React from "react"
import type { ComponentPropsWithoutRef } from "react"
import { forwardRef } from "react"

function createMotionComponent<Tag extends keyof JSX.IntrinsicElements>(tag: Tag) {
  return forwardRef<HTMLElement, ComponentPropsWithoutRef<Tag>>(function MotionComponent(
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
