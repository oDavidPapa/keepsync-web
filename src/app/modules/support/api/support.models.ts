export interface SupportContactInfoResponse {
  contactEmail: string;
}

export interface SupportContactRequest {
  subject: string;
  message: string;
}

export interface SupportAccountDeletionRequest {
  reason: string;
  confirmed: boolean;
  typedConfirmation: string;
}

export interface SupportRequestResponse {
  message: string;
}
