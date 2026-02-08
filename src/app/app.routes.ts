import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { CalendarMonthComponent } from './pages/calendars/calendar-month.component';
import { PropertiesComponent } from './pages/properties/properties.component';
import { PropertiesListComponent } from './pages/properties/properties-list/properties-list.component';

export const routes: Routes = [
  // redireciona raiz para dashboard
  { path: '', redirectTo: 'app/dashboard', pathMatch: 'full' },

  {
    path: 'app',
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'calendars', component: CalendarMonthComponent },

      { path: 'properties', component: PropertiesListComponent },
      { path: 'properties/new', component: PropertiesComponent },
      { path: 'properties/:publicId/edit', component: PropertiesComponent },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'app/dashboard' },
];