package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const accountSubKey contextKey = "accountSub"

var jwks keyfunc.Keyfunc

// InitAuth loads Auth0's JWKS. Must be called after any .env loading (e.g.
// godotenv.Load()) — package init() functions run before main(), too early
// to see env vars main() loads itself.
func InitAuth() {
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
		log.Println("AUTH0_DOMAIN not set — every authenticated request will be rejected")
		return
	}
	jwksURL := fmt.Sprintf("https://%s/.well-known/jwks.json", domain)
	k, err := keyfunc.NewDefaultCtx(context.Background(), []string{jwksURL})
	if err != nil {
		log.Printf("failed to load Auth0 JWKS: %v", err)
		return
	}
	jwks = k
}


// verifyToken validates a raw "Bearer <token>" Authorization header value and
// returns the token's verified subject.
func verifyToken(header string) (string, error) {
	tokenString, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || jwks == nil {
		return "", fmt.Errorf("invalid authorization header")
	}

	audience := os.Getenv("AUTH0_AUDIENCE")
	domain := os.Getenv("AUTH0_DOMAIN")
	token, err := jwt.Parse(tokenString, jwks.Keyfunc,
		jwt.WithAudience(audience),
		jwt.WithIssuer(fmt.Sprintf("https://%s/", domain)),
	)
	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	if !ok || sub == "" {
		return "", fmt.Errorf("invalid token claims")
	}
	return sub, nil
}

/* OptionalAuth validates the bearer token when one is sent, so guests can still
check out: no Authorization header passes through with no account attached, but
a token that IS sent must be valid or the request is rejected outright. */
func OptionalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			next(w, r)
			return
		}

		sub, err := verifyToken(header)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), accountSubKey, sub)
		next(w, r.WithContext(ctx))
	}
}

// RequireAuth is like OptionalAuth, but a missing Authorization header is
// itself rejected — for routes with no meaningful guest behavior, like order history.
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			http.Error(w, `{"error":"authorization required"}`, http.StatusUnauthorized)
			return
		}

		sub, err := verifyToken(header)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), accountSubKey, sub)
		next(w, r.WithContext(ctx))
	}
}

// AccountSub returns the verified Auth0 subject for this request, or "" for a guest.
func AccountSub(r *http.Request) string {
	sub, _ := r.Context().Value(accountSubKey).(string)
	return sub
}
