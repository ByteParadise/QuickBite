const STORAGE_KEY = 'quickbite:login-resume:v1'

export type LoginResume = { type: 'addresses' } | { type: 'add-card' }

function isLoginResume(value: unknown): value is LoginResume {
  if (typeof value !== 'object' || value === null) return false
  const { type } = value as Record<string, unknown>
  return type === 'addresses' || type === 'add-card'
}


export function saveLoginResume(resume: LoginResume): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(resume))
  } catch {
    // Storage can be blocked; login still works, without resuming the action.
  }
}

export function clearLoginResume(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

/** Returns the saved action once, then removes it. */
export function takeLoginResume(): LoginResume | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    clearLoginResume()
    return isLoginResume(parsed) ? parsed : null
  } catch {
    return null
  }
}

