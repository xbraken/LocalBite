const EARTH_MILES = 3958.8

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h))
}

export interface DeliveryConfig {
  enabled: boolean
  originPostcode: string | null
  radiusMiles: number
  baseFee: number
  perMileFee: number
  minOrder: number
}

export function computeDeliveryFee(distanceMiles: number, cfg: Pick<DeliveryConfig, 'baseFee' | 'perMileFee'>): number {
  const raw = cfg.baseFee + cfg.perMileFee * distanceMiles
  return Math.round(raw * 100) / 100
}
