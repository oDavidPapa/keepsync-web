import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { CalendarMonthComponent } from './pages/calendars/calendar-month.component';
import { PropertiesComponent } from './pages/properties/properties.component';
import { PropertiesListComponent } from './pages/properties/properties-list/properties-list.component';
import { ReservationsListComponent } from './pages/reservations/reservation-list/reservations-list.component';
import { ReservationEditComponent } from './pages/reservations/reservation-edit/reservation-edit.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { UsersListComponent } from './pages/users/users-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'app/dashboard', pathMatch: 'full' },
  {
    path: 'app',
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'calendars', component: CalendarMonthComponent },
      { path: 'reservations', component: ReservationsListComponent },
      { path: 'reservations/:publicId/edit', component: ReservationEditComponent },
      { path: 'properties', component: PropertiesListComponent },
      { path: 'properties/new', component: PropertiesComponent },
      { path: 'properties/:publicId/edit', component: PropertiesComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'users', component: UsersListComponent, canActivate: [adminGuard] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'app/dashboard' },
];
