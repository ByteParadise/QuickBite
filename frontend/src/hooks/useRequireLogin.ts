import { useAuth0 } from '@auth0/auth0-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useOverlay } from '../context/OverlayContext'
import { saveLoginResume, type LoginResume } from '../utils/loginResume'

/** Returns a check that is true when logged in; otherwise it starts the login flow. */
export function useRequireLogin() {
  const { isAuthenticated, isLoading } = useAuth0()
  const { closeOverlay } = useOverlay()
  const navigate = useNavigate()
  const location = useLocation()

  return (resume: LoginResume): boolean => {
    if (isLoading) return false
    if (isAuthenticated) return true

    saveLoginResume(resume)
    closeOverlay()
    navigate('/login', {
      state: {
        returnTo: { path: location.pathname + location.search, state: location.state },
      },
    })
    return false
  }
}
