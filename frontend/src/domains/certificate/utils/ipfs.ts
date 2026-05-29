type PinataResponse = {
  IpfsHash: string;
};

type UploadResult = {
  ipfsHash: string;
  uri: string;
  gatewayUrl: string;
};

export const uploadJsonToPinata = async (payload: object): Promise<UploadResult> => {
  const pinataJwt = import.meta.env.VITE_PINATA_JWT as string | undefined;
  const gatewayBase =
    (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ||
    'https://gateway.pinata.cloud/ipfs';

  if (!pinataJwt) {
    throw new Error('Missing Pinata JWT. Set VITE_PINATA_JWT in frontend env.');
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as PinataResponse;
  const ipfsHash = data.IpfsHash;

  return {
    ipfsHash,
    uri: `ipfs://${ipfsHash}`,
    gatewayUrl: `${gatewayBase}/${ipfsHash}`
  };
};
