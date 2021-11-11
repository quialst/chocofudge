require("dotenv").config()
const axios = require("axios")
const fs = require('fs')
const FormData = require('form-data')
const API_URL = process.env.API_URL
const PUBLIC_KEY = process.env.PUBLIC_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY
const { createAlchemyWeb3 } = require("@alch/alchemy-web3")
const web3 = createAlchemyWeb3(API_URL)
const contract = require("../artifacts/contracts/MyNFT.sol/MockupNFT.json")
const contractAddress = "0x778603Ca4DE2675dB7aa82f82676a62CC03fe032"
const nftContract = new web3.eth.Contract(contract.abi, contractAddress)
async function mintNFT(tokenURI) {
  const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest') //get latest nonce
   //the transaction
  const tx = {
    'from': PUBLIC_KEY,
    'to': contractAddress,
    'nonce': nonce,
    'gas': 500000,
    'data': nftContract.methods.mintNFT(PUBLIC_KEY, tokenURI).encodeABI()
  }
  const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY)
  signPromise
    .then((signedTx) => {
      web3.eth.sendSignedTransaction(
        signedTx.rawTransaction,
        function (err, hash) {
          if (!err) {
            console.log(
              "The hash of your transaction is: ",
              hash,
              "\nCheck Alchemy's Mempool to view the status of your transaction!"
            )
          } else {
            console.log(
              "Something went wrong when submitting your transaction:",
              err
            )
          }
        }
      )
    })
    .catch((err) => {
      console.log(" Promise failed:", err)
    })
}

async function pinFileToIPFS(pinataApiKey, pinataSecretApiKey, metaName, filePath) {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`
    //we gather a local file for this example, but any valid readStream source will work here.
    let data = new FormData()
    data.append('file', fs.createReadStream(filePath)) // of the form ./foo.png
    //You'll need to make sure that the metadata is in the form of a JSON object that's been convered to a string
    //metadata is optional
    const metadata = JSON.stringify({
        name: metaName
    })
    data.append('pinataMetadata', metadata)
    //pinataOptions are optional
    const pinataOptions = JSON.stringify({
        cidVersion: 0,
    })
    data.append('pinataOptions', pinataOptions)
    return axios
        .post(url, data, {
            maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey
            }
        })
}

async function pinJSONToIPFS(pinataApiKey, pinataSecretApiKey, JSONBody) {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`
    return axios
        .post(url, JSONBody, {
            headers: {
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey
            }
        })
}

async function testAuthentication(pinataApiKey, pinataSecretApiKey) {
    const url = `https://api.pinata.cloud/data/testAuthentication`
    const {data:response} = await axios
        .get(url, {
            headers: {
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey
            }
        })
        .catch(function (error) {
            console.log(error)
        })
    return response
}

function buildJSON(index, ifpsHash) {
  const metadata = {
    "attributes": [
      {
        "trait_type": "Number",
        "value": index
      },
      {
        "trait_type": "Origin",
        "value": "Unknown"
      }
    ],
    "description": "GENERIC",
    "image": 'https://gateway.pinata.cloud/ipfs/' + ifpsHash,
    "name": "nft" + index
  }
  return metadata
}

async function metadataPinHandler (response) {
  const returnData = await response
  metadataHash = returnData.IfpsHash
  console.log(metadataHash)
}

const filePinPromises=[]
const imageHashes=[]
const metadataPinPromises=[]
const metadataHashes=[]

function loopPin (dirSize) {
  testAuthentication(
    'aabafacb7a02fc2fdc8b',
    '485e4dc78f29aae5e306ca1e8bde6e9ae608eda20ed03029bd7605c345f9eb77'
  )
  .then( function (response) {
    console.log(response.message)
  })

  for (let i = 0; i < dirSize; i++) {
    p = pinFileToIPFS(
      'b375e3074401fe9d9148',
      'aec3714cc1e312d03df41f7266489b7b130ea8b2103bef34a4dd3d529bb87910',
      'testimage' + i.toString(),
      './nftimages/nft' + i.toString() + '.png'
    )
    filePinPromises.push(p)
  }

  Promise.all(filePinPromises).then((response) => {
    for (let i = 0; i < response.length; i++) {
      imageHashes.push(response[i].data.IpfsHash)
    }
    console.log('Image Hashes:')
    console.log(imageHashes)

    for (let i = 0; i < dirSize; i++) {
      p = pinJSONToIPFS(
        'b375e3074401fe9d9148',
        'aec3714cc1e312d03df41f7266489b7b130ea8b2103bef34a4dd3d529bb87910',
        buildJSON(
          i.toString(),
          imageHashes[i]
        )
      )
      metadataPinPromises.push(p)
    }

    Promise.all(metadataPinPromises).then((response) => {
      for (let i = 0; i < response.length; i++) {
        metadataHashes.push(response[i].data.IpfsHash)
      }
      console.log('Metadata Hashes:')
      console.log(metadataHashes)
    }
    )
    .catch(function (error) {
      console.log(error)
    }
    )
  }
  )
  .catch( function (error) {
    console.log(error)
  }
  )
}
loopPin(5)
/*
mintNFT(
  'https://gateway.pinata.cloud/ipfs/' + metadataHash
)
*/
