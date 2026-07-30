package region

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*Region, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.validateParent(ctx, input.Type, input.ParentID); err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, input)
}

func (s *Service) Update(ctx context.Context, id int64, input UpdateInput) (*Region, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	parentID := input.ParentID
	if existing.Type == TypeRegion {
		parentID = nil
	} else if parentID == nil {
		return nil, validationError("parent_id", "Parent tanlanishi shart")
	}
	if err := s.validateParent(ctx, existing.Type, parentID); err != nil {
		return nil, err
	}
	input.ParentID = parentID
	return s.repo.Update(ctx, id, input)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Region, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, typ string, parentID *int64, status string, limit, offset int) ([]Region, error) {
	if typ != "" && typ != TypeRegion && typ != TypeDistrict && typ != TypeMFY {
		return nil, validationError("type", "type region, district yoki mfy bo'lishi kerak")
	}
	return s.repo.List(ctx, typ, parentID, status, limit, offset)
}

func (s *Service) ResolveLabels(ctx context.Context, mfyID int64) (*Labels, error) {
	if mfyID <= 0 {
		return nil, validationError("mfy_id", "MFY tanlanishi shart")
	}
	return s.repo.ResolveLabels(ctx, mfyID)
}

func (s *Service) ListKuratorMFYs(ctx context.Context, kuratorID int64) ([]Region, error) {
	return s.repo.ListKuratorMFYs(ctx, kuratorID)
}

func (s *Service) SetKuratorMFYs(ctx context.Context, kuratorID int64, mfyIDs []int64) error {
	if err := s.repo.EnsureKurator(ctx, kuratorID); err != nil {
		return err
	}
	seen := map[int64]struct{}{}
	clean := make([]int64, 0, len(mfyIDs))
	for _, id := range mfyIDs {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		clean = append(clean, id)
	}
	return s.repo.SetKuratorMFYs(ctx, kuratorID, clean)
}

func (s *Service) FindKuratorByMFYID(ctx context.Context, mfyID int64) (*int64, error) {
	if mfyID <= 0 {
		return nil, nil
	}
	return s.repo.FindKuratorByMFYID(ctx, mfyID)
}

func (s *Service) GetKuratorSummary(ctx context.Context, kuratorID int64) (*KuratorSummary, error) {
	return s.repo.GetKuratorSummary(ctx, kuratorID)
}

func (s *Service) ImportFromFile(ctx context.Context, path string) (*ImportResult, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("regions.json o'qib bo'lmadi: %w", err)
	}
	return s.ImportJSON(ctx, data)
}

type importItem struct {
	ID struct {
		OID string `json:"$oid"`
	} `json:"_id"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Code   string `json:"code"`
	Status string `json:"status"`
	Parent *struct {
		OID string `json:"$oid"`
	} `json:"parent"`
}

func (s *Service) ImportJSON(ctx context.Context, data []byte) (*ImportResult, error) {
	var items []importItem
	if err := json.Unmarshal(data, &items); err != nil {
		return nil, validationError("body", "JSON format noto'g'ri")
	}

	result := &ImportResult{Total: len(items)}
	type parentLink struct {
		childOID  string
		parentOID string
	}
	links := make([]parentLink, 0)

	for _, item := range items {
		oid := strings.TrimSpace(item.ID.OID)
		if oid == "" || item.Name == "" {
			continue
		}
		typ := strings.TrimSpace(item.Type)
		if typ != TypeRegion && typ != TypeDistrict && typ != TypeMFY {
			continue
		}
		status := strings.TrimSpace(item.Status)
		if status == "" {
			status = "active"
		}
		_, inserted, err := s.repo.UpsertByMongoOID(ctx, oid, strings.TrimSpace(item.Name), strings.TrimSpace(item.Code), typ, status)
		if err != nil {
			return nil, fmt.Errorf("import xato (%s): %w", oid, err)
		}
		if inserted {
			result.Inserted++
		} else {
			result.Updated++
		}
		if item.Parent != nil && strings.TrimSpace(item.Parent.OID) != "" {
			links = append(links, parentLink{childOID: oid, parentOID: strings.TrimSpace(item.Parent.OID)})
		}
	}

	for _, link := range links {
		if err := s.repo.SetParentByMongoOID(ctx, link.childOID, link.parentOID); err != nil {
			return nil, fmt.Errorf("parent bog'lash xato (%s): %w", link.childOID, err)
		}
	}

	return result, nil
}

func (s *Service) validateParent(ctx context.Context, childType string, parentID *int64) error {
	if childType == TypeRegion {
		return nil
	}
	if parentID == nil {
		return validationError("parent_id", "Parent tanlanishi shart")
	}
	parent, err := s.repo.GetByID(ctx, *parentID)
	if err != nil {
		return err
	}
	switch childType {
	case TypeDistrict:
		if parent.Type != TypeRegion {
			return validationError("parent_id", "Tuman faqat viloyat ostida bo'lishi kerak")
		}
	case TypeMFY:
		if parent.Type != TypeDistrict {
			return validationError("parent_id", "MFY faqat tuman ostida bo'lishi kerak")
		}
	}
	return nil
}
