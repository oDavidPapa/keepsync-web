import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type Channel = 'Airbnb' | 'Booking' | 'Manual' | 'Site';

interface ReservationRow {
  property: string;
  guest: string;
  checkin: string;
  checkout: string;
  channel: Channel;
  status: 'Confirmada' | 'Pendente' | 'Cancelada';
  amount: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  // KPIs fake
  kpis = [
    { label: 'Reservas (30d)', value: '128', delta: '+12%', tone: 'success' as const },
    { label: 'Ocupação média', value: '74%', delta: '+4%', tone: 'primary' as const },
    { label: 'Conflitos', value: '3', delta: '-2', tone: 'warning' as const },
    { label: 'Receita (30d)', value: 'R$ 38.420', delta: '+8%', tone: 'success' as const },
  ];

  // Bar chart fake
  channelBars: { channel: Channel; value: number }[] = [
    { channel: 'Airbnb', value: 72 },
    { channel: 'Booking', value: 58 },
    { channel: 'Manual', value: 22 },
    { channel: 'Site', value: 34 },
  ];

  recent: ReservationRow[] = [
    { property: 'Apto Centro (101)', guest: 'Marina S.', checkin: '12/02', checkout: '15/02', channel: 'Airbnb', status: 'Confirmada', amount: 'R$ 1.280' },
    { property: 'Casa Praia (B)', guest: 'Diego M.', checkin: '18/02', checkout: '22/02', channel: 'Booking', status: 'Pendente', amount: 'R$ 2.940' },
    { property: 'Studio Vila (3A)', guest: 'Ana P.', checkin: '09/02', checkout: '10/02', channel: 'Manual', status: 'Confirmada', amount: 'R$ 420' },
    { property: 'Loft Garden (7)', guest: 'Carlos V.', checkin: '25/02', checkout: '28/02', channel: 'Site', status: 'Cancelada', amount: 'R$ 0' },
  ];

  badgeClass(status: ReservationRow['status']) {
    switch (status) {
      case 'Confirmada': return 'badge success';
      case 'Pendente': return 'badge warning';
      case 'Cancelada': return 'badge danger';
    }
  }
}
