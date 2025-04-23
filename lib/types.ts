// Tipovi za korisnike
export interface User {
  firstName: string
  lastName: string
  email: string
}

// Tipovi za verifikaciju
export interface VerificationData {
  code: string
}

// Tipovi za upload
export interface UploadData {
  message?: string
  images?: File[]
}

// Tipovi za odgovore sa servera
export interface ApiResponse {
  success: boolean
  error?: string
}
