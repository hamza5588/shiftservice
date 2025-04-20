import { format, isWeekend, isHoliday, isNewYearsEve } from 'date-fns';

export interface TimeSegment {
  start: string;
  end: string;
  hours: number;
  rate: number;
  total: number;
}

export interface RateBreakdown {
  day: TimeSegment;
  evening: TimeSegment;
  night: TimeSegment;
  weekend: TimeSegment;
  holiday: TimeSegment;
  new_year: TimeSegment;
  subtotal: number;
  vat: number;
  total: number;
}

export class RateCalculator {
  private baseRate: number;
  private vatRate: number;

  constructor(baseRate: number, vatRate: number = 0.21) {
    this.baseRate = baseRate;
    this.vatRate = vatRate;
  }

  private isEveningTime(date: Date): boolean {
    const hour = date.getHours();
    return hour >= 22 || hour < 0;
  }

  private isNightTime(date: Date): boolean {
    const hour = date.getHours();
    return hour >= 0 && hour < 6;
  }

  private isNewYearsEveTime(date: Date): boolean {
    return isNewYearsEve(date) && date.getHours() >= 16;
  }

  calculateRates(startTime: Date, endTime: Date): RateBreakdown {
    const breakdown: RateBreakdown = {
      day: { start: '', end: '', hours: 0, rate: this.baseRate, total: 0 },
      evening: { start: '', end: '', hours: 0, rate: this.baseRate * 1.1, total: 0 },
      night: { start: '', end: '', hours: 0, rate: this.baseRate * 1.2, total: 0 },
      weekend: { start: '', end: '', hours: 0, rate: this.baseRate * 1.35, total: 0 },
      holiday: { start: '', end: '', hours: 0, rate: this.baseRate * 1.5, total: 0 },
      new_year: { start: '', end: '', hours: 0, rate: this.baseRate * 2, total: 0 },
      subtotal: 0,
      vat: 0,
      total: 0
    };

    let currentTime = new Date(startTime);
    const end = new Date(endTime);

    while (currentTime < end) {
      const segmentDuration = 1; // 1 hour segments
      const segmentEnd = new Date(currentTime);
      segmentEnd.setHours(currentTime.getHours() + segmentDuration);

      if (segmentEnd > end) {
        segmentEnd.setTime(end.getTime());
      }

      const hours = (segmentEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      let rate = this.baseRate;

      if (this.isNewYearsEveTime(currentTime)) {
        breakdown.new_year.hours += hours;
        rate = this.baseRate * 2;
      } else if (isHoliday(currentTime)) {
        breakdown.holiday.hours += hours;
        rate = this.baseRate * 1.5;
      } else if (isWeekend(currentTime)) {
        breakdown.weekend.hours += hours;
        rate = this.baseRate * 1.35;
      } else if (this.isNightTime(currentTime)) {
        breakdown.night.hours += hours;
        rate = this.baseRate * 1.2;
      } else if (this.isEveningTime(currentTime)) {
        breakdown.evening.hours += hours;
        rate = this.baseRate * 1.1;
      } else {
        breakdown.day.hours += hours;
      }

      const total = hours * rate;
      breakdown.subtotal += total;

      currentTime = segmentEnd;
    }

    breakdown.vat = breakdown.subtotal * this.vatRate;
    breakdown.total = breakdown.subtotal + breakdown.vat;

    // Format time segments
    breakdown.day.start = format(startTime, 'HH:mm');
    breakdown.day.end = format(endTime, 'HH:mm');
    breakdown.evening.start = format(startTime, 'HH:mm');
    breakdown.evening.end = format(endTime, 'HH:mm');
    breakdown.night.start = format(startTime, 'HH:mm');
    breakdown.night.end = format(endTime, 'HH:mm');
    breakdown.weekend.start = format(startTime, 'HH:mm');
    breakdown.weekend.end = format(endTime, 'HH:mm');
    breakdown.holiday.start = format(startTime, 'HH:mm');
    breakdown.holiday.end = format(endTime, 'HH:mm');
    breakdown.new_year.start = format(startTime, 'HH:mm');
    breakdown.new_year.end = format(endTime, 'HH:mm');

    return breakdown;
  }
} 