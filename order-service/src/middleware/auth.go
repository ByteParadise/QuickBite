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

// Loads Auth0's JWKS once at startup; a missing/unreachable JWKS just means
// every request is treated as a guest, same as a missing Authorization header.
func init() {
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
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

		tokenString, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || jwks == nil {
			http.Error(w, `{"error":"invalid authorization header"}`, http.StatusUnauthorized)
			return
		}

		audience := os.Getenv("AUTH0_AUDIENCE")
		domain := os.Getenv("AUTH0_DOMAIN")
		token, err := jwt.Parse(tokenString, jwks.Keyfunc,
			jwt.WithAudience(audience),
			jwt.WithIssuer(fmt.Sprintf("https://%s/", domain)),
		)
		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		sub, _ := claims["sub"].(string)
		if !ok || sub == "" {
			http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
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
