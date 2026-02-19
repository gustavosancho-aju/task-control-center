import { Badge } from "@/components/ui/badge"
import { ROLE_COLORS, type AgentRole } from "@/lib/colors"

const agentIcons: Record<AgentRole, string> = {
  MAESTRO: "🎯",
  SENTINEL: "🛡️",
  ARCHITECTON: "🏗️",
  PIXEL: "🎨",
  FINISH: "🚀",
}

interface AgentBadgeProps {
  name: string
  role: AgentRole
}

export function AgentBadge({ name, role }: AgentBadgeProps) {
  return (
    <Badge className={ROLE_COLORS[role].badge}>
      {agentIcons[role]} {name}
    </Badge>
  )
}
