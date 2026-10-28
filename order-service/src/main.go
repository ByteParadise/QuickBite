package main

import (
	"context"
	"log"
	"net/http"
	"os"

	orderdb "quickbite-order-service/src/db"
	services "quickbite-order-service/src/services"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	services.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func main() {
	// Go's standard mechanism for carrying cancellation signals, deadlines, and request-scoped values across function calls and goroutines.
	// Operations below can be cancelled or time out rather than hanging in case of failures.
	var ctx context.Context = context.Background()
	db, err := orderdb.ConnectDB(ctx)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := orderdb.EnsureSchema(ctx, db); err != nil {
		log.Fatalf("failed to ensure schema: %v", err)
	}

	// Kafka Event Listeners
	go services.ConsumeAddressSaved(ctx, db)
	go services.ConsumeMenuUpdated(ctx, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4002"
	}

	/* Multiplexer: this handles each incoming HTTP request */
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /orders", services.MakeOrdersHandler(db))

	log.Printf("order-service listening on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
