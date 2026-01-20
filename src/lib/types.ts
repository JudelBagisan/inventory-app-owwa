export interface Item {
    id: string;
    unique_id: string;
    name: string;
    description: string | null;
    serial_number: string | null;
    acquisition_date: string | null;
    acquisition_cost: number | null;
    location: Location | null;
    end_user: string | null;
    status: ItemStatus;
    remarks: string | null;
    itr_or_no: string | null;
    property_number: string | null;
    image_url: string | null;
    quantity: number;
    unit: string | null;
    owner: string | null;
    created_at: string;
    updated_at: string;
}

export type ItemStatus = 'In Stock' | 'Checked Out' | 'Maintenance' | 'Disposed';
export type Location = 'RAD' | 'AFU' | 'PDO';

export const ITEM_STATUSES: ItemStatus[] = [
    'In Stock',
    'Checked Out',
    'Maintenance',
    'Disposed',
];

export const LOCATIONS: Location[] = ['RAD', 'AFU', 'PDO'];

export interface Unit {
    id: string;
    name: string;
    created_at: string;
}

export interface User {
    id: string;
    email: string;
    role?: 'admin' | 'user';
}

// Form data types
export interface ItemFormData {
    name: string;
    unique_id: string;
    description: string;
    serial_number: string;
    acquisition_date: string;
    acquisition_cost: number | null;
    location: Location | '';
    end_user: string;
    status: ItemStatus;
    remarks: string;
    itr_or_no: string;
    property_number: string;
    image_url: string;
    quantity: number;
    unit: string;
    owner: string;
}

// API response types
export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
}

// Database types for Supabase
export interface Database {
    public: {
        Tables: {
            items: {
                Row: Item;
                Insert: Omit<Item, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>;
            };
            units: {
                Row: Unit;
                Insert: Omit<Unit, 'id' | 'created_at'>;
                Update: Partial<Omit<Unit, 'id' | 'created_at'>>;
            };
            locations: {
                Row: { id: string; name: Location; created_at: string };
                Insert: { name: Location };
                Update: Partial<{ name: Location }>;
            };
        };
        Enums: {
            item_status: ItemStatus;
        };
    };
}
