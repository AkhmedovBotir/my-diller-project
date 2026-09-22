package birgaxarid

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const customerSelect = `
	id, phone, first_name, last_name,
	CASE WHEN birth_date IS NULL THEN NULL ELSE to_char(birth_date, 'YYYY-MM-DD') END,
	region_name, city_name, mfy_name, address, lat, lng,
	profile_completed, is_blocked, blocked_reason, created_at, updated_at`

func scanCustomer(row pgx.Row) (*Customer, error) {
	var c Customer
	err := row.Scan(
		&c.ID, &c.Phone, &c.FirstName, &c.LastName, &c.BirthDate,
		&c.RegionName, &c.CityName, &c.MfyName, &c.Address,
		&c.Lat, &c.Lng, &c.ProfileCompleted, &c.IsBlocked, &c.BlockedReason,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func profileCompleted(in CustomerInput) bool {
	return strings.TrimSpace(in.FirstName) != "" &&
		strings.TrimSpace(in.LastName) != "" &&
		strings.TrimSpace(in.BirthDate) != "" &&
		strings.TrimSpace(in.RegionName) != "" &&
		strings.TrimSpace(in.CityName) != "" &&
		strings.TrimSpace(in.MfyName) != ""
}

func nullDate(raw string) any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if _, err := time.Parse("2006-01-02", raw); err != nil {
		return nil
	}
	return raw
}

func (r *Repository) CreateCustomer(ctx context.Context, in CustomerInput) (*Customer, error) {
	c, err := scanCustomer(r.pool.QueryRow(ctx, `
		INSERT INTO customers (phone, first_name, last_name, birth_date, region_name, city_name, mfy_name, address, lat, lng, profile_completed)
		VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11)
		RETURNING `+customerSelect,
		strings.TrimSpace(in.Phone), strings.TrimSpace(in.FirstName), strings.TrimSpace(in.LastName),
		nullDate(in.BirthDate),
		strings.TrimSpace(in.RegionName), strings.TrimSpace(in.CityName), strings.TrimSpace(in.MfyName),
		strings.TrimSpace(in.Address), in.Lat, in.Lng, profileCompleted(in)))
	if err != nil {
		return nil, mapError(err, "mijoz yaratilmadi")
	}
	return c, nil
}

func (r *Repository) ListCustomers(ctx context.Context, search string, limit, offset int) ([]Customer, error) {
	search = strings.TrimSpace(search)
	var rows pgx.Rows
	var err error
	if search == "" {
		rows, err = r.pool.Query(ctx, `
			SELECT `+customerSelect+` FROM customers ORDER BY id DESC LIMIT $1 OFFSET $2`, nullLimit(limit), offset)
	} else {
		like := "%" + search + "%"
		rows, err = r.pool.Query(ctx, `
			SELECT `+customerSelect+` FROM customers
			WHERE phone ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
			ORDER BY id DESC LIMIT $2 OFFSET $3`, like, nullLimit(limit), offset)
	}
	if err != nil {
		return nil, fmt.Errorf("mijozlar: %w", err)
	}
	defer rows.Close()
	items := make([]Customer, 0)
	for rows.Next() {
		c, err := scanCustomer(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *c)
	}
	return items, rows.Err()
}

func (r *Repository) GetCustomer(ctx context.Context, id int64) (*Customer, error) {
	c, err := scanCustomer(r.pool.QueryRow(ctx, `
		SELECT `+customerSelect+` FROM customers WHERE id = $1`, id))
	if err != nil {
		return nil, mapError(err, "mijoz")
	}
	return c, nil
}

func (r *Repository) GetCustomerByPhone(ctx context.Context, phone string) (*Customer, error) {
	c, err := scanCustomer(r.pool.QueryRow(ctx, `
		SELECT `+customerSelect+` FROM customers WHERE phone = $1`, strings.TrimSpace(phone)))
	if err != nil {
		return nil, mapError(err, "mijoz")
	}
	return c, nil
}

func (r *Repository) UpdateCustomer(ctx context.Context, id int64, in CustomerInput) (*Customer, error) {
	c, err := scanCustomer(r.pool.QueryRow(ctx, `
		UPDATE customers SET
			phone = $1, first_name = $2, last_name = $3, birth_date = $4::date,
			region_name = $5, city_name = $6, mfy_name = $7, address = $8,
			lat = $9, lng = $10, profile_completed = $11, updated_at = now()
		WHERE id = $12
		RETURNING `+customerSelect,
		strings.TrimSpace(in.Phone), strings.TrimSpace(in.FirstName), strings.TrimSpace(in.LastName),
		nullDate(in.BirthDate),
		strings.TrimSpace(in.RegionName), strings.TrimSpace(in.CityName), strings.TrimSpace(in.MfyName),
		strings.TrimSpace(in.Address), in.Lat, in.Lng, profileCompleted(in), id))
	if err != nil {
		return nil, mapError(err, "mijoz yangilanmadi")
	}
	return c, nil
}

func (r *Repository) DeleteCustomer(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM customers WHERE id = $1`, id)
	if err != nil {
		return mapError(err, "mijoz o'chirilmadi")
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) BlockCustomer(ctx context.Context, id int64, reason string) (*Customer, error) {
	c, err := scanCustomer(r.pool.QueryRow(ctx, `
		UPDATE customers SET is_blocked = true, blocked_reason = $1, updated_at = now()
		WHERE id = $2 RETURNING `+customerSelect, strings.TrimSpace(reason), id))
	if err != nil {
		return nil, mapError(err, "bloklash")
	}
	return c, nil
}

func (r *Repository) UnblockCustomer(ctx context.Context, id int64) (*Customer, error) {
	c, err := scanCustomer(r.pool.QueryRow(ctx, `
		UPDATE customers SET is_blocked = false, blocked_reason = '', updated_at = now()
		WHERE id = $1 RETURNING `+customerSelect, id))
	if err != nil {
		return nil, mapError(err, "blokdan chiqarish")
	}
	return c, nil
}

func (r *Repository) ListCart(ctx context.Context, customerID int64) ([]CartItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.customer_id, c.group_buy_id, c.quantity,
		       g.title, g.price,
		       COALESCE(g.photo_urls[1], ''),
		       g.status,
		       GREATEST(g.stock - g.current_volume, 0),
		       c.created_at, c.updated_at
		FROM cart_items c
		JOIN group_buys g ON g.id = c.group_buy_id
		WHERE c.customer_id = $1
		ORDER BY c.id DESC`, customerID)
	if err != nil {
		return nil, fmt.Errorf("savat: %w", err)
	}
	defer rows.Close()
	items := make([]CartItem, 0)
	for rows.Next() {
		var it CartItem
		if err := rows.Scan(
			&it.ID, &it.CustomerID, &it.GroupBuyID, &it.Quantity,
			&it.Title, &it.Price, &it.PhotoURL, &it.Status, &it.MaxQuantity,
			&it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *Repository) GetCartItem(ctx context.Context, customerID, groupBuyID int64) (*CartItem, error) {
	var it CartItem
	err := r.pool.QueryRow(ctx, `
		SELECT c.id, c.customer_id, c.group_buy_id, c.quantity,
		       g.title, g.price, COALESCE(g.photo_urls[1], ''), g.status,
		       GREATEST(g.stock - g.current_volume, 0), c.created_at, c.updated_at
		FROM cart_items c
		JOIN group_buys g ON g.id = c.group_buy_id
		WHERE c.customer_id = $1 AND c.group_buy_id = $2`, customerID, groupBuyID).Scan(
		&it.ID, &it.CustomerID, &it.GroupBuyID, &it.Quantity,
		&it.Title, &it.Price, &it.PhotoURL, &it.Status, &it.MaxQuantity,
		&it.CreatedAt, &it.UpdatedAt,
	)
	if err != nil {
		return nil, mapError(err, "savat")
	}
	return &it, nil
}

func (r *Repository) UpsertCartItem(ctx context.Context, customerID, groupBuyID int64, qty int) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO cart_items (customer_id, group_buy_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (customer_id, group_buy_id)
		DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()`, customerID, groupBuyID, qty)
	if err != nil {
		return mapError(err, "savat yangilanmadi")
	}
	return nil
}

func (r *Repository) DeleteCartItem(ctx context.Context, customerID, groupBuyID int64) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM cart_items WHERE customer_id = $1 AND group_buy_id = $2`, customerID, groupBuyID)
	if err != nil {
		return mapError(err, "savatdan o'chirish")
	}
	return nil
}

func scanOrder(row pgx.Row) (*Order, error) {
	var o Order
	var courierID *int64
	err := row.Scan(
		&o.ID, &o.CustomerID, &o.GroupBuyID, &o.Quantity, &o.UnitPrice, &o.TotalAmount,
		&o.Status, &o.PickupCode, &courierID, &o.TitleSnapshot, &o.PhotoSnapshot, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	o.CourierID = courierID
	return &o, nil
}

func (r *Repository) CreateOrder(ctx context.Context, in OrderCreate) (*Order, error) {
	code := strings.TrimSpace(in.PickupCode)
	if code == "" {
		code = generatePickupCode()
	}
	o, err := scanOrder(r.pool.QueryRow(ctx, `
		INSERT INTO orders (
			customer_id, group_buy_id, quantity, unit_price, total_amount,
			status, pickup_code, title_snapshot, photo_snapshot
		) VALUES ($1,$2,$3,$4,$5,'collecting',$6,$7,$8)
		RETURNING id, customer_id, group_buy_id, quantity, unit_price, total_amount,
		          status, pickup_code, courier_id, title_snapshot, photo_snapshot, created_at, updated_at`,
		in.CustomerID, in.GroupBuyID, in.Quantity, in.UnitPrice, in.TotalAmount,
		code, in.TitleSnapshot, in.PhotoSnapshot))
	if err != nil {
		return nil, mapError(err, "buyurtma yaratilmadi")
	}
	return o, nil
}

func (r *Repository) ListOrdersByCustomer(ctx context.Context, customerID int64, limit, offset int) ([]Order, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, customer_id, group_buy_id, quantity, unit_price, total_amount,
		       status, pickup_code, courier_id, title_snapshot, photo_snapshot, created_at, updated_at
		FROM orders WHERE customer_id = $1
		ORDER BY id DESC LIMIT $2 OFFSET $3`, customerID, nullLimit(limit), offset)
	if err != nil {
		return nil, fmt.Errorf("buyurtmalar: %w", err)
	}
	defer rows.Close()
	items := make([]Order, 0)
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *o)
	}
	return items, rows.Err()
}

func (r *Repository) GetOrder(ctx context.Context, id int64) (*Order, error) {
	o, err := scanOrder(r.pool.QueryRow(ctx, `
		SELECT id, customer_id, group_buy_id, quantity, unit_price, total_amount,
		       status, pickup_code, courier_id, title_snapshot, photo_snapshot, created_at, updated_at
		FROM orders WHERE id = $1`, id))
	if err != nil {
		return nil, mapError(err, "buyurtma")
	}
	return o, nil
}

func (r *Repository) SetOrderStatus(ctx context.Context, id int64, status, pickupCode string) (*Order, error) {
	o, err := scanOrder(r.pool.QueryRow(ctx, `
		UPDATE orders SET status = $1,
			pickup_code = CASE WHEN $2 <> '' THEN $2 ELSE pickup_code END,
			updated_at = now()
		WHERE id = $3
		RETURNING id, customer_id, group_buy_id, quantity, unit_price, total_amount,
		          status, pickup_code, courier_id, title_snapshot, photo_snapshot, created_at, updated_at`,
		status, pickupCode, id))
	if err != nil {
		return nil, mapError(err, "buyurtma holati")
	}
	return o, nil
}

func (r *Repository) BumpGroupBuyVolume(ctx context.Context, id int64, delta int) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE group_buys
		SET current_volume = GREATEST(current_volume + $1, 0), updated_at = now()
		WHERE id = $2`, delta, id)
	if err != nil {
		return mapError(err, "yig'im hajmi")
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) ListProductsFiltered(ctx context.Context, categoryID, subcategoryID int64, limit, offset int) ([]Product, error) {
	query := `
		SELECT id, category_id, subcategory_id, name, description, unit, price, stock, photo_url, is_active, created_at, updated_at
		FROM products WHERE is_active = true`
	args := []any{}
	n := 1
	if categoryID > 0 {
		query += fmt.Sprintf(` AND category_id = $%d`, n)
		args = append(args, categoryID)
		n++
	}
	if subcategoryID > 0 {
		query += fmt.Sprintf(` AND subcategory_id = $%d`, n)
		args = append(args, subcategoryID)
		n++
	}
	query += fmt.Sprintf(` ORDER BY id DESC LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, nullLimit(limit), offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("mahsulotlar: %w", err)
	}
	defer rows.Close()
	items := make([]Product, 0)
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *p)
	}
	return items, rows.Err()
}

func orderViewSelect() string {
	return `
		o.id, o.customer_id, o.group_buy_id, o.quantity, o.unit_price, o.total_amount,
		o.status, o.pickup_code, o.courier_id, o.title_snapshot, o.photo_snapshot, o.created_at, o.updated_at,
		c.phone,
		TRIM(CONCAT(COALESCE(c.first_name,''), ' ', COALESCE(c.last_name,''))),
		c.region_name, c.city_name, c.mfy_name, c.address`
}

func scanOrderView(row pgx.Row) (*OrderView, error) {
	var v OrderView
	var courierID *int64
	err := row.Scan(
		&v.ID, &v.CustomerID, &v.GroupBuyID, &v.Quantity, &v.UnitPrice, &v.TotalAmount,
		&v.Status, &v.PickupCode, &courierID, &v.TitleSnapshot, &v.PhotoSnapshot, &v.CreatedAt, &v.UpdatedAt,
		&v.CustomerPhone, &v.CustomerName, &v.RegionName, &v.CityName, &v.MfyName, &v.Address,
	)
	if err != nil {
		return nil, err
	}
	v.CourierID = courierID
	v.CustomerName = strings.TrimSpace(v.CustomerName)
	return &v, nil
}

func (r *Repository) ListOrdersAdmin(ctx context.Context, status string, limit, offset int) ([]OrderView, error) {
	query := `
		SELECT ` + orderViewSelect() + `
		FROM orders o
		JOIN customers c ON c.id = o.customer_id`
	args := []any{}
	if status != "" {
		query += ` WHERE o.status = $1`
		args = append(args, status)
		query += ` ORDER BY o.id DESC LIMIT $2 OFFSET $3`
		args = append(args, nullLimit(limit), offset)
	} else {
		query += ` ORDER BY o.id DESC LIMIT $1 OFFSET $2`
		args = append(args, nullLimit(limit), offset)
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("buyurtmalar: %w", err)
	}
	defer rows.Close()
	items := make([]OrderView, 0)
	for rows.Next() {
		v, err := scanOrderView(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *v)
	}
	return items, rows.Err()
}

func (r *Repository) GetOrderView(ctx context.Context, id int64) (*OrderView, error) {
	v, err := scanOrderView(r.pool.QueryRow(ctx, `
		SELECT `+orderViewSelect()+`
		FROM orders o
		JOIN customers c ON c.id = o.customer_id
		WHERE o.id = $1`, id))
	if err != nil {
		return nil, mapError(err, "buyurtma")
	}
	if err := r.enrichOrderView(ctx, v); err != nil {
		return nil, err
	}
	return v, nil
}

func (r *Repository) enrichOrderView(ctx context.Context, v *OrderView) error {
	items, err := r.loadGroupBuyItems(ctx, v.GroupBuyID)
	if err != nil {
		return err
	}
	v.Items = items
	if strings.TrimSpace(v.PhotoSnapshot) == "" {
		for _, it := range items {
			if u := strings.TrimSpace(it.PhotoURL); u != "" {
				v.PhotoSnapshot = u
				break
			}
		}
	}
	if strings.TrimSpace(v.PhotoSnapshot) == "" {
		gb, err := r.GetGroupBuy(ctx, v.GroupBuyID)
		if err == nil && len(gb.PhotoURLs) > 0 {
			v.PhotoSnapshot = strings.TrimSpace(gb.PhotoURLs[0])
		}
	}
	return nil
}

func (r *Repository) HandoffOrdersForGroupBuy(ctx context.Context, groupBuyID int64) error {
	rows, err := r.pool.Query(ctx, `
		SELECT id, pickup_code FROM orders
		WHERE group_buy_id = $1 AND status = 'collecting'`, groupBuyID)
	if err != nil {
		return fmt.Errorf("handoff: %w", err)
	}
	defer rows.Close()
	type row struct {
		id   int64
		code string
	}
	var list []row
	for rows.Next() {
		var item row
		if err := rows.Scan(&item.id, &item.code); err != nil {
			return err
		}
		list = append(list, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, item := range list {
		code := strings.TrimSpace(item.code)
		if code == "" {
			code = generatePickupCode()
		}
		if _, err := r.SetOrderStatus(ctx, item.id, "awaiting_courier", code); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ListCourierOrders(ctx context.Context, courierID int64, region, city, mfy string, limit, offset int) ([]OrderView, error) {
	region = strings.TrimSpace(region)
	city = strings.TrimSpace(city)
	mfy = strings.TrimSpace(mfy)
	rows, err := r.pool.Query(ctx, `
		SELECT `+orderViewSelect()+`
		FROM orders o
		JOIN customers c ON c.id = o.customer_id
		WHERE
			(o.courier_id = $1 AND o.status IN ('with_courier', 'issued'))
			OR (
				o.status = 'awaiting_courier'
				AND (
					($2 <> '' AND LOWER(c.region_name) = LOWER($2))
					OR ($3 <> '' AND LOWER(c.city_name) = LOWER($3))
					OR ($4 <> '' AND LOWER(c.mfy_name) = LOWER($4))
				)
			)
		ORDER BY
			CASE o.status
				WHEN 'awaiting_courier' THEN 0
				WHEN 'with_courier' THEN 1
				ELSE 2
			END,
			o.id DESC
		LIMIT $5 OFFSET $6`,
		courierID, region, city, mfy, nullLimit(limit), offset)
	if err != nil {
		return nil, fmt.Errorf("kuryer buyurtmalari: %w", err)
	}
	defer rows.Close()
	items := make([]OrderView, 0)
	for rows.Next() {
		v, err := scanOrderView(rows)
		if err != nil {
			return nil, err
		}
		if err := r.enrichOrderView(ctx, v); err != nil {
			return nil, err
		}
		items = append(items, *v)
	}
	return items, rows.Err()
}

func (r *Repository) ClaimOrder(ctx context.Context, orderID, courierID int64) (*OrderView, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE orders
		SET status = 'with_courier', courier_id = $1, updated_at = now()
		WHERE id = $2 AND status = 'awaiting_courier' AND courier_id IS NULL`,
		courierID, orderID)
	if err != nil {
		return nil, mapError(err, "buyurtmani olish")
	}
	if tag.RowsAffected() == 0 {
		return nil, validationError("status", "Buyurtmani olish mumkin emas")
	}
	return r.GetOrderView(ctx, orderID)
}

func (r *Repository) DeliverOrder(ctx context.Context, orderID, courierID int64, code string) (*OrderView, error) {
	o, err := r.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if o.Status != "with_courier" {
		return nil, validationError("status", "Buyurtma hali kuryerda emas")
	}
	if o.CourierID == nil || *o.CourierID != courierID {
		return nil, validationError("courier", "Bu buyurtma sizga biriktirilmagan")
	}
	if strings.TrimSpace(o.PickupCode) != strings.TrimSpace(code) {
		return nil, validationError("code", "Tasdiqlash kodi noto'g'ri")
	}
	tag, err := r.pool.Exec(ctx, `
		UPDATE orders SET status = 'issued', updated_at = now()
		WHERE id = $1 AND courier_id = $2 AND status = 'with_courier'`,
		orderID, courierID)
	if err != nil {
		return nil, mapError(err, "topshirish")
	}
	if tag.RowsAffected() == 0 {
		return nil, validationError("status", "Topshirib bo'lmadi")
	}
	return r.GetOrderView(ctx, orderID)
}
