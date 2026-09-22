package birgaxarid

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
)

func generatePickupCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return fmt.Sprintf("%06d", time.Now().UnixNano()%1_000_000)
	}
	return fmt.Sprintf("%06d", n.Int64())
}
