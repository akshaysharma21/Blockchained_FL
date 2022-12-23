/*--------------------------------
*  Name: Akshay Sharma
*  Student Number: 7859678
*  Course: COMP 4060
*  Assignment: Term Project
*  File Description: Smart Contract enabling blockchained FL functions on a ledger in javascript.
*---------------------------------
*/

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {

    // initialize the model blockchain
    async InitLedger(ctx) {
        const assets = [
            {ID: "asset0", docType: "Model", M: 0, C: 0, N: 0, Base:"asset0"},
            // sample initializations for debugging and POC
            // {ID: "asset1", docType: "Update", M: 28.35, C: 6.87, N: 4 },
            // {ID: "asset2", docType: "Update", M: 23.33, C: 9, N: 2},
            // {ID: "asset3", docType: "Update", M: 15, C: 15, N: 3},
        ];

        for (const asset of assets) {
            
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }


    // ReadAsset returns the asset stored in the world state with given id. Big debug help.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // Returns latest global model's weights so client can use them as base weights
    async GetLatestModel(ctx) {
        var latest_model;
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            
            if (record.docType == "Model"){
                latest_model = record
            }
            result = await iterator.next();
        }
        
        return JSON.stringify(latest_model)
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    // Create new update block using the provided weights, biases, and number of training samples
    async CreateNewAsset(ctx, m, c, n, base) {
        var latest_model;

        const assets = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            assets.push(record);

            // get latest averaged model block
            if (record.docType == "Model"){
                latest_model = record
            }

            result = await iterator.next();
        }

        // don't let outdated updates in the blockchain
        if(base != latest_model.Base){
            return stringify({"Status": "Error", "Message" : "Your base model seems outdated. Fetch the latest one and try again."})
        }

        var id = `asset${assets.length}`

        const asset = {
            ID: id,
            docType: "Update",
            M: m,
            C: c,
            N: n,
            Base: base
        };
        //we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        assets.push(asset);

        var update_assets = [];

        if ( assets.length % 5 == 0 ) {
            id = `asset${assets.length}`

            for (var a in assets) {
                if (a.docType != "Update") {
                    update_assets = [];
                }
                update_assets.push(a);
            }

            //---------------------
            // TODO: Add tensorflow averaging logic here
            //---------------------
            let avgM = 0, avgC = 0, totalN = 0;

            for (let i = 1; i < update_assets.length; i++) {
                let up = update_assets[i];
                totalN += up.N;
            }            

            for (let i = 1; i < update_assets.length; i++) {
                // skip first element as it is the base model block
                let up = update_assets[i];
                let curr_weight = (up.N / totalN);
                avgM += (up.M * curr_weight);
                avgC += (up.C * curr_weight);
            }


            const model_block = {
                ID: id,
                docType: "Model",
                M: avgM,
                C: avgC,
                N: totalN + update_assets[0].N,
                Base: id
            }

            await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(model_block))));


        }

        return JSON.stringify(update_assets);
    }
}

module.exports = AssetTransfer;
