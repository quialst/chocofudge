async function main() {
  const MockupNFT = await ethers.getContractFactory("MockupNFT")

  // Start deployment, returning a promise that resolves to a contract object
  const mockNFT = await MockupNFT.deploy()
  console.log("Contract deployed to address:", mockNFT.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
