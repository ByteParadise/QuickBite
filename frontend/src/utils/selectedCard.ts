const STORAGE_KEY = 'quickbite:selected-card:v1'

export const DEMO_CARD_ID = 'demo'

export function loadSelectedCardId(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? DEMO_CARD_ID
  } catch {
    return DEMO_CARD_ID
  }
}

export function saveSelectedCardId(cardId: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, cardId)
  } catch {
    // Storage can be blocked; checkout then falls back to the demo card.
  }
}
