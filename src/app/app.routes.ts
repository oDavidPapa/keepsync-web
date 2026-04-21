import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { CalendarMonthComponent } from './pages/calendars/calendar-month.component';
import { PropertiesComponent } from './pages/properties/properties.component';
import { PropertiesListComponent } from './pages/properties/properties-list/properties-list.component';
import { ReservationsListComponent } from './pages/reservations/reservation-list/reservations-list.component';
import { ReservationEditComponent } from './pages/reservations/reservation-edit/reservation-edit.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { UsersListComponent } from './pages/users/users-list.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { RegisterSuccessComponent } from './pages/register-success/register-success.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ContactComponent } from './pages/support/contact/contact.component';
import { AccountDeletionComponent } from './pages/support/account-deletion/account-deletion.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'register/success', component: RegisterSuccessComponent, canActivate: [guestGuard] },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'calendars', component: CalendarMonthComponent },
      { path: 'reservations', component: ReservationsListComponent },
      { path: 'reservations/:publicId/edit', component: ReservationEditComponent },
      { path: 'properties', component: PropertiesListComponent },
      { path: 'properties/new', component: PropertiesComponent },
      { path: 'properties/:publicId/edit', component: PropertiesComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'support/contact', component: ContactComponent },
      { path: 'support/account-deletion', component: AccountDeletionComponent },
      { path: 'admin/users', component: UsersListComponent, canActivate: [adminGuard] },
      { path: 'admin/notifications', component: NotificationsComponent, canActivate: [adminGuard] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
