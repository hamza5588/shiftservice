import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersApi } from "@/lib/users";
import { User } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'employee'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!newUser.username || !newUser.email || !newUser.full_name || !newUser.password || !newUser.role) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Attempting to create user with data:', { ...newUser, password: '[REDACTED]' });
      const response = await usersApi.create(newUser);
      console.log('User creation response:', response);
      setIsCreateDialogOpen(false);
      fetchUsers();
      setNewUser({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'employee'
      });
      
      // Show different success messages based on role
      if (newUser.role === 'employee') {
        toast({
          title: "Success",
          description: "User account and employee profile created successfully. The employee can now log in and access their profile.",
        });
      } else {
        toast({
          title: "Success",
          description: "User created successfully.",
        });
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        data: error.data
      });
      
      let errorMessage = "Failed to create user. Please try again later.";
      
      // Check for specific error messages from the backend
      if (error.data?.detail) {
        errorMessage = error.data.detail;
      } else if (error.message?.includes("Email address already registered") || 
                 error.message?.includes("Email already exists")) {
        errorMessage = "This email address is already registered. Please use a different email.";
      } else if (error.message?.includes("Username already registered")) {
        errorMessage = "This username is already taken. Please choose a different username.";
      } else if (error.message?.includes("Only admin users can create new users")) {
        errorMessage = "You don't have permission to create users. Only administrators can create new users.";
      } else if (error.message?.includes("Role not found")) {
        errorMessage = "The selected role is invalid. Please try again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersApi.delete(userId.toString());
        fetchUsers();
        toast({
          title: "Success",
          description: "User deleted successfully.",
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Error",
          description: "Failed to delete user. Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new user account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="full_name" className="text-right">Full Name</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({...newUser, role: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="planner">Planner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.roles.join(', ')}</TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteUser(user.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 