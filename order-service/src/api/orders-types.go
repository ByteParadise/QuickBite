package services

type orderItemRequest struct {
	ItemID   string `json:"itemId"`
	Quantity int    `json:"quantity"`
}

type orderRequest struct {
	RestaurantID string             `json:"restaurantId"`
	Items        []orderItemRequest `json:"items"`
}

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
	Items           []orderLineItem `json:"items"`
	TotalMinorUnits int64           `json:"totalMinorUnits"`
	Currency        string          `json:"currency"`
}
