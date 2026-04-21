import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../../../core/api/api.models';
import {
  SupportAccountDeletionRequest,
  SupportContactInfoResponse,
  SupportContactRequest,
  SupportRequestResponse,
} from './support.models';

@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/support`;

  constructor(private readonly http: HttpClient) {}

  getContactInfo(): Observable<SupportContactInfoResponse> {
    return this.http
      .get<ApiEnvelope<SupportContactInfoResponse>>(`${this.baseUrl}/contact-info`)
      .pipe(map((response) => response.data));
  }

  sendContactRequest(payload: SupportContactRequest): Observable<SupportRequestResponse> {
    return this.http
      .post<ApiEnvelope<SupportRequestResponse>>(`${this.baseUrl}/contact-requests`, payload)
      .pipe(map((response) => response.data));
  }

  sendAccountDeletionRequest(payload: SupportAccountDeletionRequest): Observable<SupportRequestResponse> {
    return this.http
      .post<ApiEnvelope<SupportRequestResponse>>(`${this.baseUrl}/account-deletion-requests`, payload)
      .pipe(map((response) => response.data));
  }
}
