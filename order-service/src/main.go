package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	orderdb "quickbite-order-service/src/db"
	api "quickbite-order-service/src/api"
	"quickbite-order-service/src/middleware"
)

import "github.com/joho/godotenv"


func healthHandler(w http.ResponseWriter, r *http.Request) {
	api.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func allowedOrigins() []string {
	origins := os.Getenv("CORS_ORIGINS")
	if origins == "" {
		origins = "http://localhost:5173"
	}
	return strings.Split(origins, ",")
}

func withCORS(next http.Handler) http.Handler {
	origins := allowedOrigins()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, allowed := range origins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				break
			}
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}



func main() {
	godotenv.Load()
	middleware.InitAuth()
	
	var ctx context.Context = context.Background()
	db, err := orderdb.ConnectDB(ctx)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := orderdb.EnsureSchema(ctx, db); err != nil {
		log.Fatalf("failed to ensure schema: %v", err)
	}

	go api.ConsumeAddressSaved(ctx, db)
	go api.ConsumeMenuUpdated(ctx, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4002"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /orders", middleware.OptionalAuth(api.MakeOrdersHandler(db)))
	mux.HandleFunc("GET /orders/me", middleware.RequireAuth(api.MakeOrderHistoryHandler(db)))


	log.Printf("order-service listening on port %s", port)
	if err := http.ListenAndServe(":"+port, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}
