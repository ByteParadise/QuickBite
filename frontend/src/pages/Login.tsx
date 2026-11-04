import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SiGithub } from 'react-icons/si'
import { FaLinkedin } from 'react-icons/fa6'
import { useAuth0 } from '@auth0/auth0-react'
import { clearLoginResume } from '../utils/loginResume'

export default function Login() {
  const { loginWithRedirect, isAuthenticated } = useAuth0()
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = (location.state as { returnTo?: { path: string; state: unknown } } | null)?.returnTo

  // Going back to this page after logging in shouldn't show the login screen again.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnTo?.path ?? '/', { replace: true, state: returnTo?.state })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const logInWith = (connection: string) =>
    loginWithRedirect({
      appState: { origin: returnTo },
      authorizationParams: { connection },
      // Replaces this page in history, so Back from Auth0 goes straight to the origin page.
      openUrl: async (url) => window.location.replace(url),
    })

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 md:p-12 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold text-center mb-6 md:mb-8">Log in to QuickBite</h1>

        <div className="flex flex-col gap-4">
          <button onClick={() => logInWith('github')}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-300 px-5 py-3 text-base font-medium hover:bg-gray-50">
            <SiGithub className="w-6 h-6" />
            Continue with GitHub
          </button>
          <button onClick={() => logInWith('linkedin')}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-300 px-5 py-3 text-base font-medium hover:bg-gray-50">
            <FaLinkedin className="w-6 h-6 text-[#0A66C2]" />
            Continue with LinkedIn
          </button>
        </div>

        <Link to="/" onClick={clearLoginResume} className="block text-center text-sm text-gray-500 hover:underline mt-6">
          ← Back
        </Link>
      </div>
    </div>
  )
}
