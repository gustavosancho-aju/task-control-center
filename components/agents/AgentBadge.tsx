import { Badge } from "@/components/ui/badge"

const agentConfig = {
  MAESTRO: { icon: "🎯", className: "bg-purple-500 text-white" },
  SENTINEL: { icon: "🛡️", className: "bg-green-600 text-white" },
  ARCHITECTON: { icon: "🏗️", className: "bg-blue-600 text-white" },
  PIXEL: { icon: "🎨", className: "bg-pink-500 text-white" },
}

type AgentRole = keyof typeof agentConfig

interface AgentBadgeProps {
  name: string
  role: AgentRole
}

export function AgentBadge({ name, role }: AgentBadgeProps) {
  const config = agentConfig[role]
  return (
    <Badge className={config.className}>
      {config.icon} {name}
    </Badge>
  )
}
