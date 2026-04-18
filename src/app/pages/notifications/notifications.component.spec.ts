import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NotificationsComponent } from './notifications.component';
import { NotificationService } from '../../modules/notifications/api/notification.service';
import { ToastService } from '../../core/ui/toast/toast.service';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;

  beforeEach(async () => {
    const notificationServiceMock: Pick<NotificationService, 'list'> = {
      list: () => of({
        content: [],
        last: true,
        totalPages: 0,
        totalElements: 0,
        size: 10,
        number: 0,
        first: true,
        numberOfElements: 0,
        empty: true,
      }),
    };

    const toastServiceMock: Pick<ToastService, 'error'> = {
      error: () => undefined,
    };

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
