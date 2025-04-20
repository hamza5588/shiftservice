export interface AutoApprovalSetting {
    id?: number;
    employee_id: string;
    location: string;
    auto_approve: boolean;
    priority_hours?: number;
} 