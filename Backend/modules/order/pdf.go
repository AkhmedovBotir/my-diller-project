package order

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"github.com/phpdave11/gofpdf"
)

// latin1Safe PDF core shriftlari (Arial/Helvetica) faqat Latin-1/CP1252
// kodlashni qo'llab-quvvatlaydi. Platforma o'zi generatsiya qiladigan barcha
// matnlar (raqamlar, sanalar, o'zbekcha lotin matn) allaqachon oddiy ASCII
// harflar va apostrof (') dan iborat bo'lgani uchun to'g'ridan-to'g'ri mos
// keladi; faqat kutilmagan Latin-1 dan tashqari belgilarni '?' bilan
// almashtirib, PDF generatsiyasi buzilishining oldini oladi.
func latin1Safe(s string) string {
	return strings.Map(func(r rune) rune {
		if r > 255 {
			return '?'
		}
		return r
	}, s)
}

func newDocumentPDF() *gofpdf.Fpdf {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()
	return pdf
}

func pdfBytes(pdf *gofpdf.Fpdf) ([]byte, error) {
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("PDF faylini yaratib bo'lmadi: %w", err)
	}
	return buf.Bytes(), nil
}

func pdfTitle(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, latin1Safe(title), "", 1, "C", false, 0, "")
	pdf.Ln(2)
}

func pdfLine(pdf *gofpdf.Fpdf, label, value string) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(55, 7, latin1Safe(label), "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.MultiCell(0, 7, latin1Safe(value), "", "L", false)
}

var itemColWidths = []float64{10, 85, 20, 30, 35}

func pdfItemsTableHeader(pdf *gofpdf.Fpdf) {
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(230, 230, 230)
	headers := []string{"No", "Mahsulot", "Miqdor", "Narxi", "Summa"}
	aligns := []string{"C", "L", "C", "R", "R"}
	for i, h := range headers {
		pdf.CellFormat(itemColWidths[i], 8, latin1Safe(h), "1", 0, aligns[i], true, 0, "")
	}
	pdf.Ln(-1)
}

func pdfItemsTableRows(pdf *gofpdf.Fpdf, items []OrderItem) {
	pdf.SetFont("Arial", "", 10)
	for i, it := range items {
		pdf.CellFormat(itemColWidths[0], 8, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(itemColWidths[1], 8, latin1Safe(fmt.Sprintf("%s (%s)", it.ProductName, it.ProductCode)), "1", 0, "L", false, 0, "")
		pdf.CellFormat(itemColWidths[2], 8, fmt.Sprintf("%d", it.Quantity), "1", 0, "C", false, 0, "")
		pdf.CellFormat(itemColWidths[3], 8, money(it.UnitPrice), "1", 0, "R", false, 0, "")
		pdf.CellFormat(itemColWidths[4], 8, money(it.LineTotal), "1", 1, "R", false, 0, "")
	}
}

// BuildContractPDF buyurtma ma'lumotlari asosida yetkazib berish shartnomasi
// PDF faylini yaratadi.
func BuildContractPDF(o *Order) ([]byte, error) {
	pdf := newDocumentPDF()

	pdfTitle(pdf, fmt.Sprintf("Yetkazib berish shartnomasi No %s", o.Number))
	pdfLine(pdf, "Tuzilgan sana:", time.Now().Format("2006-01-02 15:04"))
	pdfLine(pdf, "Buyurtma raqami:", o.Number)
	pdfLine(pdf, "Hisob-faktura raqami:", o.InvoiceNumber)
	pdfLine(pdf, "To'lov sharti:", fmt.Sprintf("%s (%d kun)", paymentTermLabel(o.PaymentTerm), o.PaymentDays))
	pdfLine(pdf, "A nuqta (yuk olinadi):", o.PointAAddress)
	pdfLine(pdf, "B nuqta (yetkaziladi):", o.PointBAddress)
	pdf.Ln(4)

	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(0, 8, latin1Safe("Buyurtma tarkibi"), "", 1, "L", false, 0, "")
	pdfItemsTableHeader(pdf)
	pdfItemsTableRows(pdf, o.Items)

	pdf.Ln(4)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(0, 8, latin1Safe(fmt.Sprintf("Jami summa: %s so'm", money(o.TotalAmount))), "", 1, "R", false, 0, "")
	if o.AdvanceAmount > 0 {
		pdf.SetFont("Arial", "", 11)
		pdf.CellFormat(0, 7, latin1Safe(fmt.Sprintf("Avans summasi: %s so'm", money(o.AdvanceAmount))), "", 1, "R", false, 0, "")
	}

	pdf.Ln(6)
	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(0, 6, latin1Safe(
		"Tomonlar ushbu shartnoma shartlarini to'liq va o'z vaqtida bajarishga majburdirlar. "+
			"Yuzaga kelishi mumkin bo'lgan nizolar platforma qoidalari asosida hal qilinadi.",
	), "", "L", false)

	return pdfBytes(pdf)
}

// BuildInvoicePDF buyurtma bo'yicha hisob-faktura PDF faylini yaratadi.
func BuildInvoicePDF(o *Order) ([]byte, error) {
	pdf := newDocumentPDF()

	pdfTitle(pdf, fmt.Sprintf("Hisob-faktura No %s", o.InvoiceNumber))
	pdfLine(pdf, "Sana:", time.Now().Format("2006-01-02 15:04"))
	pdfLine(pdf, "Buyurtma raqami:", o.Number)
	pdfLine(pdf, "To'lov sharti:", paymentTermLabel(o.PaymentTerm))
	pdf.Ln(4)

	pdfItemsTableHeader(pdf)
	pdfItemsTableRows(pdf, o.Items)

	pdf.Ln(4)
	pdf.SetFont("Arial", "B", 13)
	pdf.CellFormat(0, 9, latin1Safe(fmt.Sprintf("Jami to'lov: %s so'm", money(o.TotalAmount))), "", 1, "R", false, 0, "")

	return pdfBytes(pdf)
}

// BuildCommissionInvoicePDF platforma komissiyasi bo'yicha hisob-faktura
// PDF faylini yaratadi.
func BuildCommissionInvoicePDF(c *Commission) ([]byte, error) {
	pdf := newDocumentPDF()

	statusText := "To'lanishi kerak"
	switch c.Status {
	case CommissionStatusPaid:
		statusText = "To'langan"
	case CommissionStatusWaived:
		statusText = "Bepul aksiya doirasida bekor qilingan"
	}

	pdfTitle(pdf, "Platforma komissiyasi hisob-fakturasi")
	pdfLine(pdf, "Sana:", time.Now().Format("2006-01-02 15:04"))
	pdfLine(pdf, "Buyurtma ID:", fmt.Sprintf("%d", c.BuyurtmaID))
	pdfLine(pdf, "Buyurtma summasi:", money(c.OrderAmount)+" so'm")
	pdfLine(pdf, "Komissiya foizi:", money(c.Percent)+"%")
	pdfLine(pdf, "Komissiya summasi:", money(c.Amount)+" so'm")
	pdfLine(pdf, "Holati:", statusText)

	return pdfBytes(pdf)
}
