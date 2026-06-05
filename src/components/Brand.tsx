import { WormholeMark } from './WormholeMark'

interface BrandProps {
  size?: number
  active?: boolean
}

export function Brand({ size = 18, active = false }: BrandProps) {
  return (
    <span className="brand">
      <WormholeMark size={size} active={active} />
      <span className="brand-name">Wormhole</span>
    </span>
  )
}
