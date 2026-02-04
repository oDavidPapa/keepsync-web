import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { CalendarMonthComponent } from './pages/calendars/calendar-month.component';

export const routes: Routes = [
  // opcional: redireciona raiz para dashboard
  { path: '', redirectTo: 'app/dashboard', pathMatch: 'full' },

  {
    path: 'app',
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'calendars', component: CalendarMonthComponent },

    ],
  },

  { path: '**', redirectTo: 'app/dashboard' },
];
