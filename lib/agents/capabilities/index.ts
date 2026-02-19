import { executionEngine } from '../execution-engine'
import { maestroCapabilities } from './maestro'
import { sentinelCapabilities } from './sentinel'
import { architectonCapabilities } from './architecton'
import { pixelCapabilities } from './pixel'
import { finishCapabilities } from './finish'

export function registerAllCapabilities(): void {
  for (const cap of maestroCapabilities) {
    executionEngine.registerCapability('MAESTRO', cap)
  }
  for (const cap of sentinelCapabilities) {
    executionEngine.registerCapability('SENTINEL', cap)
  }
  for (const cap of architectonCapabilities) {
    executionEngine.registerCapability('ARCHITECTON', cap)
  }
  for (const cap of pixelCapabilities) {
    executionEngine.registerCapability('PIXEL', cap)
  }
  for (const cap of finishCapabilities) {
    executionEngine.registerCapability('FINISH', cap)
  }
}

export { maestroCapabilities } from './maestro'
export { sentinelCapabilities } from './sentinel'
export { architectonCapabilities } from './architecton'
export { pixelCapabilities } from './pixel'
export { finishCapabilities } from './finish'
