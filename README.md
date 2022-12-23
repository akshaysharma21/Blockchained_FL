# COMP 4060 project: Blockchain Based Federated Learning

|Final Project||
|---|---|
|Name| Akshay Sharma|
|Student Number| 7859678|
|Course| COMP 4060|
------


## Files of Interest

1) **TypeScript Application Gateway:** `"fabric-samples/asset-transfer-basic/application-gateway-typescript/src/app.ts"`

2) **Chaincode Implementation (Golang):** `"fabric-samples/asset-transfer-basic/chaincode-go/chaincode/smartcontract.go"`

3) **Chaincode Implementation (JavaScript, nodeJs):** `"fabric-samples/asset-transfer-basic/chaincode-javascript/lib/assetTransfer.js"`
 


## Instructions

Instructions to run specific components. Make sure you have all the hyperledger fabric's prerequesits from their installation guide:

1) **Test Network:**\
    a) **Run test network and create a default channel:** From fabric-samples/test-network folder, run `./network.sh up createChannel`\
    b) **install chaincode**: to run a chaincode, follow the given steps:\

        i) run npm install to install all the smart contract dependencies (or go mod vendor for smartcontract in go).

        ii) package the smartcontract as instructed in the hyperledger tutorial: [Tutorial](https://hyperledger-fabric.readthedocs.io/en/latest/deploy_chaincode.html#javascript).

        iii) follow along the tutorial to install and approve chaincode from both organizations.
        
        iv) If everything went right, you should be able to interact with the network through either the peer cli, or the typescript appplication provided.

2) **Application Gateway TypeScript:** from its directory, run:  `npm install -> npm run build -> npm start`. The application does the following things granted the test network is up and has the supplied javascript chaincode installed:\

    a) Initialize the application gateway to interact with chaincode installed on the network.

    b) Initializes a layered sequential linear regressor model to the weights on the latest mined Model block

    c) Prints out all the asssets in the network

    d) Adds a new asset to the network, with chaincode aggregating updates every 5 blocks.

    e) prints out the updated list of assets.

**NOTE:** The application is running and was tested through WSL. Since this might cause a lot of environment problems, the application might not run. I wasn't able to add any output screenshots due to time constraints, but in case the marker wants to see the application running, I can provide demo Screen recording or screen shots appropriately. See the submitted term paper for implementation details.



