import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/lib/api';
import { Role } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { RolePermissions } from '@/lib/permissions';
import { Checkbox } from '@/components/ui/checkbox';

export default function RoleManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    permissions: []
  });

  const queryClient = useQueryClient();

  // Query for roles
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.getAll,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateDialogOpen(false);
      setNewRole({ name: '', permissions: [] });
      toast({
        title: 'Success',
        description: 'Role created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create role',
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Role> }) =>
      rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete role',
        variant: 'destructive',
      });
    },
  });

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createRoleMutation.mutate(newRole);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    updateRoleMutation.mutate({
      id: selectedRole.id,
      data: selectedRole,
    });
  };

  const handleDeleteRole = async (roleId: number) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (selectedRole) {
      setSelectedRole({
        ...selectedRole,
        permissions: checked
          ? [...selectedRole.permissions, permission]
          : selectedRole.permissions.filter(p => p !== permission),
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Role Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Permissions</Label>
                <div className="col-span-3 space-y-2">
                  {Object.keys(RolePermissions).map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={newRole.permissions?.includes(permission)}
                        onCheckedChange={(checked) => {
                          setNewRole({
                            ...newRole,
                            permissions: checked
                              ? [...(newRole.permissions || []), permission]
                              : (newRole.permissions || []).filter(p => p !== permission),
                          });
                        }}
                      />
                      <Label htmlFor={permission}>{permission}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Create Role</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : roles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No roles found</TableCell>
              </TableRow>
            ) : (
              roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          {selectedRole && (
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  value={selectedRole.name}
                  onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Permissions</Label>
                <div className="col-span-3 space-y-2">
                  {Object.keys(RolePermissions).map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${permission}`}
                        checked={selectedRole.permissions.includes(permission)}
                        onCheckedChange={(checked) => handlePermissionChange(permission, checked as boolean)}
                      />
                      <Label htmlFor={`edit-${permission}`}>{permission}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Update Role</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 