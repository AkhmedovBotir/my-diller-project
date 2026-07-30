package order

import (
	"errors"
	"fmt"
	"log/slog"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"diller-backend/internal/pkg/auth"
	"diller-backend/internal/pkg/httputil"
)

const maxReceiptMemory = 10 << 20 // 10 MB

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// ---- Xaridor ----

func (h *Handler) XaridorCreate(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	var input CreateOrderInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	o, err := h.service.CreateOrder(r.Context(), claims.SubjectID, input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusCreated, o)
}

func (h *Handler) XaridorList(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListByXaridor(r.Context(), claims.SubjectID, r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) XaridorGet(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetByXaridor(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) XaridorReceive(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.ReceiveByXaridor(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) XaridorUploadReceipt(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	file, err := parseReceiptFile(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	o, err := h.service.UploadReceiptByXaridor(r.Context(), claims.SubjectID, id, file)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) XaridorAgreeInvoice(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.AgreeInvoiceByXaridor(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) XaridorGetShartnoma(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	manufacturerID, ok := parseURLParamID(w, r, "ishlabchiqaruvchi_id")
	if !ok {
		return
	}

	sh, err := h.service.GetShartnomaForXaridor(r.Context(), claims.SubjectID, manufacturerID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, sh)
}

func (h *Handler) XaridorAgreeShartnoma(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	manufacturerID, ok := parseURLParamID(w, r, "ishlabchiqaruvchi_id")
	if !ok {
		return
	}

	sh, err := h.service.AgreeShartnomaForXaridor(r.Context(), claims.SubjectID, manufacturerID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, sh)
}

func (h *Handler) XaridorUploadAdvanceReceipt(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	file, err := parseReceiptFile(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	o, err := h.service.UploadAdvanceReceiptByXaridor(r.Context(), claims.SubjectID, id, file)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) XaridorContractPDF(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetByXaridor(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "contract")
}

func (h *Handler) XaridorInvoicePDF(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetByXaridor(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "invoice")
}

// ---- Ishlab chiqaruvchi ----

func (h *Handler) ManufacturerList(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListByManufacturer(r.Context(), claims.SubjectID, r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) ManufacturerGet(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerAccept(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.AcceptByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerConfirmAdvance(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.ConfirmAdvanceByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerRejectAdvanceReceipt(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	var input RejectReceiptInput
	if r.ContentLength > 0 {
		if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
			httputil.FieldError(w, http.StatusBadRequest, field, message)
			return
		}
	}

	o, err := h.service.RejectAdvanceReceiptByManufacturer(r.Context(), claims.SubjectID, id, input.Note)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerRejectPaymentReceipt(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	var input RejectReceiptInput
	if r.ContentLength > 0 {
		if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
			httputil.FieldError(w, http.StatusBadRequest, field, message)
			return
		}
	}

	o, err := h.service.RejectPaymentReceiptByManufacturer(r.Context(), claims.SubjectID, id, input.Note)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerContractPDF(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "contract")
}

func (h *Handler) ManufacturerInvoicePDF(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "invoice")
}

func (h *Handler) ManufacturerReady(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	var input ReadyInput
	if r.ContentLength > 0 {
		if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
			httputil.FieldError(w, http.StatusBadRequest, field, message)
			return
		}
	}

	o, err := h.service.ReadyByManufacturer(r.Context(), claims.SubjectID, id, input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerShip(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.ShipByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerConfirmPayment(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.ConfirmPaymentByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) ManufacturerListCommissions(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListCommissionsByManufacturer(r.Context(), claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) ManufacturerUploadCommissionReceipt(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	file, err := parseReceiptFile(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	c, err := h.service.UploadCommissionReceiptByManufacturer(r.Context(), claims.SubjectID, id, file)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, c)
}

func (h *Handler) ManufacturerMarkCommissionPaid(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	c, err := h.service.MarkCommissionPaidByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, c)
}

func (h *Handler) ManufacturerCommissionInvoicePDF(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	c, err := h.service.GetCommissionByManufacturer(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}

	data, err := BuildCommissionInvoicePDF(c)
	if err != nil {
		slog.Error("Komissiya PDF faylini yaratib bo'lmadi", "xatolik", err)
		httputil.Error(w, http.StatusInternalServerError, "PDF faylini yaratib bo'lmadi")
		return
	}

	filename := fmt.Sprintf("komissiya-%d.pdf", c.ID)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	_, _ = w.Write(data)
}

// ---- Dostavka ----

func (h *Handler) DostavkaList(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListByDostavka(r.Context(), claims.SubjectID, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) DostavkaGet(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetByDostavka(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) DostavkaPickup(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.PickupByDostavka(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) DostavkaDeliver(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.DeliverByDostavka(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

// ---- Kurator ----

func (h *Handler) KuratorList(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListForKurator(r.Context(), claims.SubjectID, claims.Role, r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) KuratorGet(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetForKurator(r.Context(), claims.SubjectID, claims.Role, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) KuratorForceMajeure(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.ForceMajeureByKurator(r.Context(), claims.SubjectID, claims.Role, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) KuratorContractPDF(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetForKurator(r.Context(), claims.SubjectID, claims.Role, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "contract")
}

func (h *Handler) KuratorInvoicePDF(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetForKurator(r.Context(), claims.SubjectID, claims.Role, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "invoice")
}

func (h *Handler) KuratorListDocuments(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListDocumentsForKurator(r.Context(), claims.SubjectID, claims.Role, limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

// ---- Bosh admin ----

func (h *Handler) AdminList(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListForAdmin(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminGet(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetForAdmin(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) AdminGuarantee(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GuaranteeByAdmin(r.Context(), claims.SubjectID, id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, o)
}

func (h *Handler) AdminContractPDF(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetForAdmin(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "contract")
}

func (h *Handler) AdminInvoicePDF(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	o, err := h.service.GetForAdmin(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	h.writeOrderPDF(w, o, "invoice")
}

func (h *Handler) AdminForsMajorAlerts(w http.ResponseWriter, r *http.Request) {
	alerts, err := h.service.ForsMajorAlertsForAdmin(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, alerts)
}

// ---- Admin: platforma qarzlari ----

func (h *Handler) AdminListDebts(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListDebtsForAdmin(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminCollectDebt(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	var input CollectDebtInput
	if r.ContentLength > 0 {
		if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
			httputil.FieldError(w, http.StatusBadRequest, field, message)
			return
		}
	}

	d, err := h.service.CollectDebtByAdmin(r.Context(), id, input.Note)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, d)
}

func (h *Handler) AdminWriteOffDebt(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	d, err := h.service.WriteOffDebtByAdmin(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, d)
}

func (h *Handler) AdminListCommissions(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := parsePagination(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListCommissionsForAdmin(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, items)
}

func (h *Handler) AdminConfirmCommissionPaid(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	c, err := h.service.ConfirmCommissionPaidByAdmin(r.Context(), id)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, c)
}

func (h *Handler) AdminRejectCommission(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePathID(w, r)
	if !ok {
		return
	}

	var input RejectCommissionInput
	if r.ContentLength > 0 {
		if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
			httputil.FieldError(w, http.StatusBadRequest, field, message)
			return
		}
	}

	c, err := h.service.RejectCommissionByAdmin(r.Context(), id, input.Note)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, c)
}

func (h *Handler) AdminGetSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.service.GetSettings(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, s)
}

func (h *Handler) PublicSupport(w http.ResponseWriter, r *http.Request) {
	s, err := h.service.GetSettings(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}
	telegram := s.SupportTelegram
	httputil.JSON(w, http.StatusOK, map[string]string{
		"telegram": telegram,
		"url":      "https://t.me/" + telegram,
		"label":    "Texnik yordam",
	})
}

func (h *Handler) AdminUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var input UpdatePlatformSettingsInput
	if field, message, err := httputil.DecodeJSON(r, &input); err != nil {
		httputil.FieldError(w, http.StatusBadRequest, field, message)
		return
	}

	s, err := h.service.UpdateSettings(r.Context(), input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	httputil.JSON(w, http.StatusOK, s)
}

// ---- Yordamchi funksiyalar ----

// writeOrderPDF buyurtma bo'yicha shartnoma yoki hisob-faktura PDF faylini
// generatsiya qilib, yuklab olish uchun javob sifatida yozadi.
func (h *Handler) writeOrderPDF(w http.ResponseWriter, o *Order, kind string) {
	var (
		data     []byte
		err      error
		fileStem string
	)
	switch kind {
	case "contract":
		data, err = BuildContractPDF(o)
		fileStem = "shartnoma"
	case "invoice":
		data, err = BuildInvoicePDF(o)
		fileStem = "hisob-faktura"
	}
	if err != nil {
		slog.Error("PDF faylini yaratib bo'lmadi", "xatolik", err)
		httputil.Error(w, http.StatusInternalServerError, "PDF faylini yaratib bo'lmadi")
		return
	}

	filename := fmt.Sprintf("%s-%s.pdf", fileStem, o.Number)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	_, _ = w.Write(data)
}

func parseReceiptFile(r *http.Request) (*multipart.FileHeader, error) {
	if err := r.ParseMultipartForm(maxReceiptMemory); err != nil {
		return nil, validationError("receipt", "Forma ma'lumotlarini o'qib bo'lmadi")
	}
	files := r.MultipartForm.File["receipt"]
	if len(files) == 0 {
		return nil, validationError("receipt", "receipt fayli yuklanishi shart")
	}
	return files[0], nil
}

func parsePathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	return parseURLParamID(w, r, "id")
}

func parseURLParamID(w http.ResponseWriter, r *http.Request, param string) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, param), 10, 64)
	if err != nil || id <= 0 {
		httputil.FieldError(w, http.StatusBadRequest, param, param+" musbat butun son bo'lishi kerak")
		return 0, false
	}
	return id, true
}

func parsePagination(w http.ResponseWriter, r *http.Request) (limit, offset int, ok bool) {
	limit, ok = parseQueryInt(w, r, "limit")
	if !ok {
		return 0, 0, false
	}
	if limit > 100 {
		httputil.FieldError(w, http.StatusBadRequest, "limit", "limit 100 dan katta bo'lishi mumkin emas")
		return 0, 0, false
	}
	offset, ok = parseQueryInt(w, r, "offset")
	if !ok {
		return 0, 0, false
	}
	return limit, offset, true
}

func parseQueryInt(w http.ResponseWriter, r *http.Request, field string) (int, bool) {
	value := r.URL.Query().Get(field)
	if value == "" {
		return 0, true
	}
	number, err := strconv.Atoi(value)
	if err != nil || number < 0 {
		httputil.FieldError(w, http.StatusBadRequest, field, field+" manfiy bo'lmagan butun son bo'lishi kerak")
		return 0, false
	}
	return number, true
}

func (h *Handler) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrValidation):
		var validationErr *ValidationError
		if errors.As(err, &validationErr) {
			httputil.FieldError(w, http.StatusBadRequest, validationErr.Field, validationErr.Message)
			return
		}
		httputil.Error(w, http.StatusBadRequest, "Kiritilgan ma'lumotlar noto'g'ri")
	case errors.Is(err, ErrNotFound), errors.Is(err, ErrCommissionNotFound), errors.Is(err, ErrDebtNotFound), errors.Is(err, ErrShartnomaNotFound):
		httputil.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrForbidden), errors.Is(err, ErrManufacturerCannotMarkPaid):
		httputil.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, ErrProductNotFound):
		httputil.Error(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrBadStatus),
		errors.Is(err, ErrProductNotApproved),
		errors.Is(err, ErrMixedManufacturers),
		errors.Is(err, ErrMixedPaymentTerms),
		errors.Is(err, ErrQuantityBelowMOQ),
		errors.Is(err, ErrInsufficientStock),
		errors.Is(err, ErrXaridorBlocked),
		errors.Is(err, ErrDeadlineNotPassed),
		errors.Is(err, ErrAlreadyPaid),
		errors.Is(err, ErrReceiptRequired),
		errors.Is(err, ErrInsufficientReserve),
		errors.Is(err, ErrDebtBadStatus),
		errors.Is(err, ErrNoDostavka):
		httputil.Error(w, http.StatusConflict, err.Error())
	default:
		slog.Error("Ichki xatolik yuz berdi", "xatolik", err)
		httputil.Error(w, http.StatusInternalServerError, "Ichki server xatoligi yuz berdi")
	}
}
