/**
 * Integration Tests: PE3 Deadline Notifications Scheduled Job
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/pe3-deadline-notifications/route';
import { NextRequest } from 'next/server';
import * as pe3Notifications from '@/lib/services/pe3-deadline-notifications';

vi.mock('@/lib/services/pe3-deadline-notifications');

function createMockRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost/api/cron/pe3-deadline-notifications', {
    method: 'GET',
    headers,
  });
}

describe('PE3 Deadline Notifications Scheduled Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  describe('Job Execution', () => {
    it('should query correct PE3 entries', async () => {
      const mockSubmitEntries = [
        {
          id: 'pe3-1',
          date_description: 'Fredag 14/2',
          date_value: '2025-02-14',
          time_value: '14:30',
          deadline_submit: '2025-02-10',
          deadline_cancel: null,
          assigned_employees: [{ id: 'emp-1', name: 'John Doe' }],
        },
      ];
      const mockCancelEntries: any[] = [];

      vi.mocked(pe3Notifications.getTodayStockholm).mockReturnValue('2025-02-10');
      vi.mocked(pe3Notifications.getPe3EntriesForSubmitDeadline).mockResolvedValue(mockSubmitEntries as any);
      vi.mocked(pe3Notifications.getPe3EntriesForCancelDeadline).mockResolvedValue(mockCancelEntries);
      vi.mocked(pe3Notifications.sendPe3SubmitDeadlineNotification).mockResolvedValue(true);

      const request = createMockRequest('Bearer test-secret');
      const response = await GET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(pe3Notifications.getPe3EntriesForSubmitDeadline).toHaveBeenCalledWith('2025-02-10');
      expect(pe3Notifications.getPe3EntriesForCancelDeadline).toHaveBeenCalledWith('2025-02-10');
    });

    it('should send notifications for matching deadlines', async () => {
      const mockSubmitEntries = [
        {
          id: 'pe3-1',
          deadline_submit: '2025-02-10',
          assigned_employees: [],
        },
      ];
      const mockCancelEntries = [
        {
          id: 'pe3-2',
          deadline_cancel: '2025-02-10',
          assigned_employees: [],
        },
      ];

      vi.mocked(pe3Notifications.getTodayStockholm).mockReturnValue('2025-02-10');
      vi.mocked(pe3Notifications.getPe3EntriesForSubmitDeadline).mockResolvedValue(mockSubmitEntries as any);
      vi.mocked(pe3Notifications.getPe3EntriesForCancelDeadline).mockResolvedValue(mockCancelEntries as any);
      vi.mocked(pe3Notifications.sendPe3SubmitDeadlineNotification).mockResolvedValue(true);
      vi.mocked(pe3Notifications.sendPe3CancelDeadlineNotification).mockResolvedValue(true);

      const request = createMockRequest('Bearer test-secret');
      const response = await GET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.stats.submitNotificationSent).toBe(true);
      expect(result.stats.cancelNotificationSent).toBe(true);
      expect(pe3Notifications.sendPe3SubmitDeadlineNotification).toHaveBeenCalledWith(mockSubmitEntries, '2025-02-10');
      expect(pe3Notifications.sendPe3CancelDeadlineNotification).toHaveBeenCalledWith(mockCancelEntries, '2025-02-10');
    });

    it('should not send notifications if no matching deadlines', async () => {
      vi.mocked(pe3Notifications.getTodayStockholm).mockReturnValue('2025-02-10');
      vi.mocked(pe3Notifications.getPe3EntriesForSubmitDeadline).mockResolvedValue([]);
      vi.mocked(pe3Notifications.getPe3EntriesForCancelDeadline).mockResolvedValue([]);

      const request = createMockRequest('Bearer test-secret');
      const response = await GET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.stats.submitNotificationSent).toBe(false);
      expect(result.stats.cancelNotificationSent).toBe(false);
      expect(pe3Notifications.sendPe3SubmitDeadlineNotification).not.toHaveBeenCalled();
      expect(pe3Notifications.sendPe3CancelDeadlineNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(pe3Notifications.getTodayStockholm).mockReturnValue('2025-02-10');
      vi.mocked(pe3Notifications.getPe3EntriesForSubmitDeadline).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('Bearer test-secret');
      const response = await GET(request);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should continue processing remaining notifications if one fails', async () => {
      const mockSubmitEntries = [
        {
          id: 'pe3-1',
          deadline_submit: '2025-02-10',
          assigned_employees: [],
        },
      ];
      const mockCancelEntries = [
        {
          id: 'pe3-2',
          deadline_cancel: '2025-02-10',
          assigned_employees: [],
        },
      ];

      vi.mocked(pe3Notifications.getTodayStockholm).mockReturnValue('2025-02-10');
      vi.mocked(pe3Notifications.getPe3EntriesForSubmitDeadline).mockResolvedValue(mockSubmitEntries as any);
      vi.mocked(pe3Notifications.getPe3EntriesForCancelDeadline).mockResolvedValue(mockCancelEntries as any);
      vi.mocked(pe3Notifications.sendPe3SubmitDeadlineNotification).mockResolvedValue(false);
      vi.mocked(pe3Notifications.sendPe3CancelDeadlineNotification).mockResolvedValue(true);

      const request = createMockRequest('Bearer test-secret');
      const response = await GET(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.stats.submitNotificationSent).toBe(false);
      expect(result.stats.cancelNotificationSent).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Failed to send submit deadline notification');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthorized requests', async () => {
      const request = createMockRequest('Bearer wrong-secret');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });

    it('should reject requests without authorization header', async () => {
      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should accept requests with correct secret', async () => {
      vi.mocked(pe3Notifications.getTodayStockholm).mockReturnValue('2025-02-10');
      vi.mocked(pe3Notifications.getPe3EntriesForSubmitDeadline).mockResolvedValue([]);
      vi.mocked(pe3Notifications.getPe3EntriesForCancelDeadline).mockResolvedValue([]);

      const request = createMockRequest('Bearer test-secret');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Response Format', () => {
    it('should include job statistics in response', async () => {
      vi.mocked(pe3Notifications.getTodayStockholm).mockReturnValue('2025-02-10');
      vi.mocked(pe3Notifications.getPe3EntriesForSubmitDeadline).mockResolvedValue([]);
      vi.mocked(pe3Notifications.getPe3EntriesForCancelDeadline).mockResolvedValue([]);

      const request = createMockRequest('Bearer test-secret');
      const response = await GET(request);
      const result = await response.json();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('submitEntriesFound');
      expect(result.stats).toHaveProperty('cancelEntriesFound');
      expect(result.stats).toHaveProperty('submitNotificationSent');
      expect(result.stats).toHaveProperty('cancelNotificationSent');
    });
  });
});

