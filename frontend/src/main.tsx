import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Auth0Provider, type AppState } from '@auth0/auth0-react'

// const onRedirectCallback = (appState?: AppState) => {
//   window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname)
// }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Auth0 wrapper */}
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
      // onRedirectCallback={onRedirectCallback}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
