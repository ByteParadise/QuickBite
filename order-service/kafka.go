package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/segmentio/kafka-go"
	"google.golang.org/protobuf/proto"

	// `option go_package` from each proto file enables this name convention.
	accountv1 "quickbite-order-service/gen/go/quickbite/account/v1"
	restaurantv1 "quickbite-order-service/gen/go/quickbite/restaurant/v1"
)

const addressSavedTopic = "quickbite.account.v1.AddressSaved"

func kafkaBroker() string {
	if broker := os.Getenv("KAFKA_BROKER"); broker != "" {
		return broker
	}
	return "localhost:9092"
}

func consumeAddressSaved(ctx context.Context, db *pgxpool.Pool) {
	// Get kafka reader for addressSavedTopic
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{kafkaBroker()},
		Topic:   addressSavedTopic,
		GroupID: "order-service",
	})
	defer reader.Close()

	for {
		// Get the addressSaved message
		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			log.Printf("AddressSaved: failed to read message: %v", err)
			return
		}

		// Unmarshall the msg
		var event accountv1.AddressSaved
		if err := proto.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("AddressSaved: failed to unmarshal message: %v", err)
			continue
		}

		// Insert the address info
		addr := event.GetAddress()
		_, err = db.Exec(ctx,
			`INSERT INTO addresses (address_id, customer_id, line1, line2, city, region, postal_code, country_code, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
			 ON CONFLICT (address_id) DO UPDATE SET
			   customer_id = EXCLUDED.customer_id,
			   line1 = EXCLUDED.line1,
			   line2 = EXCLUDED.line2,
			   city = EXCLUDED.city,
			   region = EXCLUDED.region,
			   postal_code = EXCLUDED.postal_code,
			   country_code = EXCLUDED.country_code,
			   updated_at = now()`,
			event.GetAddressId(), event.GetCustomerId(), addr.GetLine1(), addr.GetLine2(),
			addr.GetCity(), addr.GetRegion(), addr.GetPostalCode(), addr.GetCountryCode(),
		)
		if err != nil {
			log.Printf("AddressSaved: failed to upsert address %s: %v", event.GetAddressId(), err)
			continue
		}
	}
}

const menuUpdatedTopic = "quickbite.restaurant.v1.MenuUpdated"

func consumeMenuUpdated(ctx context.Context, db *pgxpool.Pool) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{kafkaBroker()},
		Topic:   menuUpdatedTopic,
		GroupID: "order-service",
	})
	defer reader.Close()

	for {
		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			log.Printf("MenuUpdated: failed to read message: %v", err)
			return
		}

		var event restaurantv1.MenuUpdated
		if err := proto.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("MenuUpdated: failed to unmarshal message: %v", err)
			continue
		}

		for _, item := range event.GetItems() {
			_, err = db.Exec(ctx,
				`INSERT INTO menu_items (item_id, restaurant_id, name, price_minor_units, currency, available, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, now())
				 ON CONFLICT (item_id) DO UPDATE SET
				   restaurant_id = EXCLUDED.restaurant_id,
				   name = EXCLUDED.name,
				   price_minor_units = EXCLUDED.price_minor_units,
				   currency = EXCLUDED.currency,
				   available = EXCLUDED.available,
				   updated_at = now()`,
				item.GetItemId(), event.GetRestaurantId(), item.GetName(),
				item.GetPriceMinorUnits(), item.GetCurrency(), item.GetAvailable(),
			)
			if err != nil {
				log.Printf("MenuUpdated: failed to upsert item %s: %v", item.GetItemId(), err)
				continue
			}
		}
	}
}