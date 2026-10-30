import { Link } from 'react-router-dom'
import { SiGoogle, SiGithub } from 'react-icons/si'
import { FaLinkedin } from 'react-icons/fa6'
import { useAuth0 } from '@auth0/auth0-react'

export default function Login() {
  const { loginWithRedirect } = useAuth0()

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 md:p-12 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold text-center mb-6 md:mb-8">Log in to QuickBite</h1>

        <div className="flex flex-col gap-4">
          <button onClick={() => loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })} 
          className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-300 px-5 py-3 text-base font-medium hover:bg-gray-50">
            <SiGoogle className="w-6 h-6" />
            Continue with Google
          </button>
          <button onClick={() => loginWithRedirect({ authorizationParams: { connection: 'github' } })}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-300 px-5 py-3 text-base font-medium hover:bg-gray-50">
            <SiGithub className="w-6 h-6" />
            Continue with GitHub
          </button>
          <button onClick={() => loginWithRedirect({ authorizationParams: { connection: 'linkedin' } })}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-gray-300 px-5 py-3 text-base font-medium hover:bg-gray-50">
            <FaLinkedin className="w-6 h-6 text-[#0A66C2]" />
            Continue with LinkedIn
          </button>
        </div>

        <Link to="/" className="block text-center text-sm text-gray-500 hover:underline mt-6">
          Back to home
        </Link>
      </div>
    </div>
  )
}
