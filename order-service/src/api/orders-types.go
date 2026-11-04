package services

type orderItemRequest struct {
	ID       int64   `json:"id"`
	Title    string  `json:"title"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
}

type orderRestaurantRequest struct {
	PlaceID string  `json:"placeId"`
	Name    string  `json:"name"`
	Address string  `json:"address"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
}

type orderDeliveryAddressRequest struct {
	Line1      string  `json:"line1"`
	City       string  `json:"city"`
	State      string  `json:"state"`
	PostalCode string  `json:"postalCode"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
}

type orderRequest struct {
	Restaurant      orderRestaurantRequest      `json:"restaurant"`
	Items           []orderItemRequest          `json:"items"`
	DeliveryAddress orderDeliveryAddressRequest `json:"deliveryAddress"`
	CardID          string                      `json:"cardId"`
}

// menuItem and menuResponse are no longer used by MakeOrdersHandler — checkout
// no longer re-validates against restaurant-service's menu — but stay here
// since fetchMenu in orders.go (kept for its Kafka/Redis wiring) still uses them.
type menuItem struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	PriceMinorUnits int64  `json:"priceMinorUnits"`
	Currency        string `json:"currency"`
	Available       bool   `json:"available"`
}

type menuResponse struct {
	RestaurantID string     `json:"restaurantId"`
	Name         string     `json:"name"`
	Items        []menuItem `json:"items"`
}

type orderLineItem struct {
	ItemID              string `json:"itemId"`
	Name                string `json:"name"`
	Quantity            int    `json:"quantity"`
	UnitPriceMinorUnits int64  `json:"unitPriceMinorUnits"`
	SubtotalMinorUnits  int64  `json:"subtotalMinorUnits"`
}

type orderResponse struct {
	ID              string          `json:"id"`
	RestaurantID    string          `json:"restaurantId"`
	RestaurantName  string          `json:"restaurantName"`
	Items           []orderLineItem `json:"items"`
	TotalMinorUnits int64           `json:"totalMinorUnits"`
	Currency        string          `json:"currency"`
}
