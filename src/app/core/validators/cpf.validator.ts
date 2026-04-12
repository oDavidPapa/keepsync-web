import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const rawValue = String(control.value ?? '');
    const digits = rawValue.replace(/\D/g, '');

    if (!digits) {
      return null;
    }

    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
      return { cpfInvalid: true };
    }

    const firstDigit = calculateCpfDigit(digits.slice(0, 9), 10);
    const secondDigit = calculateCpfDigit(digits.slice(0, 10), 11);

    return digits[9] === String(firstDigit) && digits[10] === String(secondDigit)
      ? null
      : { cpfInvalid: true };
  };
}

function calculateCpfDigit(baseDigits: string, factor: number): number {
  const total = baseDigits
    .split('')
    .reduce((sum, digit) => sum + Number(digit) * factor--, 0);

  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
