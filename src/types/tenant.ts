export interface BrandColours {
  primary: string
  accent: string
}

export interface Restaurant {
  id: number
  name: string
  subdomain: string
  logo: string | null
  contactEmail: string | null
  contactPhone: string | null
  openingHours: Array<{ day: string; open: string; close: string; on: boolean }> | null
  brandColours: BrandColours | null
  commissionRate: number
  monthlyFee: number
  planType: string
  stripeAccountId: string | null
  isActive: boolean
  menuTemplate: string
  createdAt: string
}
