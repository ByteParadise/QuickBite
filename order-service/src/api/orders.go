package services

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"quickbite-order-service/src/middleware"
)


/* Write response and returns */
func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("failed to write response: %v", err)
	}
}

const orderCurrency = "usd"

func MakeOrdersHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req orderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}

		if req.Restaurant.PlaceID == "" || len(req.Items) == 0 {
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "restaurant and items are required"})
			return
		}
		if req.DeliveryAddress.Line1 == "" || req.DeliveryAddress.City == "" ||
			req.DeliveryAddress.State == "" || req.DeliveryAddress.PostalCode == "" {
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "a complete delivery address is required"})
			return
		}
		if req.CardID == "" {
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "cardId is required"})
			return
		}

		lineItems := make([]orderLineItem, 0, len(req.Items))
		var total int64

		for _, reqItem := range req.Items {
			if reqItem.Quantity <= 0 {
				WriteJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid quantity for item %d", reqItem.ID)})
				return
			}
			if reqItem.Price < 0 {
				WriteJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid price for item %d", reqItem.ID)})
				return
			}

			unitPriceMinorUnits := int64(math.Round(reqItem.Price * 100))
			subtotal := unitPriceMinorUnits * int64(reqItem.Quantity)
			lineItems = append(lineItems, orderLineItem{
				ItemID:              fmt.Sprintf("%d", reqItem.ID),
				Name:                reqItem.Title,
				Quantity:            reqItem.Quantity,
				UnitPriceMinorUnits: unitPriceMinorUnits,
				SubtotalMinorUnits:  subtotal,
			})
			total += subtotal
		}

		orderID := uuid.NewString()
		ctx := r.Context()
		tx, err := db.Begin(ctx)
		if err != nil {
			log.Printf("failed to begin transaction: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		defer tx.Rollback(ctx)

		var accountSubValue any
		if sub := middleware.AccountSub(r); sub != "" {
			accountSubValue = sub
		}

		_, err = tx.Exec(ctx,
			`INSERT INTO orders
				(id, restaurant_id, restaurant_name, total_minor_units, currency, account_sub, card_id, line1, city, state, postal_code, lat, lng)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
			orderID, req.Restaurant.PlaceID, req.Restaurant.Name, total, orderCurrency, accountSubValue, req.CardID,
			req.DeliveryAddress.Line1, req.DeliveryAddress.City, req.DeliveryAddress.State, req.DeliveryAddress.PostalCode,
			req.DeliveryAddress.Lat, req.DeliveryAddress.Lng,
		)
		if err != nil {
			log.Printf("failed to insert order: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

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

		if err := tx.Commit(ctx); err != nil {
			log.Printf("failed to commit order: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		WriteJSON(w, http.StatusCreated, orderResponse{
			ID:              orderID,
			RestaurantID:    req.Restaurant.PlaceID,
			RestaurantName:  req.Restaurant.Name,
			Items:           lineItems,
			TotalMinorUnits: total,
			Currency:        orderCurrency,
		})
	}
}
