"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "@/lib/i18n";
import { adminService } from "@/lib/services/admin-service";
import { User } from "@/lib/types/user";
import { ResponsiveUserView } from "@/components/admin/responsive-user-view";
import { AddUserModal } from "@/components/admin/add-user-modal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UserManagementPage() {
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tErrors('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [tErrors]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUserCreated = () => {
    loadUsers();
    setIsAddModalOpen(false);
  };

  const handleUserStatusChanged = () => {
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('userManagement')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('userManagementDescription')}
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto min-h-11">
          {t('addUser')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <ResponsiveUserView
          users={users}
          onUserStatusChanged={handleUserStatusChanged}
        />
      )}

      <AddUserModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleUserCreated}
      />
    </div>
  );
}
