import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useAccount } from '../context/AccountContext'
import {
  createAddress,
  fetchAddresses,
  requireToken,
  type NewAddress,
  type SavedAddress,
} from '../services/accountApi'

export function useSavedAddresses() {
  const { getAccessTokenSilently } = useAuth0()
  const { account } = useAccount()
  const accountId = account?.id ?? null

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return

    let isCurrent = true

    const load = async () => {
      try {
        const addresses = await fetchAddresses(requireToken(await getAccessTokenSilently()))
        if (isCurrent) setSavedAddresses(addresses)
      } catch {
        if (isCurrent) setError('Could not load saved addresses')
      }
    }

    load()
    return () => {
      isCurrent = false
    }
  }, [accountId, getAccessTokenSilently])

  const storeAddress = async (address: NewAddress) => {
    setIsSaving(true)
    setError(null)
    try {
      const saved = await createAddress(requireToken(await getAccessTokenSilently()), address)
      setSavedAddresses((prev) => [saved, ...prev])
    } catch {
      setError('Could not save this address. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    savedAddresses: accountId ? savedAddresses : [],
    storeAddress,
    isSaving,
    error,
    isReady: accountId !== null,
  }
}
