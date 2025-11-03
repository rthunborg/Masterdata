/**
 * Integration tests for Story 7.4: Column Management UX Enhancements
 * 
 * Tests cover:
 * - Create New Column button and modal
 * - Inline permission editing
 * - Permission validation (Edit requires View, HR Admin View locked)
 * - API validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/columns/route';
import { PATCH } from '@/app/api/admin/columns/[id]/route';
import * as auth from '@/lib/server/auth';
import { columnConfigRepository } from '@/lib/server/repositories/column-config-repository';
import type { ColumnConfig } from '@/lib/types/column-config';
import { UserRole } from '@/lib/types/user';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/auth');
vi.mock('@/lib/server/repositories/column-config-repository');

describe('Story 7.4: Column Management UX Enhancements', () => {
  const mockHRAdmin = {
    id: 'hr-1',
    auth_id: 'auth-hr-1',
    email: 'admin@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC 1-2: Create New Column', () => {
    it('should allow HR Admin to create custom column with default permissions', async () => {
      // Mock authentication
      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdmin);

      const mockCreatedColumn: ColumnConfig = {
        id: 'new-col-1',
        column_name: 'Test Column',
        column_type: 'text',
        is_masterdata: false,
        category: 'Testing',
        display_order: 100,
        is_visible: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: false, edit: false },
          payroll: { view: false, edit: false },
          sodexo: { view: false, edit: false },
          toplux: { view: false, edit: false },
        },
        created_at: '2025-11-03T00:00:00Z',
        updated_at: '2025-11-03T00:00:00Z',
      };

      // Mock repository
      vi.mocked(columnConfigRepository.createCustomColumn).mockResolvedValue(mockCreatedColumn);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/columns', {
        method: 'POST',
        body: JSON.stringify({
          column_name: 'Test Column',
          column_type: 'text',
          category: 'Testing',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.column_name).toBe('Test Column');
      expect(json.data.is_masterdata).toBe(false);
      expect(json.data.role_permissions.hr_admin.view).toBe(true);
    });
  });

  describe('AC 4-6: Inline Permission Editing', () => {
    it('should update role permissions via PATCH /api/admin/columns/[id]', async () => {
      // Mock authentication
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdmin);

      const mockUpdatedColumn: ColumnConfig = {
        id: 'col-1',
        column_name: 'Test Column',
        column_type: 'text',
        is_masterdata: false,
        category: null,
        display_order: 1,
        is_visible: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          omc: { view: true, edit: false },
          payroll: { view: false, edit: false },
          sodexo: { view: false, edit: false },
          toplux: { view: false, edit: false },
        },
        created_at: '2025-11-03T00:00:00Z',
        updated_at: '2025-11-03T00:00:00Z',
      };

      // Create request
      const request = new NextRequest('http://localhost:3000/api/admin/columns/col-1', {
        method: 'PATCH',
        body: JSON.stringify({
          role_permissions: mockUpdatedColumn.role_permissions,
        }),
      });

      // Mock createClient to return a mock Supabase client
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdatedColumn, error: null })),
              })),
            })),
          })),
        })),
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() => Promise.resolve(mockSupabase)),
      }));

      const response = await PATCH(request, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await response.json();

      expect(response.ok).toBe(true);
      expect(json.data.role_permissions.omc.view).toBe(true);
      expect(json.data.role_permissions.omc.edit).toBe(false);
    });
  });

  describe('AC 7: Permission Validation', () => {
    beforeEach(() => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdmin);
    });

    it('should reject Edit without View permission', async () => {
      const invalidPermissions = {
        hr_admin: { view: true, edit: true },
        omc: { view: false, edit: true }, // Invalid: edit without view
        payroll: { view: false, edit: false },
        sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false },
      };

      const request = new NextRequest('http://localhost:3000/api/admin/columns/col-1', {
        method: 'PATCH',
        body: JSON.stringify({
          role_permissions: invalidPermissions,
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('Edit permission requires View permission');
    });

    it('should reject removing HR Admin View permission', async () => {
      const invalidPermissions = {
        hr_admin: { view: false, edit: false }, // Invalid: HR Admin view removed
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false },
      };

      const request = new NextRequest('http://localhost:3000/api/admin/columns/col-1', {
        method: 'PATCH',
        body: JSON.stringify({
          role_permissions: invalidPermissions,
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('HR Admin View permission cannot be removed');
    });

    it('should allow modifying HR Admin Edit permission', async () => {
      const validPermissions = {
        hr_admin: { view: true, edit: false }, // Valid: can modify edit
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        sodexo: { view: false, edit: false },
        toplux: { view: false, edit: false },
      };

      const mockUpdatedColumn: ColumnConfig = {
        id: 'col-1',
        column_name: 'Test Column',
        column_type: 'text',
        is_masterdata: false,
        category: null,
        display_order: 1,
        is_visible: true,
        role_permissions: validPermissions,
        created_at: '2025-11-03T00:00:00Z',
        updated_at: '2025-11-03T00:00:00Z',
      };

      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdatedColumn, error: null })),
              })),
            })),
          })),
        })),
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() => Promise.resolve(mockSupabase)),
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/columns/col-1', {
        method: 'PATCH',
        body: JSON.stringify({
          role_permissions: validPermissions,
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await response.json();

      expect(response.ok).toBe(true);
      expect(json.data.role_permissions.hr_admin.view).toBe(true);
      expect(json.data.role_permissions.hr_admin.edit).toBe(false);
    });
  });

  describe('AC 12: HR Admin can edit all permissions', () => {
    it('should allow HR Admin to edit permissions for all roles', async () => {
      vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdmin);

      const allRolesPermissions = {
        hr_admin: { view: true, edit: true },
        omc: { view: true, edit: true },
        payroll: { view: true, edit: false },
        sodexo: { view: true, edit: true },
        toplux: { view: true, edit: false },
      };

      const mockUpdatedColumn: ColumnConfig = {
        id: 'col-1',
        column_name: 'All Roles Column',
        column_type: 'text',
        is_masterdata: false,
        category: null,
        display_order: 1,
        is_visible: true,
        role_permissions: allRolesPermissions,
        created_at: '2025-11-03T00:00:00Z',
        updated_at: '2025-11-03T00:00:00Z',
      };

      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockUpdatedColumn, error: null })),
              })),
            })),
          })),
        })),
      };

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() => Promise.resolve(mockSupabase)),
      }));

      const request = new NextRequest('http://localhost:3000/api/admin/columns/col-1', {
        method: 'PATCH',
        body: JSON.stringify({
          role_permissions: allRolesPermissions,
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await response.json();

      expect(response.ok).toBe(true);
      expect(json.data.role_permissions).toEqual(allRolesPermissions);
    });
  });
});
