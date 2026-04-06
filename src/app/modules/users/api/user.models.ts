export type UserPlanCode = 'FREE' | 'ESSENCIAL' | 'PRO';

export interface CurrentUserResponse {
  publicId: string;
  role: string;
  fullName?: string | null;
  email: string;
  phoneNumber?: string | null;
  cpf?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  planCode: UserPlanCode;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCurrentUserProfileRequest {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  cpf?: string | null;
}

export interface UpdateCurrentUserProfileResponse {
  user: CurrentUserResponse;
  accessToken?: string | null;
}

export interface ChangeCurrentUserPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetCurrentUserPasswordResponse {
  maskedEmail: string;
}
