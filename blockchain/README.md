# Certificate Registry (Hardhat)

## Setup
```bash
cd blockchain
npm install
cp .env.example .env
```

## Compile
```bash
npm run compile
```

## Deploy (Polygon Amoy)
```bash
npm run deploy:amoy
```

Record the deployed address and update the frontend env:
- VITE_CERTIFICATE_CONTRACT_ADDRESS
- VITE_POLYGON_RPC_URL
