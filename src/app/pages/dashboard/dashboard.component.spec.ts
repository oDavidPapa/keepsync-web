import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../modules/dashboard/api/dashboard.service';
import { ToastService } from '../../core/ui/toast/toast.service';
import { UserService } from '../../modules/users/api/user.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getSummary: () =>
              of({
                period: {
                  monthReference: '2026-01',
                  startAt: '2026-01-01T00:00:00Z',
                  endAt: '2026-01-31T23:59:59Z',
                  periodMonths: 3,
                },
                kpis: {
                  valueToReceiveTotal: 0,
                  guestTotal: 0,
                  confirmedReservations: 0,
                  reservationsInPeriod: 0,
                  openConflicts: 0,
                },
                channels: [],
                propertyValues: [],
                occupancyByProperty: [],
                upcomingCheckIns: [],
                upcomingCheckOuts: [],
              }),
          },
        },
        {
          provide: UserService,
          useValue: {
            getCurrentUser: () =>
              of({
                publicId: 'user-1',
                role: 'USER',
                active: true,
                fullName: 'Usuario Teste',
                email: 'usuario@teste.com',
                emailVerified: true,
                phoneVerified: false,
                planCode: 'FREE',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
              }),
          },
        },
        { provide: ToastService, useValue: { error: () => null } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
