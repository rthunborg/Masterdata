"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { employeeService } from "@/lib/services/employee-service";
import { toast } from "sonner";
import type { Employee } from "@/lib/types/employee";

const terminateSchema = z.object({
  termination_date: z.string().min(1, "Termination date is required"),
  termination_reason: z.string().min(1, "Termination reason is required"),
});

type TerminateFormData = z.infer<typeof terminateSchema>;

interface TerminateEmployeeModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TerminateEmployeeModal({
  employee,
  open,
  onOpenChange,
  onSuccess,
}: TerminateEmployeeModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TerminateFormData>({
    resolver: zodResolver(terminateSchema),
  });

  const onSubmit = async (data: TerminateFormData) => {
    if (!employee) return;

    try {
      await employeeService.terminate(
        employee.id,
        data.termination_date,
        data.termination_reason
      );
      toast.success(
        `${employee.first_name} ${employee.surname} has been marked as terminated.`
      );
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to terminate employee";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Employee as Terminated</DialogTitle>
          <DialogDescription>
            Confirm the termination details for this employee. This action can
            be reversed later if needed.
          </DialogDescription>
        </DialogHeader>

        {employee && (
          <div className="my-4 rounded-lg border p-4">
            <h4 className="font-medium mb-2">Employee Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2">
                  {employee.first_name} {employee.surname}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">SSN:</span>
                <span className="ml-2">{employee.ssn}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rank:</span>
                <span className="ml-2">{employee.rank || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gender:</span>
                <span className="ml-2">{employee.gender || "N/A"}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="termination_date">Termination Date *</Label>
            <Input
              id="termination_date"
              type="date"
              {...register("termination_date")}
            />
            {errors.termination_date && (
              <p className="text-sm text-destructive mt-1">
                {errors.termination_date.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="termination_reason">Termination Reason *</Label>
            <Textarea
              id="termination_reason"
              placeholder="Enter reason for termination..."
              rows={4}
              {...register("termination_reason")}
            />
            {errors.termination_reason && (
              <p className="text-sm text-destructive mt-1">
                {errors.termination_reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              Confirm Termination
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
