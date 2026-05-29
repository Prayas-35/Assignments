package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
)

type config struct {
  port            string
  backendBaseURL  string
  backendUsername string
  backendPassword string
}

type studentDetail struct {
  ID               int     `json:"id"`
  Name             string  `json:"name"`
  Email            string  `json:"email"`
  SystemAccess     bool    `json:"systemAccess"`
  Phone            string  `json:"phone"`
  Gender           string  `json:"gender"`
  Dob              string  `json:"dob"`
  Class            string  `json:"class"`
  Section          string  `json:"section"`
  Roll             json.Number `json:"roll"`
  FatherName       string  `json:"fatherName"`
  FatherPhone      string  `json:"fatherPhone"`
  MotherName       string  `json:"motherName"`
  MotherPhone      string  `json:"motherPhone"`
  GuardianName     string  `json:"guardianName"`
  GuardianPhone    string  `json:"guardianPhone"`
  RelationGuardian string  `json:"relationOfGuardian"`
  CurrentAddress   string  `json:"currentAddress"`
  PermanentAddress string  `json:"permanentAddress"`
  AdmissionDate    string  `json:"admissionDate"`
  ReporterName     *string `json:"reporterName"`
}

type loginResponse struct {
  AccessToken string
  RefreshToken string
  CsrfToken string
}

type loginPayload struct {
  Username string `json:"username"`
  Password string `json:"password"`
}

type authCookies struct {
  accessToken  string
  refreshToken string
  csrfToken    string
}

func main() {
  cfg := config{
    port:            envOrDefault("PORT", "8090"),
    backendBaseURL:  envOrDefault("BACKEND_BASE_URL", "http://localhost:5007"),
    backendUsername: envOrDefault("BACKEND_USERNAME", "admin@school-admin.com"),
    backendPassword: envOrDefault("BACKEND_PASSWORD", "3OU4zn3q6Zh9"),
  }

  mux := http.NewServeMux()
  mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write([]byte("ok"))
  })
  mux.HandleFunc("/api/v1/students/", func(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
      http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
      return
    }

    id, ok := extractStudentID(r.URL.Path)
    if !ok {
      http.NotFound(w, r)
      return
    }

    student, err := fetchStudentDetail(cfg, id)
    if err != nil {
      http.Error(w, err.Error(), http.StatusBadGateway)
      return
    }

    pdfBytes, err := buildStudentPDF(student)
    if err != nil {
      http.Error(w, "Failed to build PDF", http.StatusInternalServerError)
      return
    }

    fileName := fmt.Sprintf("student-report-%s.pdf", id)
    w.Header().Set("Content-Type", "application/pdf")
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write(pdfBytes)
  })

  server := &http.Server{
    Addr:              ":" + cfg.port,
    Handler:           mux,
    ReadHeaderTimeout: 5 * time.Second,
  }

  log.Printf("Go service listening on :%s", cfg.port)
  if err := server.ListenAndServe(); err != nil {
    log.Fatal(err)
  }
}

func envOrDefault(key, fallback string) string {
  value := os.Getenv(key)
  if value == "" {
    return fallback
  }
  return value
}

func extractStudentID(path string) (string, bool) {
  trimmed := strings.Trim(path, "/")
  parts := strings.Split(trimmed, "/")
  if len(parts) != 5 {
    return "", false
  }
  if parts[0] != "api" || parts[1] != "v1" || parts[2] != "students" || parts[4] != "report" {
    return "", false
  }
  return parts[3], true
}

func fetchStudentDetail(cfg config, studentID string) (studentDetail, error) {
  cookies, err := loginToBackend(cfg)
  if err != nil {
    return studentDetail{}, err
  }

  url := fmt.Sprintf("%s/api/v1/students/%s", cfg.backendBaseURL, studentID)
  req, err := http.NewRequest(http.MethodGet, url, nil)
  if err != nil {
    return studentDetail{}, err
  }
  req.Header.Set("Cookie", formatCookieHeader(cookies))
  req.Header.Set("X-CSRF-Token", cookies.csrfToken)

  client := &http.Client{Timeout: 15 * time.Second}
  resp, err := client.Do(req)
  if err != nil {
    return studentDetail{}, err
  }
  defer resp.Body.Close()

  if resp.StatusCode >= 300 {
    body, _ := io.ReadAll(resp.Body)
    return studentDetail{}, fmt.Errorf("backend error: %s", string(body))
  }

  var detail studentDetail
  decoder := json.NewDecoder(resp.Body)
  decoder.UseNumber()
  if err := decoder.Decode(&detail); err != nil {
    return studentDetail{}, err
  }
  return detail, nil
}

func loginToBackend(cfg config) (authCookies, error) {
  payloadBytes, err := json.Marshal(loginPayload{Username: cfg.backendUsername, Password: cfg.backendPassword})
  if err != nil {
    return authCookies{}, err
  }

  url := fmt.Sprintf("%s/api/v1/auth/login", cfg.backendBaseURL)
  req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(payloadBytes))
  if err != nil {
    return authCookies{}, err
  }
  req.Header.Set("Content-Type", "application/json")

  client := &http.Client{Timeout: 15 * time.Second}
  resp, err := client.Do(req)
  if err != nil {
    return authCookies{}, err
  }
  defer resp.Body.Close()

  if resp.StatusCode >= 300 {
    body, _ := io.ReadAll(resp.Body)
    return authCookies{}, fmt.Errorf("login failed: %s", string(body))
  }

  cookies := authCookies{}
  for _, cookie := range resp.Cookies() {
    switch cookie.Name {
    case "accessToken":
      cookies.accessToken = cookie.Value
    case "refreshToken":
      cookies.refreshToken = cookie.Value
    case "csrfToken":
      cookies.csrfToken = cookie.Value
    }
  }

  if cookies.accessToken == "" || cookies.refreshToken == "" || cookies.csrfToken == "" {
    return authCookies{}, fmt.Errorf("missing auth cookies from backend")
  }

  return cookies, nil
}

func formatCookieHeader(cookies authCookies) string {
  return fmt.Sprintf("accessToken=%s; refreshToken=%s; csrfToken=%s", cookies.accessToken, cookies.refreshToken, cookies.csrfToken)
}

func buildStudentPDF(student studentDetail) ([]byte, error) {
  pdf := gofpdf.New("P", "mm", "A4", "")
  pdf.SetTitle("Student Report", false)
  pdf.AddPage()

  pdf.SetFont("Arial", "B", 16)
  pdf.Cell(0, 10, "Student Report")
  pdf.Ln(12)

  pdf.SetFont("Arial", "", 12)
  addSection(pdf, "Basic Information", map[string]string{
    "Student ID":    fmt.Sprintf("%d", student.ID),
    "Name":          student.Name,
    "Email":         student.Email,
    "Phone":         student.Phone,
    "Gender":        student.Gender,
    "Date of Birth": student.Dob,
  })

  addSection(pdf, "Academic Information", map[string]string{
    "Class":         student.Class,
    "Section":       student.Section,
    "Roll":          student.Roll.String(),
    "Admission Date": student.AdmissionDate,
  })

  addSection(pdf, "Parents and Guardian", map[string]string{
    "Father Name":        student.FatherName,
    "Father Phone":       student.FatherPhone,
    "Mother Name":        student.MotherName,
    "Mother Phone":       student.MotherPhone,
    "Guardian Name":      student.GuardianName,
    "Guardian Phone":     student.GuardianPhone,
    "Relation of Guardian": student.RelationGuardian,
  })

  addSection(pdf, "Addresses", map[string]string{
    "Current Address":   student.CurrentAddress,
    "Permanent Address": student.PermanentAddress,
  })

  status := "Disabled"
  if student.SystemAccess {
    status = "Enabled"
  }
  extra := map[string]string{
    "System Access": status,
  }
  if student.ReporterName != nil {
    extra["Reporter"] = *student.ReporterName
  }
  addSection(pdf, "Additional Information", extra)

  var buf bytes.Buffer
  err := pdf.Output(&buf)
  if err != nil {
    return nil, err
  }
  return buf.Bytes(), nil
}

func addSection(pdf *gofpdf.Fpdf, title string, fields map[string]string) {
  pdf.SetFont("Arial", "B", 13)
  pdf.Cell(0, 8, title)
  pdf.Ln(9)

  pdf.SetFont("Arial", "", 11)
  for label, value := range fields {
    if strings.TrimSpace(value) == "" {
      continue
    }
    pdf.CellFormat(45, 7, label+":", "", 0, "", false, 0, "")
    pdf.MultiCell(0, 7, value, "", "", false)
  }

  pdf.Ln(4)
}
