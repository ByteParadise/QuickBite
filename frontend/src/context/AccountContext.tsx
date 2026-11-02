import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ensureAccount, requireToken, type Account } from '../services/accountApi'

interface AccountState {
  account: Account | null
  error: string | null
}

const AccountContext = createContext<AccountState | undefined>(undefined)

export function AccountProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const [account, setAccount] = useState<Account | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    let isCurrent = true

    const loadAccount = async () => {
      try {
        const loaded = await ensureAccount(requireToken(await getAccessTokenSilently()))
        if (!isCurrent) return
        setAccount(loaded)
        setError(null)
      } catch {
        if (isCurrent) setError('Could not load your account')
      }
    }

    loadAccount()
    return () => {
      isCurrent = false
    }
  }, [isAuthenticated, getAccessTokenSilently])

  return (
    <AccountContext.Provider
      value={{
        account: isAuthenticated ? account : null,
        error: isAuthenticated ? error : null,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider')
  }
  return context
}
