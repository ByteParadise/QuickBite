package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var httpClient = &http.Client{Timeout: 5 * time.Second}

// Returns Restaurant Service URL
func restaurantServiceURL() string {
	if url := os.Getenv("RESTAURANT_SERVICE_URL"); url != "" {
		return url
	}
	return "http://localhost:4001"
}

/* Write response and returns */
func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("failed to write response: %v", err)
	}
}

// Fetch Restaurant Menu
func fetchMenu(restaurantID string) (*menuResponse, int, error) {
	// Builds the full URL to call menu endpoint
	url := fmt.Sprintf("%s/restaurants/%s/menu", restaurantServiceURL(), restaurantID)

	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, 0, err
	}
	// Make sures to close the HTTP connection.
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, resp.StatusCode, fmt.Errorf("restaurant-service returned status %d", resp.StatusCode)
	}

	// Reads menu res and parses it into menu struct
	var menu menuResponse
	if err := json.NewDecoder(resp.Body).Decode(&menu); err != nil {
		return nil, resp.StatusCode, err
	}
	return &menu, resp.StatusCode, nil
}

func MakeOrdersHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse order request
		var req orderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}
		// Validate the order request
		if req.RestaurantID == "" || len(req.Items) == 0 {
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "restaurantId and items are required"})
			return
		}
		// Verify the restaurant menu
		menu, status, err := fetchMenu(req.RestaurantID)
		if err != nil {
			log.Printf("checkout failed: could not reach restaurant-service (status %d): %v", status, err)
			WriteJSON(w, http.StatusBadGateway, map[string]string{"error": "could not verify restaurant menu"})
			return
		}

		// Create menuById to check the order item is valid
		menuByID := make(map[string]menuItem, len(menu.Items))
		for _, item := range menu.Items {
			menuByID[item.ID] = item
		}

		lineItems := make([]orderLineItem, 0, len(req.Items))
		var total int64
		var currency string

		/* Validate each item */
		for _, reqItem := range req.Items {
			// validate quantity
			if reqItem.Quantity <= 0 {
				WriteJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid quantity for item %s", reqItem.ItemID)})
				return
			}
			// Validate menu existence
			item, ok := menuByID[reqItem.ItemID]
			if !ok {
				WriteJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("item %s not found", reqItem.ItemID)})
				return
			}
			// Validate menu availability
			if !item.Available {
				WriteJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("item %s not available", reqItem.ItemID)})
				return
			}

			// Calculate the quantity of each item and add it to subtotal
			subtotal := item.PriceMinorUnits * int64(reqItem.Quantity)
			lineItems = append(lineItems, orderLineItem{
				ItemID:              item.ID,
				Name:                item.Name,
				Quantity:            reqItem.Quantity,
				UnitPriceMinorUnits: item.PriceMinorUnits,
				SubtotalMinorUnits:  subtotal,
			})
			total += subtotal
			currency = item.Currency
		}

		/* Build each order */
		orderID := uuid.NewString()
		// Per request context
		ctx := r.Context()
		// The pool checks out one connection from its internal set
		tx, err := db.Begin(ctx)

		if err != nil {
			log.Printf("failed to begin transaction: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		// The connection must end either with Commit or Rollback to be released.
		defer tx.Rollback(ctx)

		// Write the order
		_, err = tx.Exec(ctx,
			"INSERT INTO orders (id, restaurant_id, total_minor_units, currency) VALUES ($1, $2, $3, $4)",
			orderID, req.RestaurantID, total, currency,
		)
		if err != nil {
			log.Printf("failed to insert order: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		// Write the details of the order
		for _, item := range lineItems {
			_, err = tx.Exec(ctx,
				"INSERT INTO order_items (id, order_id, item_id, name, quantity, unit_price_minor_units, subtotal_minor_units) VALUES ($1, $2, $3, $4, $5, $6, $7)",
				uuid.NewString(), orderID, item.ItemID, item.Name, item.Quantity, item.UnitPriceMinorUnits, item.SubtotalMinorUnits,
			)
			if err != nil {
				log.Printf("failed to insert order item: %v", err)
				WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
				return
			}
		}

		// Commit
		if err := tx.Commit(ctx); err != nil {
			log.Printf("failed to commit order: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		// Write response
		WriteJSON(w, http.StatusCreated, orderResponse{
			ID:              orderID,
			RestaurantID:    req.RestaurantID,
			Items:           lineItems,
			TotalMinorUnits: total,
			Currency:        currency,
		})
	}
}
