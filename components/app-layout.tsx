"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Monitor, StickyNote, Menu, LogOut, Package, CheckSquare, Download } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useTaskNotifications } from "@/hooks/use-task-notifications"

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    href: string
    title: string
    icon: React.ElementType
    badge?: number | string
    download?: boolean
  }[]
  onClick?: () => void
}

export function SidebarNav({ className, items, onClick, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)} {...props}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            download={item.download}
            className={cn(
              "justify-start flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors relative",
              pathname === item.href ? "bg-accent text-accent-foreground" : "transparent"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.title}</span>
            {item.badge !== undefined && Number(item.badge) > 0 && (
              <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.5)]">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const pendingTasksCount = useTaskNotifications()

  const navItems = [
    { title: "Dashboard", href: "/", icon: Monitor },
    { title: "Kişisel Notlarım", href: "/notes", icon: StickyNote },
    { title: "Yapılacak İşler", href: "/tasks", icon: CheckSquare, badge: pendingTasksCount },
    { title: "Android için İndir", href: "https://github.com/Halilibo28/IT-Inventory-Pro/releases/download/latest/app-debug.apk", icon: Download, download: true },
  ]

  const handleLogout = () => {
    signOut(auth)
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile Navbar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background px-4 lg:hidden shadow-sm">
        <div className="flex items-center gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger>
              <div className="p-2 -ml-2 cursor-pointer hover:bg-accent rounded-md">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </div>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
              <div className="p-6 pb-4 flex items-center gap-2 font-bold text-xl border-b">
                <Package className="h-6 w-6 text-primary" />
                <span>IT-Inventory</span>
              </div>
              <ScrollArea className="flex-1 py-4">
                <div className="px-4">
                  <SidebarNav items={navItems} onClick={() => setOpen(false)} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t flex justify-between items-center">
                <Button variant="ghost" className="justify-start gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> Çıkış Yap
                </Button>
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            IT-Inventory
          </span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden w-[280px] flex-col border-r bg-muted/20 lg:flex sticky top-0 h-screen shadow-sm">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Package className="h-6 w-6 text-primary" />
            <span>IT-Inventory Pro</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 py-6 px-4">
          <SidebarNav items={navItems} />
        </ScrollArea>
        <div className="border-t p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium text-muted-foreground">Oturum: Halil</span>
            <ThemeToggle />
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Çıkış Yap
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-background/50">
        <div className="flex-1 w-full relative">
          {children}
        </div>
      </main>
    </div>
  )
}
