export interface Item {
    id: string;
    unique_id: string;
    name: string;
    description: string | null;
    serial_number: string | null;
    acquisition_date: string | null;
    acquisition_cost: number | null;
    location: string | null;
    end_user: string | null;
    status: ItemStatus;
    category: ItemCategory;
    remarks: string | null;
    itr_or_no: string | null;
    property_number: string | null;
    image_url: string | null;
    quantity: number;
    unit: string | null;
    created_at: string;
    updated_at: string;
}

export type ItemStatus = 'Brand New' | 'Good' | 'Usable' | 'Repair Needed' | 'Unusable';
export type ItemCategory = 'Furniture and Fixtures' | 'ICT Equipments' | 'Other Equipments';

export const ITEM_STATUSES: ItemStatus[] = [
    'Brand New',
    'Good',
    'Usable',
    'Repair Needed',
    'Unusable',
];

export const ITEM_CATEGORIES: ItemCategory[] = [
    'Furniture and Fixtures',
    'ICT Equipments',
    'Other Equipments',
];

export const LOCATION_PRESETS: string[] = [
    'AFU',
    'AFU - SUPPLY ROOM',
    'AFU/ SUPPLY ROOM/ I.T ROOM',
    'AIRPORT',
    'ALL DOORS (1-12)',
    'ARABIC ROOM',
    'CANTONESE WAITING AREA',
    'COA',
    'CONFERENCE ROOM',
    'CONFERENCE ROOM/ RD\'s ROOM',
    'CONFERENCE WAITING AREA',
    'CPDEP - CANTONESE',
    'DOLE',
    'DOOR 1 AND AFU',
    'DOOR 1/CUPBOARD',
    'ETU',
    'ETU WAITING AREA (INSIDE)',
    'IT ROOM',
    'LYNJUN BLDG',
    'MIGRANTS BREW',
    'OD / ETU',
    'OFFICER OF THE DAY',
    'OSPC-DMW',
    'OSSCO',
    'PACD',
    'PARKING',
    'PARKING LOT',
    'PESO',
    'RD\'s ROOM',
    'REINTEG UNIT',
    'REINTEG UNIT WAITING AREA',
    'SOC. BEN. UNIT',
    'STOCKROOM',
    'SUPPLY ROOM',
    'TRAINING ROOMS',
    'WELFARE ROOM',
    'WELFARE UNIT',
    'WELFARE WAITING AREA',
];

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
    location: string;
    end_user: string;
    status: ItemStatus;
    category: ItemCategory;
    remarks: string;
    itr_or_no: string;
    property_number: string;
    image_url: string;
    quantity: number;
    unit: string;
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
        };
        Enums: {
            item_status: ItemStatus;
            item_category: ItemCategory;
        };
    };
}

