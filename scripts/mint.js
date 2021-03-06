require("dotenv").config()
const axios = require("axios")
const fs = require('fs')
const FormData = require('form-data')
const API_URL = process.env.API_URL
const PUBLIC_KEY = process.env.PUBLIC_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY
const PINATA_PUBLIC_KEY = process.env.PINATA_PUBLIC_KEY
const PINATA_PRIVATE_KEY = provess.env.PINATA_PRIVATE_KEY
const { createAlchemyWeb3 } = require("@alch/alchemy-web3")
const web3 = createAlchemyWeb3(API_URL)
const contract = require("../artifacts/contracts/MyNFT.sol/MockupNFT.json")
const contractAddress = "0x778603Ca4DE2675dB7aa82f82676a62CC03fe032"
const nftContract = new web3.eth.Contract(contract.abi, contractAddress)
var mintCallNum = 0
var initNonce


async function setInitNonce () {
  initNonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest')
}

setInitNonce()

async function mintNFT(tokenURI) {
  if (initNonce != await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest')) {
    setInitNonce()
    mintCallNum = 0
  }
  const nonce = initNonce + mintCallNum //get latest nonce and add one if mint has already been called
  mintCallNum++
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

async function pinFileToIPFS(metaName, filePath) {
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
                pinata_api_key: PINATA_PUBLIC_KEY,
                pinata_secret_api_key: PINATA_PRIVATE_KEY
            }
        })
}

async function pinJSONToIPFS(JSONBody) {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`
    return axios
        .post(url, JSONBody, {
            headers: {
                pinata_api_key: PINATA_PUBLIC_KEY,
                pinata_secret_api_key: PINATA_PRIVATE_KEY
            }
        })
}

async function testAuthentication() {
    const url = `https://api.pinata.cloud/data/testAuthentication`
    const {data:response} = await axios
        .get(url, {
            headers: {
                pinata_api_key: PINATA_PUBLIC_KEY,
                pinata_secret_api_key: PINATA_PRIVATE_KEY
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

function loopMint(dirSize) {
  testAuthentication()
  .then( function (response) {
    console.log(response.message)
  })

  for (let i = 0; i < dirSize; i++) {
    p = pinFileToIPFS(
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
      for (let i = 0; i < metadataHashes.length; i++) {
        mintNFT(
          'https:gateway.pinata.cloud/ipfs/' + metadataHashes[i]
        )
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

loopMint(5)
