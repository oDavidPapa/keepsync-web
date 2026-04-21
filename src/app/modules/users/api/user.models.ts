export type UserRole = 'USER' | 'ADMIN';
export type UserPlanCode = 'FREE' | 'BASIC' | 'PRO';

export interface CurrentUserResponse {
  publicId: string;
  role: UserRole;
  active: boolean;
  fullName?: string | null;
  email: string;
  phoneNumber?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  planCode: UserPlanCode;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  termsAcceptanceRequired?: boolean;
  termsCurrentVersion?: string | null;
  termsVersionAccepted?: string | null;
  termsAcceptedAt?: string | null;
}

export interface UpdateCurrentUserProfileRequest {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
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

export interface AcceptTermsRequest {
  accepted: boolean;
}

export interface UserListItemResponse {
  publicId: string;
  role: UserRole;
  active: boolean;
  fullName?: string | null;
  email: string;
  phoneNumber?: string | null;
  planCode: UserPlanCode;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
}
