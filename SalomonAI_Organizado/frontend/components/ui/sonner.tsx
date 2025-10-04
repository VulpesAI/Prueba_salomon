import { useTheme } from "@/lib/theme-provider";
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-neutral-light-surface group-[.toaster]:text-neutral-light-foreground group-[.toaster]:border-neutral-light-border group-[.toaster]:shadow-lg dark:group-[.toaster]:border-neutral-dark-border dark:group-[.toaster]:bg-neutral-dark-surface dark:group-[.toaster]:text-neutral-dark-foreground",
          description:
            "group-[.toast]:text-neutral-light-muted-foreground dark:group-[.toast]:text-neutral-dark-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-neutral-light-muted-foreground dark:group-[.toast]:text-neutral-dark-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
