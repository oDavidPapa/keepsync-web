import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Source = 'airbnb' | 'booking' | 'manual' | 'site';
type Housekeeping = 'dirty' | 'cleaned';
type Checkin = 'pending' | 'checkedin';

interface Reservation {
  id: string;
  propertyId: string;
  propertyName: string;
  guest: string;
  source: Source;
  start: string; // yyyy-mm-dd (check-in)
  end: string;   // yyyy-mm-dd (check-out) [start, end)
  checkin: Checkin;
  housekeeping: Housekeeping;
}

interface DayCell {
  date: Date;
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  bookings: Reservation[]; // reservas que ocupam o dia
}

interface Week {
  weekStart: Date;
  days: DayCell[];
  lanes: SegmentLane[];
}

interface Segment {
  reservation: Reservation;
  startCol: number; // 0..6
  endCol: number;   // 0..6 (inclusive)
  isStart: boolean;
  isEnd: boolean;
}

type SegmentLane = Segment[];

@Component({
  selector: 'app-calendar-month',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-month.component.html',
  styleUrl: './calendar-month.component.scss',
})
export class CalendarMonthComponent {
  // Mock fixo para validar layout (Fev/2026)
  private readonly _month = signal(this.startOfMonth(new Date(2026, 1, 1)));
  month = computed(() => this._month());

  filters = signal<Record<Source, boolean>>({
    airbnb: true,
    booking: true,
    manual: true,
    site: true,
  });

  // filtro por propriedade
  selectedPropertyId = signal<string>('all');

  // Mock propriedades
  properties = signal<{ id: string; name: string }[]>([
    { id: 'p1', name: 'Apto Centro (101)' },
    { id: 'p2', name: 'Casa Praia (B)' },
    { id: 'p3', name: 'Studio Vila (3A)' },
    { id: 'p4', name: 'Loft Garden (7)' },
  ]);

  // ✅ Mock reservas (com status)
  reservations = signal<Reservation[]>([
    {
      id: 'r1',
      propertyId: 'p1',
      propertyName: 'Apto Centro (101)',
      guest: 'Marina',
      source: 'airbnb',
      start: '2026-02-03',
      end: '2026-02-07',
      checkin: 'checkedin',
      housekeeping: 'dirty',
    },
    {
      id: 'r2',
      propertyId: 'p2',
      propertyName: 'Casa Praia (B)',
      guest: 'Pedro',
      source: 'booking',
      start: '2026-02-06',
      end: '2026-02-09',
      checkin: 'pending',
      housekeeping: 'dirty',
    },
    {
      id: 'r3',
      propertyId: 'p3',
      propertyName: 'Studio Vila (3A)',
      guest: 'Ana',
      source: 'manual',
      start: '2026-02-09',
      end: '2026-02-10',
      checkin: 'checkedin',
      housekeeping: 'cleaned',
    },
    {
      id: 'r4',
      propertyId: 'p1',
      propertyName: 'Apto Centro (101)',
      guest: 'Bruna',
      source: 'airbnb',
      start: '2026-02-12',
      end: '2026-02-15',
      checkin: 'pending',
      housekeeping: 'dirty',
    },
    {
      id: 'r5',
      propertyId: 'p2',
      propertyName: 'Casa Praia (B)',
      guest: 'Diego',
      source: 'booking',
      start: '2026-02-18',
      end: '2026-02-22',
      checkin: 'checkedin',
      housekeeping: 'cleaned',
    },
    {
      id: 'r6',
      propertyId: 'p4',
      propertyName: 'Loft Garden (7)',
      guest: 'Carlos',
      source: 'site',
      start: '2026-02-25',
      end: '2026-02-28',
      checkin: 'pending',
      housekeeping: 'dirty',
    },
    // Long stay atravessando mês
    {
      id: 'r7',
      propertyId: 'p2',
      propertyName: 'Casa Praia (B)',
      guest: 'Long Stay',
      source: 'booking',
      start: '2026-02-20',
      end: '2026-03-05',
      checkin: 'checkedin',
      housekeeping: 'dirty',
    },
  ]);

  monthLabel = computed(() => {
    const d = this.month();
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  // ✅ 42 dias (6 semanas)
  days = computed<DayCell[]>(() => {
    const monthStart = this.month();
    const gridStart = this.startOfWeek(this.startOfMonth(monthStart));

    const todayIso = this.toISO(new Date());

    const srcFiltered = this.reservations().filter(r => this.filters()[r.source]);
    const propFiltered =
      this.selectedPropertyId() === 'all'
        ? srcFiltered
        : srcFiltered.filter(r => r.propertyId === this.selectedPropertyId());

    const out: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);

      const iso = this.toISO(d);
      const bookings = propFiltered.filter(ev => this.intersectsDay(ev, iso));

      out.push({
        date: d,
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === monthStart.getMonth(),
        isToday: iso === todayIso,
        bookings,
      });
    }
    return out;
  });

  // ✅ semanas com “lanes” (barras Gantt)
  weeks = computed<Week[]>(() => {
    const allDays = this.days();
    const monthStart = this.month();

    // reservas filtradas (mesma lógica da days)
    const srcFiltered = this.reservations().filter(r => this.filters()[r.source]);
    const propFiltered =
      this.selectedPropertyId() === 'all'
        ? srcFiltered
        : srcFiltered.filter(r => r.propertyId === this.selectedPropertyId());

    const weeks: Week[] = [];
    for (let w = 0; w < 6; w++) {
      const weekDays = allDays.slice(w * 7, w * 7 + 7);
      const weekStart = new Date(weekDays[0].date);
      const weekEnd = new Date(weekDays[6].date);

      // segmentos dessa semana
      const segments: Segment[] = [];
      for (const r of propFiltered) {
        const seg = this.segmentForWeek(r, weekStart, weekEnd);
        if (seg) segments.push(seg);
      }

      // ordena para alocar lanes de forma estável
      segments.sort((a, b) => {
        if (a.startCol !== b.startCol) return a.startCol - b.startCol;
        return (b.endCol - b.startCol) - (a.endCol - a.startCol);
      });

      const lanes = this.packIntoLanes(segments);

      weeks.push({
        weekStart,
        days: weekDays,
        lanes,
      });
    }

    return weeks;
  });

  // UI actions
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

  createManual(day: DayCell) {
    // mock do fluxo: aqui no futuro você abre o drawer
    console.log('Criar reserva manual em:', day.iso);
    alert(`Nova reserva manual em ${day.iso}`);
  }

  // helpers
  sourceLetter(src: Source): string {
    return src === 'airbnb' ? 'A' : src === 'booking' ? 'B' : src === 'manual' ? 'M' : 'S';
  }

  // ---- core helpers ----
  private intersectsDay(ev: Reservation, isoDay: string): boolean {
    // [start, end) => checkout não ocupa o dia
    return ev.start <= isoDay && isoDay < ev.end;
  }

  private segmentForWeek(r: Reservation, weekStart: Date, weekEnd: Date): Segment | null {
    // precisamos calcular a interseção entre [r.start, r.end) e [weekStart, weekEnd+1)
    const wsIso = this.toISO(weekStart);
    const weIso = this.toISO(weekEnd);

    // dia final ocupado é checkout-1
    const rEndOccupied = this.addDaysISO(r.end, -1);

    // se não intersecta, não cria segmento
    if (rEndOccupied < wsIso || r.start > weIso) return null;

    const startIso = r.start < wsIso ? wsIso : r.start;
    const endIso = rEndOccupied > weIso ? weIso : rEndOccupied;

    const startCol = this.diffDays(weekStart, this.fromISO(startIso));
    const endCol = this.diffDays(weekStart, this.fromISO(endIso));

    const isStart = r.start >= wsIso && r.start <= weIso;
    const isEnd = rEndOccupied >= wsIso && rEndOccupied <= weIso;

    return { reservation: r, startCol, endCol, isStart, isEnd };
  }

  private packIntoLanes(segs: Segment[]): SegmentLane[] {
    const lanes: SegmentLane[] = [];

    for (const seg of segs) {
      let placed = false;

      for (const lane of lanes) {
        if (!this.collidesAny(seg, lane)) {
          lane.push(seg);
          placed = true;
          break;
        }
      }

      if (!placed) lanes.push([seg]);
    }

    // ordena por coluna dentro de cada lane (bonitinho)
    for (const lane of lanes) lane.sort((a, b) => a.startCol - b.startCol);

    return lanes;
  }

  private collidesAny(seg: Segment, lane: SegmentLane): boolean {
    return lane.some(s => !(seg.endCol < s.startCol || seg.startCol > s.endCol));
  }

  private toISO(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private fromISO(iso: string): Date {
    const [y, m, d] = iso.split('-').map(n => Number(n));
    return new Date(y, m - 1, d);
  }

  private addDaysISO(iso: string, delta: number): string {
    const d = this.fromISO(iso);
    d.setDate(d.getDate() + delta);
    return this.toISO(d);
  }

  private diffDays(a: Date, b: Date): number {
    const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((bb - aa) / 86400000);
  }

  private startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private startOfWeek(d: Date): Date {
    // semana começa segunda
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // 0=seg
    date.setDate(date.getDate() - day);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  laneRows(count: number): string {
  return `repeat(${Math.max(1, count)}, 22px)`;
}
}
