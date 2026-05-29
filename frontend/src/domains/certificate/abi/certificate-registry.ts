export const certificateRegistryAbi = [
  {
    type: 'function',
    name: 'issueCertificate',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'certificateId', type: 'bytes32' },
      { name: 'studentId', type: 'string' },
      { name: 'metadataUri', type: 'string' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'revokeCertificate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'certificateId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'getCertificate',
    stateMutability: 'view',
    inputs: [{ name: 'certificateId', type: 'bytes32' }],
    outputs: [
      { name: 'studentId', type: 'string' },
      { name: 'metadataUri', type: 'string' },
      { name: 'issuer', type: 'address' },
      { name: 'issuedAt', type: 'uint256' },
      { name: 'revoked', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'verifyCertificate',
    stateMutability: 'view',
    inputs: [{ name: 'certificateId', type: 'bytes32' }],
    outputs: [
      { name: 'isValid', type: 'bool' },
      { name: 'studentId', type: 'string' },
      { name: 'metadataUri', type: 'string' },
      { name: 'issuer', type: 'address' },
      { name: 'issuedAt', type: 'uint256' },
      { name: 'revoked', type: 'bool' }
    ]
  },
  {
    type: 'event',
    name: 'CertificateIssued',
    inputs: [
      { name: 'certificateId', type: 'bytes32', indexed: true },
      { name: 'studentId', type: 'string', indexed: false },
      { name: 'metadataUri', type: 'string', indexed: false },
      { name: 'issuer', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'CertificateRevoked',
    inputs: [
      { name: 'certificateId', type: 'bytes32', indexed: true },
      { name: 'revoker', type: 'address', indexed: true }
    ]
  }
] as const;
