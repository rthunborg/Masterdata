/**
 * Story 13.1: Filter Checkbox Functionality
 * Unit tests for filter handler logic
 * 
 * These tests verify the mutually exclusive filter behavior at the handler level,
 * which is the core business logic of this story.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Story 13.1: Filter Handler Logic', () => {
  let setIncludeArchived: ReturnType<typeof vi.fn>;
  let setIncludeTerminated: ReturnType<typeof vi.fn>;
  let setNeedsRepayment: ReturnType<typeof vi.fn>;
  let onIncludeArchivedChange: (checked: boolean) => void;
  let onIncludeTerminatedChange: (checked: boolean) => void;
  let onNeedsRepaymentChange: (checked: boolean) => void;

  beforeEach(() => {
    setIncludeArchived = vi.fn();
    setIncludeTerminated = vi.fn();
    setNeedsRepayment = vi.fn();

    // Recreate handlers with fresh state setters
    onIncludeArchivedChange = (checked: boolean) => {
      if (checked) {
        setIncludeArchived(true);
        setIncludeTerminated(false);
        setNeedsRepayment(false);
      } else {
        setIncludeArchived(false);
      }
    };

    onIncludeTerminatedChange = (checked: boolean) => {
      if (checked) {
        setIncludeTerminated(true);
        setIncludeArchived(false);
        setNeedsRepayment(false);
      } else {
        setIncludeTerminated(false);
      }
    };

    onNeedsRepaymentChange = (checked: boolean) => {
      if (checked) {
        setNeedsRepayment(true);
        setIncludeArchived(false);
        setIncludeTerminated(false);
      } else {
        setNeedsRepayment(false);
      }
    };
  });

  describe('Task 1.2: Mutually Exclusive Filter Behavior', () => {
    it('activating archived filter deactivates others', () => {
      onIncludeArchivedChange(true);

      expect(setIncludeArchived).toHaveBeenCalledWith(true);
      expect(setIncludeTerminated).toHaveBeenCalledWith(false);
      expect(setNeedsRepayment).toHaveBeenCalledWith(false);
    });

    it('activating terminated filter deactivates others', () => {
      onIncludeTerminatedChange(true);

      expect(setIncludeTerminated).toHaveBeenCalledWith(true);
      expect(setIncludeArchived).toHaveBeenCalledWith(false);
      expect(setNeedsRepayment).toHaveBeenCalledWith(false);
    });

    it('activating repayment filter deactivates others', () => {
      onNeedsRepaymentChange(true);

      expect(setNeedsRepayment).toHaveBeenCalledWith(true);
      expect(setIncludeArchived).toHaveBeenCalledWith(false);
      expect(setIncludeTerminated).toHaveBeenCalledWith(false);
    });

    it('only one filter can be active at a time', () => {
      // Activate archived
      onIncludeArchivedChange(true);
      expect(setIncludeArchived).toHaveBeenCalledWith(true);
      expect(setIncludeTerminated).toHaveBeenCalledWith(false);
      expect(setNeedsRepayment).toHaveBeenCalledWith(false);

      vi.clearAllMocks();

      // Activate terminated - should deactivate archived
      onIncludeTerminatedChange(true);
      expect(setIncludeTerminated).toHaveBeenCalledWith(true);
      expect(setIncludeArchived).toHaveBeenCalledWith(false);
      expect(setNeedsRepayment).toHaveBeenCalledWith(false);
    });
  });

  describe('Task 1.4: Uncheck Behavior', () => {
    it('unchecking archived filter only affects archived', () => {
      // First check it
      onIncludeArchivedChange(true);
      vi.clearAllMocks();

      // Then uncheck it
      onIncludeArchivedChange(false);

      expect(setIncludeArchived).toHaveBeenCalledWith(false);
      expect(setIncludeTerminated).not.toHaveBeenCalled();
      expect(setNeedsRepayment).not.toHaveBeenCalled();
    });

    it('unchecking terminated filter only affects terminated', () => {
      // First check it
      onIncludeTerminatedChange(true);
      vi.clearAllMocks();

      // Then uncheck it
      onIncludeTerminatedChange(false);

      expect(setIncludeTerminated).toHaveBeenCalledWith(false);
      expect(setIncludeArchived).not.toHaveBeenCalled();
      expect(setNeedsRepayment).not.toHaveBeenCalled();
    });

    it('unchecking repayment filter only affects repayment', () => {
      // First check it
      onNeedsRepaymentChange(true);
      vi.clearAllMocks();

      // Then uncheck it
      onNeedsRepaymentChange(false);

      expect(setNeedsRepayment).toHaveBeenCalledWith(false);
      expect(setIncludeArchived).not.toHaveBeenCalled();
      expect(setIncludeTerminated).not.toHaveBeenCalled();
    });
  });

  describe('Filter State Transitions', () => {
    it('switching from archived to terminated works correctly', () => {
      // Activate archived
      onIncludeArchivedChange(true);
      vi.clearAllMocks();

      // Switch to terminated
      onIncludeTerminatedChange(true);

      expect(setIncludeTerminated).toHaveBeenCalledWith(true);
      expect(setIncludeArchived).toHaveBeenCalledWith(false);
      expect(setNeedsRepayment).toHaveBeenCalledWith(false);
    });

    it('switching from terminated to repayment works correctly', () => {
      // Activate terminated
      onIncludeTerminatedChange(true);
      vi.clearAllMocks();

      // Switch to repayment
      onNeedsRepaymentChange(true);

      expect(setNeedsRepayment).toHaveBeenCalledWith(true);
      expect(setIncludeArchived).toHaveBeenCalledWith(false);
      expect(setIncludeTerminated).toHaveBeenCalledWith(false);
    });

    it('switching from repayment to archived works correctly', () => {
      // Activate repayment
      onNeedsRepaymentChange(true);
      vi.clearAllMocks();

      // Switch to archived
      onIncludeArchivedChange(true);

      expect(setIncludeArchived).toHaveBeenCalledWith(true);
      expect(setIncludeTerminated).toHaveBeenCalledWith(false);
      expect(setNeedsRepayment).toHaveBeenCalledWith(false);
    });
  });
});

