// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateRegistry is Ownable {
    struct Certificate {
        string studentId;
        string metadataUri;
        address issuer;
        uint256 issuedAt;
        bool revoked;
    }

    mapping(bytes32 => Certificate) private certificates;

    event CertificateIssued(bytes32 indexed certificateId, string studentId, string metadataUri, address indexed issuer);
    event CertificateRevoked(bytes32 indexed certificateId, address indexed revoker);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function issueCertificate(
        bytes32 certificateId,
        string calldata studentId,
        string calldata metadataUri
    ) external onlyOwner {
        require(certificates[certificateId].issuedAt == 0, "Certificate already exists");
        require(bytes(metadataUri).length > 0, "Metadata URI required");
        certificates[certificateId] = Certificate({
            studentId: studentId,
            metadataUri: metadataUri,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false
        });
        emit CertificateIssued(certificateId, studentId, metadataUri, msg.sender);
    }

    function revokeCertificate(bytes32 certificateId) external onlyOwner {
        Certificate storage cert = certificates[certificateId];
        require(cert.issuedAt != 0, "Certificate not found");
        require(!cert.revoked, "Certificate already revoked");
        cert.revoked = true;
        emit CertificateRevoked(certificateId, msg.sender);
    }

    function getCertificate(bytes32 certificateId)
        external
        view
        returns (
            string memory studentId,
            string memory metadataUri,
            address issuer,
            uint256 issuedAt,
            bool revoked
        )
    {
        Certificate memory cert = certificates[certificateId];
        return (cert.studentId, cert.metadataUri, cert.issuer, cert.issuedAt, cert.revoked);
    }

    function verifyCertificate(bytes32 certificateId)
        external
        view
        returns (
            bool isValid,
            string memory studentId,
            string memory metadataUri,
            address issuer,
            uint256 issuedAt,
            bool revoked
        )
    {
        Certificate memory cert = certificates[certificateId];
        bool exists = cert.issuedAt != 0;
        bool valid = exists && !cert.revoked;
        return (valid, cert.studentId, cert.metadataUri, cert.issuer, cert.issuedAt, cert.revoked);
    }
}
