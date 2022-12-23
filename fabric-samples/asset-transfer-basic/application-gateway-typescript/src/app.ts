
/*--------------------------------
*  Name: Akshay Sharma
*  Student Number: 7859678
*  Course: COMP 4060
*  Assignment: Term Project
*  File Description: Application to execute a predetermined routine on a running
*                    test network with chaincode installed. Perfroms the following
*                    routine: 
*                    get latest model -> initialize local model with those weights ->
*                    train using random uniform test data -> create a new model update Asset ->
*                    print out all existing assets 
*---------------------------------
*/


import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';
import * as tf from '@tensorflow/tfjs-node';
import { print, tensor, variable } from '@tensorflow/tfjs-node';

const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');

// Path to crypto materials.
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname,'..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com'));

// Path to user private key directory.
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore'));

// Path to user certificate.
const certPath = envOrDefault('CERT_PATH', '/home/akshay/go/src/github.com/akshaysharma21/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem');

// Path to peer tls certificate.
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt'));

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const utf8Decoder = new TextDecoder();

async function main(): Promise<void> {

    await displayInputParameters();

    // The gRPC client connection should be shared by all Gateway connections to this endpoint.
    const client = await newGrpcConnection();

    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
    model.compile({
    loss: 'meanSquaredError',
    optimizer: 'sgd',
    metrics: ['MAE']
    });


    // model.setWeights();


    // Generate some random fake data for demo purpose.
    const xs = tf.randomUniform([1000, 1]);
    const ys = tf.randomUniform([1000, 1]);
    const valXs = tf.randomUniform([100, 1]);
    const valYs = tf.randomUniform([100, 1]);


    // Start model training process.
    async function train() {
        await model.fit(xs, ys, {
            epochs: 10,
            validationData: [valXs, valYs],
            // Add the tensorBoard callback here.
            callbacks: tf.node.tensorBoard('/tmp/fit_logs_1')
        });
        
        console.log("model Weights: ", model.getWeights().toString(), "\nPrediction: ", model.predict(tf.tensor([0.7])).toString());

        // Commented out CODE FOR SANITY CHECK
        // const model2 = tf.sequential();
        // model2.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        // model2.compile({
        // loss: 'meanSquaredError',
        // optimizer: 'sgd',
        // metrics: ['MAE']
        // });

        // model2.setWeights(model.getWeights());

        // const xs2 = tf.randomUniform([1000, 1]);
        // const ys2 = tf.randomNormal([1000,1], 0.25, 0.05)
        // const valXs2 = tf.randomUniform([10, 1]);
        // const valYs2 = tf.randomNormal([10, 1], 0.25, 0.05);

        // await model2.fit(xs2, ys2, {
        //     epochs: 20,
        //     validationData: [valXs2, valYs2],
        //     // Add the tensorBoard callback here.
        //     callbacks: tf.node.tensorBoard('/tmp/fit_logs_1')
        // });

        // console.log("model 2 Weights: ", model2.getWeights().toString(), "\nPrediction: ", model2.predict(tf.tensor([0.7])).toString());

        // const model3 = tf.sequential();
        // model3.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        // model3.compile({
        // loss: 'meanSquaredError',
        // optimizer: 'sgd',
        // metrics: ['MAE']
        // });

        // model3.setWeights(model.getWeights());

        // const xs3 = tf.randomUniform([1000, 1]);
        // const ys3 = tf.randomNormal([1000,1], 0.75, 0.05)
        // const valXs3 = tf.randomUniform([10, 1]);
        // const valYs3 = tf.randomNormal([10, 1], 0.75, 0.05);

        // await model3.fit(xs3, ys3, {
        //     epochs: 20,
        //     validationData: [valXs3, valYs3],
        //     // Add the tensorBoard callback here.
        //     callbacks: tf.node.tensorBoard('/tmp/fit_logs_1')
        // });

        // console.log("model 3 Weights: ", model3.getWeights().toString(), "\nPrediction: ", model3.predict(tf.tensor([0.7])).toString());

        // const model4 = tf.sequential();
        // model4.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        // model4.compile({
        // loss: 'meanSquaredError',
        // optimizer: 'sgd',
        // metrics: ['MAE']
        // });

        // var w2 = model2.getWeights().values()
        // var W3 = model3.getWeights().values()
        // var wt_avg = ( w2.next().value.dataSync()[0] + W3.next().value.dataSync()[0])/2
        // var bias_avg = (w2.next().value.dataSync()[0] + W3.next().value.dataSync()[0])/2
        // var new_weights = [variable(tensor([wt_avg], [1,1]), true, 'dense_Dense5/kernal'), variable(tensor([bias_avg]), true, 'dense_Dense5/bias')]

        // console.log("New weights: ", new_weights, "w2: ", model2.getWeights())

        // model4.setWeights(new_weights)

        // console.log("model 4 Weights: ", model4.getWeights().toString(), "\nPrediction: ", model4.predict(tf.tensor([0.7])).toString());
    }


    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network.
        const contract = network.getContract(chaincodeName);

        // Initialize a set of asset data on the ledger using the chaincode 'InitLedger' function.
        // await initLedger(contract);

        // get latest base weights and init model
        var curr_base = await getLatestModel(contract, model);

        console.log("\n\nNew weights: ", model.getWeights())

        await train();


        // Return all the current assets on the ledger.
        await getAllAssets(contract);

        let weights_it = model.getWeights().values();
        // Create a new asset on the ledger.
        await createNewAsset(contract, weights_it.next().value.dataSync[0] , weights_it.next().value.dataSync[0], 1000, curr_base);

        await getAllAssets(contract);

        
    } finally {
        gateway.close();
        client.close();
    }
}

main().catch(error => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity(): Promise<Identity> {
    console.log(certPath)
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function newSigner(): Promise<Signer> {
    const files = await fs.readdir(keyDirectoryPath);
    const keyPath = path.resolve(keyDirectoryPath, files[0]);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

/**
 * This type of transaction would typically only be run once by an application the first time it was started after its
 * initial deployment. A new version of the chaincode deployed later would likely not need to run an "init" function.
 */
async function initLedger(contract: Contract): Promise<void> {
    console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');

    await contract.submitTransaction('InitLedger');

    console.log('*** Transaction committed successfully');
}

/**
 * Evaluate a transaction to query ledger state.
 */
async function getAllAssets(contract: Contract): Promise<void> {
    console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');

    const resultBytes = await contract.evaluateTransaction('GetLatestModel');

    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);


    console.log('*** Result:', result);
}

/**
 * Evaluate a transaction to query ledger state.
 */
async function getLatestModel(contract: Contract, model:any): Promise<string> {
    console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');

    const resultBytes = await contract.evaluateTransaction('GetAllAssets');

    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    var new_weights = [variable(tensor([result.M], [1,1]), true, 'dense_Dense5/kernal'), variable(tensor([result.C]), true, 'dense_Dense5/bias')]
    model.setWeights(new_weights);
    
    console.log('*** Result:', result);

    return result.Base
}


/**
 * Submit a transaction synchronously, blocking until it has been committed to the ledger.
 */
async function createNewAsset(contract: Contract, m: number, c: number, n: number, base: string): Promise<void> {
    console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, Color, Size, Owner and AppraisedValue arguments');

    await contract.submitTransaction(
        'CreateNewAsset',
        m.toString(),
        c.toString(),
        n.toString(),
        base,
    );

    console.log('*** Transaction committed successfully');
}

/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}


/**
 * displayInputParameters() will print the global scope parameters used by the main driver routine.
 */
async function displayInputParameters(): Promise<void> {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certPath:          ${certPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}