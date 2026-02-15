import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span className="font-bold text-xl">Task Control Center</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link href="/create">
            <Button>Nova Tarefa</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
