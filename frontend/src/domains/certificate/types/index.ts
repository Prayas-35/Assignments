export type CertificateIssuePayload = {
  studentId: string;
  studentName: string;
  className: string;
  course: string;
  grade: string;
  issuedDate: string;
  notes?: string;
};
