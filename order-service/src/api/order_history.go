package services

import (
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"quickbite-order-service/src/middleware"
)

type orderSummary struct {
	ID              string `json:"id"`
	RestaurantName  string `json:"restaurantName"`
	TotalMinorUnits int64  `json:"totalMinorUnits"`
	Currency        string `json:"currency"`
	ItemCount       int    `json:"itemCount"`
	CreatedAt       string `json:"createdAt"`
}

func MakeOrderHistoryHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(r.Context(),
			`SELECT o.id, o.restaurant_name, o.total_minor_units, o.currency, o.created_at, COUNT(oi.id)
			 FROM orders o
			 LEFT JOIN order_items oi ON oi.order_id = o.id
			 WHERE o.account_sub = $1
			 GROUP BY o.id
			 ORDER BY o.created_at DESC`,
			middleware.AccountSub(r),
		)
		if err != nil {
			log.Printf("failed to list orders: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		defer rows.Close()

		orders := []orderSummary{}
		for rows.Next() {
			var o orderSummary
			var createdAt time.Time
			if err := rows.Scan(&o.ID, &o.RestaurantName, &o.TotalMinorUnits, &o.Currency, &createdAt, &o.ItemCount); err != nil {
				log.Printf("failed to scan order row: %v", err)
				WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
				return
			}
			o.CreatedAt = createdAt.Format(time.RFC3339)
			orders = append(orders, o)
		}
		if err := rows.Err(); err != nil {
			log.Printf("failed to iterate order rows: %v", err)
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		WriteJSON(w, http.StatusOK, orders)
	}
}
