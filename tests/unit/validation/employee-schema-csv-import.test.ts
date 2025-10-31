import { describe, it, expect } from 'vitest';
import { csvImportEmployeeSchema } from '@/lib/validation/employee-schema';

describe('csvImportEmployeeSchema - Email Validation', () => {
  const validBaseData = {
    first_name: 'John',
    surname: 'Doe',
    ssn: '19900101-1234',
    rank: 'SEV',
    hire_date: '2025-01-15',
  };

  it('allows empty email', () => {
    const data = {
      ...validBaseData,
      email: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows null email', () => {
    const data = {
      ...validBaseData,
      email: null,
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows undefined email (missing field)', () => {
    const data = {
      ...validBaseData,
      // email field omitted
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates email format when present', () => {
    const data = {
      ...validBaseData,
      email: 'invalid-email',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Invalid email format');
    }
  });

  it('accepts valid email format', () => {
    const data = {
      ...validBaseData,
      email: 'john.doe@stenaline.com',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('csvImportEmployeeSchema - Rank Validation', () => {
  const validBaseData = {
    first_name: 'John',
    surname: 'Doe',
    ssn: '19900101-1234',
    hire_date: '2025-01-15',
  };

  it('requires rank field', () => {
    const data = {
      ...validBaseData,
      // rank missing
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const rankError = result.error.errors.find((e) => e.path.includes('rank'));
      expect(rankError).toBeDefined();
      // When field is missing entirely, Zod returns "Required"
      expect(rankError?.message).toBe('Required');
    }
  });

  it('rejects empty rank', () => {
    const data = {
      ...validBaseData,
      rank: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Rank is required');
    }
  });

  it('accepts valid rank', () => {
    const data = {
      ...validBaseData,
      rank: 'Senior Engineer',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('csvImportEmployeeSchema - Optional Fields', () => {
  const validBaseData = {
    first_name: 'John',
    surname: 'Doe',
    ssn: '19900101-1234',
    rank: 'SEV',
    hire_date: '2025-01-15',
  };

  it('allows empty mobile', () => {
    const data = {
      ...validBaseData,
      mobile: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows empty gender', () => {
    const data = {
      ...validBaseData,
      gender: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows empty town_district', () => {
    const data = {
      ...validBaseData,
      town_district: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows empty comments', () => {
    const data = {
      ...validBaseData,
      comments: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('csvImportEmployeeSchema - Date Fields', () => {
  const validBaseData = {
    first_name: 'John',
    surname: 'Doe',
    ssn: '19900101-1234',
    rank: 'SEV',
    hire_date: '2025-01-15',
  };

  it('allows empty stena_date', () => {
    const data = {
      ...validBaseData,
      stena_date: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows empty omc_date', () => {
    const data = {
      ...validBaseData,
      omc_date: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows empty pe3_date', () => {
    const data = {
      ...validBaseData,
      pe3_date: '',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('csvImportEmployeeSchema - Complete Validation', () => {
  it('accepts employee with only required fields', () => {
    const data = {
      first_name: 'John',
      surname: 'Doe',
      ssn: '19900101-1234',
      rank: 'SEV',
      hire_date: '2025-01-15',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts employee with all fields populated', () => {
    const data = {
      first_name: 'John',
      surname: 'Doe',
      ssn: '19900101-1234',
      email: 'john.doe@stenaline.com',
      mobile: '+46701234567',
      rank: 'Senior Engineer',
      gender: 'Male',
      town_district: 'Gothenburg',
      hire_date: '2025-01-15',
      stena_date: '2025-01-01',
      omc_date: '2025-01-02',
      pe3_date: '2025-01-03',
      comments: 'Test employee',
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts employee with mixed empty and populated optional fields', () => {
    const data = {
      first_name: 'Jane',
      surname: 'Smith',
      ssn: '19850315-5678',
      rank: 'Manager',
      hire_date: '2024-06-01',
      email: '', // Empty
      mobile: '+46709876543', // Populated
      gender: '', // Empty
      town_district: 'Stockholm', // Populated
      comments: '', // Empty
    };

    const result = csvImportEmployeeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
