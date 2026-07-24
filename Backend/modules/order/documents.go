package order

import (
	"crypto/rand"
	"fmt"
	"html"
	"math/big"
	"strings"
	"time"
)

// GenerateOrderNumber ORD-YYYYMMDD-XXXX formatida buyurtma raqami yaratadi.
func GenerateOrderNumber() (string, error) {
	suffix, err := randomDigits(4)
	if err != nil {
		return "", fmt.Errorf("buyurtma raqamini yaratib bo'lmadi: %w", err)
	}
	return fmt.Sprintf("ORD-%s-%s", time.Now().Format("20060102"), suffix), nil
}

// GenerateInvoiceNumber INV-YYYYMMDD-XXXX formatida hisob-faktura raqami yaratadi.
func GenerateInvoiceNumber() (string, error) {
	suffix, err := randomDigits(4)
	if err != nil {
		return "", fmt.Errorf("hisob-faktura raqamini yaratib bo'lmadi: %w", err)
	}
	return fmt.Sprintf("INV-%s-%s", time.Now().Format("20060102"), suffix), nil
}

func randomDigits(n int) (string, error) {
	max := int64(1)
	for i := 0; i < n; i++ {
		max *= 10
	}
	v, err := rand.Int(rand.Reader, big.NewInt(max))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%0*d", n, v.Int64()), nil
}

func money(v float64) string {
	return fmt.Sprintf("%.2f", v)
}

func esc(s string) string {
	return html.EscapeString(s)
}

func paymentTermLabel(term string) string {
	switch term {
	case PaymentTermPrepay100:
		return "100% oldindan to'lov"
	case PaymentTermDeferred:
		return "Muddatli to'lov (deferred)"
	case PaymentTermPodZakaz5050:
		return "Buyurtma asosida 50/50"
	default:
		return term
	}
}

// BuildContractHTML xaridor va ishlab chiqaruvchi o'rtasidagi shartnoma HTML
// matnini ikkala tomon rekvizitlari bilan yaratadi.
func BuildContractHTML(o *Order, items []OrderItem, m *manufacturerInfo, b *buyerInfo, note string) string {
	var itemsRows strings.Builder
	for i, it := range items {
		itemsRows.WriteString(fmt.Sprintf(
			`<tr><td>%d</td><td>%s (%s)</td><td>%d</td><td>%s</td><td>%s</td></tr>`,
			i+1, esc(it.ProductName), esc(it.ProductCode), it.Quantity, money(it.UnitPrice), money(it.LineTotal),
		))
	}

	noteBlock := ""
	if strings.TrimSpace(note) != "" {
		noteBlock = fmt.Sprintf(`<p><strong>Xaridor izohi:</strong> %s</p>`, esc(note))
	}

	buyerTitle := fmt.Sprintf("%s (%s %s)", b.ShopName, b.FirstName, b.LastName)

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"><title>Shartnoma %s</title></head>
<body>
<h2>Yetkazib berish shartnomasi &#8470; %s</h2>
<p>Tuzilgan sana: %s</p>

<h3>1. Tomonlar</h3>
<table border="1" cellspacing="0" cellpadding="6">
<tr><th>Rekvizit</th><th>Ishlab chiqaruvchi (Sotuvchi)</th><th>Xaridor</th></tr>
<tr><td>Nomi</td><td>%s</td><td>%s</td></tr>
<tr><td>Telefon</td><td>%s</td><td>%s</td></tr>
<tr><td>Manzil</td><td>%s</td><td>%s</td></tr>
<tr><td>STIR</td><td>%s</td><td>%s</td></tr>
<tr><td>Hisob raqami</td><td>%s</td><td>%s</td></tr>
<tr><td>Bank</td><td>%s</td><td>%s</td></tr>
</table>

<h3>2. Buyurtma tarkibi</h3>
<table border="1" cellspacing="0" cellpadding="6">
<tr><th>&#8470;</th><th>Mahsulot</th><th>Miqdor</th><th>Narxi</th><th>Summa</th></tr>
%s
</table>
<p><strong>Jami summa:</strong> %s so'm</p>
<p><strong>To'lov sharti:</strong> %s (%d kun)</p>

<h3>3. Yetkazib berish manzillari</h3>
<p><strong>A nuqta (yuk olinadigan manzil):</strong> %s</p>
<p><strong>B nuqta (yetkazib beriladigan manzil):</strong> %s</p>
%s

<h3>4. Tomonlarning javobgarligi</h3>
<p>Tomonlar ushbu shartnoma shartlarini to'liq va o'z vaqtida bajarishga majburdirlar.
Yuzaga kelishi mumkin bo'lgan nizolar platforma qoidalari asosida hal qilinadi.</p>
</body>
</html>`,
		esc(o.Number), esc(o.Number), time.Now().Format("2006-01-02 15:04"),
		esc(m.CompanyName), esc(buyerTitle),
		esc(m.Phone), esc(b.Phone),
		esc(m.Address), esc(b.Address),
		esc(m.STIR), esc(b.STIR),
		esc(m.BankAccount), esc(b.BankAccount),
		esc(m.BankName), esc(b.BankName),
		itemsRows.String(),
		money(o.TotalAmount),
		esc(paymentTermLabel(o.PaymentTerm)), o.PaymentDays,
		esc(o.PointAAddress), esc(o.PointBAddress),
		noteBlock,
	)
}

// BuildInvoiceHTML buyurtma bo'yicha hisob-faktura HTML matnini yaratadi.
func BuildInvoiceHTML(o *Order, items []OrderItem, m *manufacturerInfo, b *buyerInfo) string {
	var itemsRows strings.Builder
	for i, it := range items {
		itemsRows.WriteString(fmt.Sprintf(
			`<tr><td>%d</td><td>%s (%s)</td><td>%d</td><td>%s</td><td>%s</td></tr>`,
			i+1, esc(it.ProductName), esc(it.ProductCode), it.Quantity, money(it.UnitPrice), money(it.LineTotal),
		))
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"><title>Hisob-faktura %s</title></head>
<body>
<h2>Hisob-faktura &#8470; %s</h2>
<p>Buyurtma &#8470; %s | Sana: %s</p>

<table border="1" cellspacing="0" cellpadding="6">
<tr><th>Rekvizit</th><th>Sotuvchi</th><th>Xaridor</th></tr>
<tr><td>Nomi</td><td>%s</td><td>%s</td></tr>
<tr><td>STIR</td><td>%s</td><td>%s</td></tr>
<tr><td>Hisob raqami</td><td>%s</td><td>%s</td></tr>
<tr><td>Bank</td><td>%s</td><td>%s</td></tr>
</table>

<table border="1" cellspacing="0" cellpadding="6">
<tr><th>&#8470;</th><th>Mahsulot</th><th>Miqdor</th><th>Narxi</th><th>Summa</th></tr>
%s
</table>

<h3>Jami to'lov: %s so'm</h3>
</body>
</html>`,
		esc(o.InvoiceNumber), esc(o.InvoiceNumber), esc(o.Number), time.Now().Format("2006-01-02 15:04"),
		esc(m.CompanyName), esc(b.ShopName),
		esc(m.STIR), esc(b.STIR),
		esc(m.BankAccount), esc(b.BankAccount),
		esc(m.BankName), esc(b.BankName),
		itemsRows.String(),
		money(o.TotalAmount),
	)
}

// BuildCommissionInvoiceHTML platforma komissiyasi uchun hisob-faktura HTML
// matnini yaratadi.
func BuildCommissionInvoiceHTML(c *Commission, o *Order, m *manufacturerInfo) string {
	statusText := "To'lanishi kerak"
	if c.Status == CommissionStatusWaived {
		statusText = "Bepul aksiya doirasida bekor qilingan"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"><title>Komissiya hisob-fakturasi</title></head>
<body>
<h2>Platforma komissiyasi hisob-fakturasi</h2>
<p>Buyurtma &#8470; %s | Sana: %s</p>

<table border="1" cellspacing="0" cellpadding="6">
<tr><th>Rekvizit</th><th>Qiymat</th></tr>
<tr><td>Ishlab chiqaruvchi</td><td>%s</td></tr>
<tr><td>STIR</td><td>%s</td></tr>
<tr><td>Hisob raqami</td><td>%s</td></tr>
<tr><td>Bank</td><td>%s</td></tr>
<tr><td>Buyurtma summasi</td><td>%s so'm</td></tr>
<tr><td>Komissiya foizi</td><td>%s%%</td></tr>
<tr><td>Komissiya summasi</td><td>%s so'm</td></tr>
<tr><td>Holati</td><td>%s</td></tr>
</table>
</body>
</html>`,
		esc(o.Number), time.Now().Format("2006-01-02 15:04"),
		esc(m.CompanyName), esc(m.STIR), esc(m.BankAccount), esc(m.BankName),
		money(c.OrderAmount), money(c.Percent), money(c.Amount), statusText,
	)
}
