import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type Source = 'airbnb' | 'booking' | 'manual' | 'site';

interface Reservation {
  id: string;
  title: string;
  source: Source;
  start: string; // yyyy-mm-dd (check-in)
  end: string;   // yyyy-mm-dd (check-out) [start, end)
}

interface DayCell {
  date: Date;
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;

  bookings: Reservation[];
  top: Reservation[];
  extraCount: number;
}

@Component({
  selector: 'app-calendar-month',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-month.component.html',
  styleUrl: './calendar-month.component.scss',
})
export class CalendarMonthComponent {
  // mock fixo para você validar o layout
  private readonly _month = signal(this.startOfMonth(new Date(2026, 1, 1))); // Fev/2026
  month = computed(() => this._month());

  filters = signal<Record<Source, boolean>>({
    airbnb: true,
    booking: true,
    manual: true,
    site: true,
  });

  reservations = signal<Reservation[]>([
    { id: 'r1', title: 'Apto Centro (101) • Marina', source: 'airbnb', start: '2026-02-03', end: '2026-02-07' },
    { id: 'r2', title: 'Casa Praia (B) • Pedro', source: 'booking', start: '2026-02-06', end: '2026-02-09' },
    { id: 'r3', title: 'Studio Vila (3A) • Ana', source: 'manual', start: '2026-02-09', end: '2026-02-10' },
    { id: 'r4', title: 'Apto Centro (101) • Bruna', source: 'airbnb', start: '2026-02-12', end: '2026-02-15' },
    { id: 'r5', title: 'Casa Praia (B) • Diego', source: 'booking', start: '2026-02-18', end: '2026-02-22' },
    { id: 'r6', title: 'Loft Garden (7) • Carlos', source: 'site', start: '2026-02-25', end: '2026-02-28' },
    { id: 'r7', title: 'Casa Praia (B) • Long Stay', source: 'booking', start: '2026-02-20', end: '2026-03-05' },
  ]);

  monthLabel = computed(() => {
    const d = this.month();
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  // 42 dias (6 semanas)
  days = computed<DayCell[]>(() => {
    const monthStart = this.month();
    const gridStart = this.startOfWeek(this.startOfMonth(monthStart));

    const todayIso = this.toISO(new Date());
    const filtered = this.reservations().filter(r => this.filters()[r.source]);

    const out: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);

      const iso = this.toISO(d);

      const bookings = filtered.filter(ev => this.intersectsDay(ev, iso));
      const top = bookings.slice(0, 2);

      out.push({
        date: d,
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === monthStart.getMonth(),
        isToday: iso === todayIso,
        bookings,
        top,
        extraCount: Math.max(0, bookings.length - top.length),
      });
    }

    return out;
  });

  prevMonth() {
    const d = new Date(this.month());
    d.setMonth(d.getMonth() - 1);
    this._month.set(this.startOfMonth(d));
  }

  nextMonth() {
    const d = new Date(this.month());
    d.setMonth(d.getMonth() + 1);
    this._month.set(this.startOfMonth(d));
  }

  goToday() {
    this._month.set(this.startOfMonth(new Date()));
  }

  toggle(source: Source) {
    this.filters.update(f => ({ ...f, [source]: !f[source] }));
  }

  private intersectsDay(ev: Reservation, isoDay: string): boolean {
    return ev.start <= isoDay && isoDay < ev.end;
  }

  private toISO(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private startOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // 0=seg
    date.setDate(date.getDate() - day);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
