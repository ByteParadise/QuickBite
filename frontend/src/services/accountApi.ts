const BASE_URL = import.meta.env.VITE_ACCOUNT_SERVICE_URL

export function requireToken(token: string | undefined): string {
  if (!token) throw new Error('missing access token')
  return token
}

export interface Account {
  id: string
  name: string | null
  email: string | null
}

export async function ensureAccount(token: string): Promise<Account> {
  const res = await fetch(`${BASE_URL}/accounts/me`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`account request failed: ${res.status}`)
  return res.json()
}

export interface NewAddress {
  line1: string
  city: string
  state: string
  postalCode: string
  lat: number
  lng: number
}

export interface SavedAddress extends NewAddress {
  id: string
  label: string | null
  line2: string | null
  isDefault: boolean
}

export function formatSavedAddress({ line1, city, state, postalCode }: NewAddress): string {
  return `${line1}, ${city}, ${state} ${postalCode}`
}

export async function fetchAddresses(token: string): Promise<SavedAddress[]> {
  const res = await fetch(`${BASE_URL}/accounts/me/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`addresses request failed: ${res.status}`)
  return res.json()
}

export async function createAddress(token: string, address: NewAddress): Promise<SavedAddress> {
  const res = await fetch(`${BASE_URL}/accounts/me/addresses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(address),
  })
  if (!res.ok) throw new Error(`save address failed: ${res.status}`)
  return res.json()
}

export interface SavedCard {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export async function fetchCards(token: string): Promise<SavedCard[]> {
  const res = await fetch(`${BASE_URL}/accounts/me/cards`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`cards request failed: ${res.status}`)
  return res.json()
}

export async function createCardSetup(token: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/accounts/me/cards/setup-intent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`card setup failed: ${res.status}`)
  const { clientSecret } = await res.json()
  return clientSecret
}

export async function recordCard(token: string, setupIntentId: string): Promise<SavedCard> {
  const res = await fetch(`${BASE_URL}/accounts/me/cards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ setupIntentId }),
  })
  if (!res.ok) throw new Error(`save card failed: ${res.status}`)
  return res.json()
}
