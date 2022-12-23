/*--------------------------------
*  Name: Akshay Sharma
*  Student Number: 7859678
*  Course: COMP 4060
*  Assignment: Term Project
*  File Description: Example code from outdated implemention of BCFL smart contract using golang.
*---------------------------------
*/

package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

// Asset describes basic details of what makes up a simple asset
// Insert struct field in alphabetic order => to achieve determinism across languages
// golang keeps the order when marshal to json but doesn't order automatically
type Asset struct {
	DocType        string `json:"DocType"`
	ID             string `json:"ID"`
	M			   float64 `json:"M"`
	C			   float64 `json:"C"`
	N              int     `json:"N"`
}

// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{ID: "asset0", DocType: "Model", M: 0, C: 0, N: 0 },
		{ID: "asset1", DocType: "Update", M: 28.35, C: 6.87, N: 4 },
		{ID: "asset2", DocType: "Update", M: 23.33, C: 9, N: 2},
		{ID: "asset3", DocType: "Update", M: 15, C: 15, N: 3},
	}

	for _, asset := range assets {
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutState(asset.ID, assetJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state. %v", err)
		}
	}

	return nil
}

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, m float64, c float64, n int) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", id)
	}

	asset := Asset{
		ID:             id,
		DocType:		"Update",
		M:				m,
		C:				c,
		N:				n,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

// ReadAsset returns the asset stored in the world state with given id.
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, id string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", id)
	}

	var asset Asset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

// UpdateAsset updates an existing asset in the world state with provided parameters.
func (s *SmartContract) UpdateAsset(ctx contractapi.TransactionContextInterface, id string, m float64, c float64, n int) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	// overwriting original asset with new asset
	asset := Asset{
		ID:             id,
		DocType:		"Update",
		M:				m,
		C:				c,
		N:				n,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

func (s *SmartContract) CreateNewAsset(ctx contractapi.TransactionContextInterface, m float64, c float64, n int) ([]*Asset, error) {

	//get existing assets
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}

		assets = append(assets, &asset)
	}

	
	// create new asset as update block
	id := fmt.Sprintf("asset%d", len(assets))

	
	asset := Asset{
		ID:             id,
		DocType:		"Update",
		M:				m,
		C:				c,
		N:				n,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return nil, err
	}

	// add new update to the chain
	err = ctx.GetStub().PutState(id, assetJSON)
	assets = append(assets, &asset)

	var update_assets []*Asset

	// if this was asset was the fourth update block 
	if len(assets) % 5 == 0 {

		id := fmt.Sprintf("asset%d", len(assets))
		
		//compute update block
		// get list starting at the most recent model block
		for _, asset := range assets {
			if asset.DocType != "Update" {
				update_assets = nil
			}
			update_assets = append(update_assets, asset)
		}

		var newC float64
		var newM float64

		var total_samples_in_update int

		for i, asset := range update_assets {
			if i == 0 {
				continue
			}

			total_samples_in_update += asset.N
		}

		for i, asset := range update_assets {
			if i == 0 {
				continue
			}

			// perform weighted aggregation
			newC += (asset.C - update_assets[0].C) * (float64(asset.N)/float64(total_samples_in_update))
			newM += (asset.M - update_assets[0].M) * (float64(asset.N)/float64(total_samples_in_update))
		}

		asset := Asset{
			ID:             id,
			DocType:		"Model",
			M:				newM + update_assets[0].M,
			C:				newC + update_assets[0].C,
			N:				update_assets[0].N + total_samples_in_update
		}

		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return nil, err
		}
		err = ctx.GetStub().PutState(id, assetJSON)
	}

	

	return update_assets, err
}

// DeleteAsset deletes an given asset from the world state.
func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	return ctx.GetStub().DelState(id)
}

// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}

// TransferAsset updates the owner field of asset with given id in world state, and returns the old owner.
// func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) (string, error) {
// 	asset, err := s.ReadAsset(ctx, id)
// 	if err != nil {
// 		return "", err
// 	}

// 	oldOwner := asset.Owner
// 	asset.Owner = newOwner

// 	assetJSON, err := json.Marshal(asset)
// 	if err != nil {
// 		return "", err
// 	}

// 	err = ctx.GetStub().PutState(id, assetJSON)
// 	if err != nil {
// 		return "", err
// 	}

// 	return oldOwner, nil
// }

// GetAllAssets returns all assets found in world state
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]*Asset, error) {
	// range query with empty string for startKey and endKey does an
	// open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}
		assets = append(assets, &asset)
	}

	return assets, nil
}