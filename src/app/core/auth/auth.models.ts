export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface EmailVerificationConfirmRequest {
  token: string;
}

export interface EmailVerificationResendRequest {
  email: string;
}

export interface EmailVerificationResponse {
  message: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  publicId: string;
}
