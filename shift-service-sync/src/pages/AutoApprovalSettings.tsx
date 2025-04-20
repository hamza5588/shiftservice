import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { autoApprovalService } from '../services/autoApprovalService';
import { AutoApprovalSetting } from '../types/autoApproval';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { useToast } from '../hooks/useToast';
import { hasRole } from '../lib/permissions';

const AutoApprovalSettings: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const toastRef = useRef(toast);
    const [settings, setSettings] = useState<AutoApprovalSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newSetting, setNewSetting] = useState<Partial<AutoApprovalSetting>>({
        auto_approve: true,
        priority_hours: 3
    });
    const [locations, setLocations] = useState<string[]>([]);
    const [employees, setEmployees] = useState<{ id: string; name: string; username: string }[]>([]);

    useEffect(() => {
        if (!user || !hasRole(user.roles, ['admin', 'planner'])) {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            try {
                setError(null);
                const [settingsData, locationsData, employeesData] = await Promise.all([
                    autoApprovalService.getAllSettings(),
                    autoApprovalService.getLocations(),
                    autoApprovalService.getEmployees()
                ]);

                console.log('Fetched data:', { settingsData, locationsData, employeesData });

                setSettings(settingsData);
                setLocations(locationsData);
                setEmployees(employeesData);
            } catch (error: any) {
                console.error('Error in fetchData:', error);
                if (error.response) {
                    setError(`Server error: ${error.response.status} - ${error.response.data?.detail || 'Unknown error'}`);
                } else if (error.request) {
                    setError('Could not connect to the server. Please make sure the backend server is running.');
                } else {
                    setError(error.message || 'Failed to load data');
                }
                toastRef.current({
                    title: 'Error',
                    description: error.message || 'Failed to load data',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, navigate]);

    const handleCreateSetting = async () => {
        if (!newSetting.employee_id || !newSetting.location) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        try {
            const createdSetting = await autoApprovalService.createSetting(newSetting as AutoApprovalSetting);
            setSettings(prev => [...prev, createdSetting]);
            setNewSetting({
                auto_approve: true,
                priority_hours: 3
            });
            toast({
                title: 'Success',
                description: 'Auto-approval setting created successfully',
            });
        } catch (error: any) {
            console.error('Error in handleCreateSetting:', error);
            let errorMessage = 'Failed to create auto-approval setting';
            
            if (error.response) {
                errorMessage = error.response.data?.detail || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        }
    };

    const handleUpdateSetting = async (id: number, setting: AutoApprovalSetting) => {
        try {
            const updatedSetting = await autoApprovalService.updateSetting(id, setting);
            setSettings(prev => prev.map(s => s.id === id ? updatedSetting : s));
            toast({
                title: 'Success',
                description: 'Auto-approval setting updated successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update auto-approval setting',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteSetting = async (id: number) => {
        try {
            await autoApprovalService.deleteSetting(id);
            setSettings(prev => prev.filter(s => s.id !== id));
            toast({
                title: 'Success',
                description: 'Auto-approval setting deleted successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete auto-approval setting',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p>{error}</p>
                    <p className="mt-2 text-sm">
                        Please make sure the backend server is running at {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Auto-Approval Settings</h1>

            {/* Create new setting form */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h2 className="text-xl font-semibold mb-4">Create New Setting</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                        <Select
                            value={newSetting.employee_id}
                            onValueChange={(value) => setNewSetting({ ...newSetting, employee_id: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((employee) => (
                                    <SelectItem key={employee.username} value={employee.username}>
                                        {employee.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <Select
                            value={newSetting.location}
                            onValueChange={(value) => setNewSetting({ ...newSetting, location: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Location" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map((location) => (
                                    <SelectItem key={location} value={location}>
                                        {location}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={newSetting.auto_approve}
                            onCheckedChange={(checked) => setNewSetting({ ...newSetting, auto_approve: checked })}
                        />
                        <span>Auto-approve</span>
                    </div>
                </div>
                <Button onClick={handleCreateSetting} className="mt-4">
                    Create Setting
                </Button>
            </div>

            {/* Settings table */}
            <div className="bg-white rounded-lg shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Auto-approve</TableHead>
                            <TableHead>Priority Hours</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {settings.map((setting) => (
                            <TableRow key={setting.id}>
                                <TableCell>
                                    {employees.find(e => e.id === setting.employee_id)?.name || setting.employee_id}
                                </TableCell>
                                <TableCell>{setting.location}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={setting.auto_approve}
                                        onCheckedChange={(checked) =>
                                            handleUpdateSetting(setting.id!, { ...setting, auto_approve: checked })
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={setting.priority_hours}
                                        onChange={(e) =>
                                            handleUpdateSetting(setting.id!, {
                                                ...setting,
                                                priority_hours: parseInt(e.target.value),
                                            })
                                        }
                                        className="w-20"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDeleteSetting(setting.id!)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default AutoApprovalSettings; 