import * as React from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useConfig, useWriteContract } from 'wagmi';
import { readContract, waitForTransactionReceipt } from '@wagmi/core';

import { PageContentHeader } from '@/components/page-content-header';
import { certificateRegistryAbi } from '../abi/certificate-registry';
import { uploadJsonToPinata } from '../utils/ipfs';

const DEFAULT_CHAIN_ID = 80002; // Polygon Amoy

type IssueFormState = {
  studentId: string;
  studentName: string;
  className: string;
  course: string;
  grade: string;
  issuedDate: string;
  notes: string;
  extraMetadataJson: string;
};

type VerifyResult = {
  isValid: boolean;
  studentId: string;
  metadataUri: string;
  issuer: string;
  issuedAt: string;
  revoked: boolean;
  metadataUrl?: string;
};

const initialIssueForm: IssueFormState = {
  studentId: '',
  studentName: '',
  className: '',
  course: '',
  grade: '',
  issuedDate: '',
  notes: '',
  extraMetadataJson: ''
};

export const CertificatesPage = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const [issueForm, setIssueForm] = React.useState<IssueFormState>(initialIssueForm);
  const [isIssuing, setIsIssuing] = React.useState(false);
  const [lastCertificateId, setLastCertificateId] = React.useState<string>('');
  const [lastTxHash, setLastTxHash] = React.useState<string>('');
  const [lastMetadataUri, setLastMetadataUri] = React.useState<string>('');
  const [verifyId, setVerifyId] = React.useState<string>('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verifyResult, setVerifyResult] = React.useState<VerifyResult | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);

  const contractAddress = import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS as string | undefined;
  const expectedChainId = Number(import.meta.env.VITE_POLYGON_CHAIN_ID || DEFAULT_CHAIN_ID);

  const handleIssueChange = (field: keyof IssueFormState) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setIssueForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  };

  const handleIssueCertificate = async () => {
    if (!isConnected || !address) {
      toast.error('Connect a wallet first.');
      return;
    }

    const {
      studentId,
      studentName,
      className,
      course,
      grade,
      issuedDate,
      notes,
      extraMetadataJson
    } = issueForm;

    if (!studentId || !studentName) {
      toast.error('Student ID and name are required.');
      return;
    }

    let extraMetadata: Record<string, unknown> = {};
    if (extraMetadataJson.trim().length > 0) {
      try {
        extraMetadata = JSON.parse(extraMetadataJson) as Record<string, unknown>;
      } catch (error) {
        toast.error('Extra metadata must be valid JSON.');
        return;
      }
    }

    const metadataPayload = {
      studentId,
      studentName,
      className,
      course,
      grade,
      issuedDate,
      notes,
      ...extraMetadata
    };

    setIsIssuing(true);
    try {
      if (!contractAddress) {
        throw new Error('Missing contract address. Set VITE_CERTIFICATE_CONTRACT_ADDRESS.');
      }
      const { uri } = await uploadJsonToPinata(metadataPayload);
      const certificateId = ethers.id(`${studentId}:${Date.now()}:${uri}`);

      const hash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: certificateRegistryAbi,
        functionName: 'issueCertificate',
        args: [certificateId as `0x${string}`, studentId, uri],
        maxPriorityFeePerGas: 25000000000n, // 25 Gwei (required minimum on Polygon Amoy)
        maxFeePerGas: 30000000000n, // 30 Gwei
      });
      const receipt = await waitForTransactionReceipt(config, { hash });

      setLastCertificateId(certificateId);
      setLastMetadataUri(uri);
      setLastTxHash(receipt.transactionHash || hash);
      toast.success('Certificate issued successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to issue certificate');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleVerifyCertificate = async () => {
    if (!verifyId) {
      toast.error('Enter a certificate id to verify.');
      return;
    }

    setIsVerifying(true);
    try {
      if (!contractAddress) {
        throw new Error('Missing contract address. Set VITE_CERTIFICATE_CONTRACT_ADDRESS.');
      }
      const result = await readContract(config, {
        address: contractAddress as `0x${string}`,
        abi: certificateRegistryAbi,
        functionName: 'verifyCertificate',
        args: [verifyId as `0x${string}`],
      });
      console.log(result);
      const issuedAt = result[4] ? new Date(Number(result[4]) * 1000).toISOString() : '';

      setVerifyResult({
        isValid: result[0],
        studentId: result[1],
        metadataUri: result[2],
        issuer: result[3],
        issuedAt,
        revoked: result[5],
        metadataUrl: result[2]?.startsWith('ipfs://')
          ? result[2].replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
          : result[2]
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed');
      setVerifyResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRevokeCertificate = async () => {
    if (!verifyId) {
      toast.error('Enter a certificate id to revoke.');
      return;
    }
    setIsRevoking(true);
    try {
      if (!contractAddress) {
        throw new Error('Missing contract address. Set VITE_CERTIFICATE_CONTRACT_ADDRESS.');
      }
      const hash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: certificateRegistryAbi,
        functionName: 'revokeCertificate',
        args: [verifyId as `0x${string}`],
        maxPriorityFeePerGas: 25000000000n, // 25 Gwei (required minimum on Polygon Amoy)
        maxFeePerGas: 30000000000n, // 30 Gwei
      });
      await waitForTransactionReceipt(config, { hash });
      toast.success('Certificate revoked');
      
      // Update verifyResult state locally so UI updates immediately
      if (verifyResult) {
        setVerifyResult({
          ...verifyResult,
          isValid: false,
          revoked: true,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Revoke failed');
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <Box>
      <PageContentHeader heading='Certificates' />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems='center'>
          <Box flex={1}>
            <Typography variant='subtitle1'>Wallet</Typography>
            <Typography variant='body2' color='text.secondary'>
              {address ? `Connected: ${address}` : 'Not connected'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {chainId ? `Chain ID: ${chainId}` : 'Chain not detected'}
            </Typography>
          </Box>
          <Stack direction='row' spacing={2} alignItems='center'>
            <ConnectButton />
            {isConnected && chainId && chainId !== expectedChainId && (
              <Typography color='warning.main'>
                Switch to Polygon Amoy ({expectedChainId}).
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant='h6'>Issue Certificate</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Metadata is uploaded to IPFS via Pinata and stored on-chain as a URI.
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label='Student ID' value={issueForm.studentId} onChange={handleIssueChange('studentId')} fullWidth />
            <TextField label='Student Name' value={issueForm.studentName} onChange={handleIssueChange('studentName')} fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label='Class' value={issueForm.className} onChange={handleIssueChange('className')} fullWidth />
            <TextField label='Course' value={issueForm.course} onChange={handleIssueChange('course')} fullWidth />
            <TextField label='Grade' value={issueForm.grade} onChange={handleIssueChange('grade')} fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label='Issued Date'
              type='date'
              InputLabelProps={{ shrink: true }}
              value={issueForm.issuedDate}
              onChange={handleIssueChange('issuedDate')}
              fullWidth
            />
            <TextField label='Notes' value={issueForm.notes} onChange={handleIssueChange('notes')} fullWidth />
          </Stack>
          <TextField
            label='Extra Metadata (JSON)'
            placeholder='{ "issuerDepartment": "Science", "gpa": "3.9" }'
            value={issueForm.extraMetadataJson}
            onChange={handleIssueChange('extraMetadataJson')}
            multiline
            minRows={4}
            fullWidth
          />
          <LoadingButton loading={isIssuing} variant='contained' onClick={handleIssueCertificate}>
            Issue Certificate
          </LoadingButton>
          {(lastCertificateId || lastTxHash) && (
            <Box>
              <Typography variant='subtitle2'>Last Issued</Typography>
              {lastCertificateId && (
                <Typography variant='body2'>Certificate ID: {lastCertificateId}</Typography>
              )}
              {lastMetadataUri && (
                <Typography variant='body2'>Metadata URI: {lastMetadataUri}</Typography>
              )}
              {lastTxHash && (
                <Typography variant='body2'>Tx Hash: {lastTxHash}</Typography>
              )}
            </Box>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant='h6'>Verify or Revoke Certificate</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label='Certificate ID'
            value={verifyId}
            onChange={(event) => setVerifyId(event.target.value)}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <LoadingButton loading={isVerifying} variant='outlined' onClick={handleVerifyCertificate}>
              Verify Certificate
            </LoadingButton>
            <LoadingButton
              loading={isRevoking}
              variant='contained'
              color='error'
              onClick={handleRevokeCertificate}
              disabled={!!verifyResult?.revoked}
            >
              Revoke Certificate
            </LoadingButton>
          </Stack>
          {verifyResult && (
            <Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant='subtitle2'>Verification Result</Typography>
              <Typography variant='body2'>Valid: {verifyResult.isValid ? 'Yes' : 'No'}</Typography>
              <Typography variant='body2'>Student ID: {verifyResult.studentId}</Typography>
              <Typography variant='body2'>Issuer: {verifyResult.issuer}</Typography>
              <Typography variant='body2'>Issued At: {verifyResult.issuedAt}</Typography>
              <Typography variant='body2'>Revoked: {verifyResult.revoked ? 'Yes' : 'No'}</Typography>
              <Typography variant='body2'>Metadata URI: {verifyResult.metadataUri}</Typography>
              {verifyResult.metadataUrl && (
                <Button
                  component='a'
                  href={verifyResult.metadataUrl}
                  target='_blank'
                  rel='noreferrer'
                >
                  View Metadata
                </Button>
              )}
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};
