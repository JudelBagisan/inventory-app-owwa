'use client';

import { useState, useEffect, useMemo } from 'react';
import { Item, ItemFormData, ITEM_STATUSES, ItemStatus, LOCATION_PRESETS, ITEM_CATEGORIES, ItemCategory } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { InventoryItemForm } from '@/components/InventoryItemForm';
import { BulkStickerGenerator } from '@/components/BulkStickerGenerator';
import { createClient } from '@/lib/supabase/client';
import ExcelJS from 'exceljs';

type SortOption = 'date-asc' | 'date-desc' | 'name-asc';

export default function DashboardPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'All'>('All');
    const [locationFilter, setLocationFilter] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('date-desc');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [bulkMode, setBulkMode] = useState<'download' | 'print' | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchItems();
    }, []);

    // Filtered and sorted items using useMemo
    const filteredItems = useMemo(() => {
        let filtered = items;

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    item.unique_id.toLowerCase().includes(query) ||
                    item.serial_number?.toLowerCase().includes(query) ||
                    item.property_number?.toLowerCase().includes(query) ||
                    item.end_user?.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query)
            );
        }

        // Apply category filter
        if (categoryFilter !== 'All') {
            filtered = filtered.filter((item) => item.category === categoryFilter);
        }

        // Apply location filter
        if (locationFilter) {
            filtered = filtered.filter((item) => item.location === locationFilter);
        }

        // Apply sorting
        filtered = [...filtered].sort((a, b) => {
            switch (sortOption) {
                case 'date-asc':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'date-desc':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [items, searchQuery, categoryFilter, locationFilter, sortOption]);

    // Paginated items
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredItems.slice(startIndex, endIndex);
    }, [filteredItems, currentPage, itemsPerPage]);

    // Total pages calculation
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, locationFilter, sortOption]);

    const fetchItems = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch items');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveItem = async (data: ItemFormData) => {
        const isNew = showAddForm;

        try {
            if (isNew) {
                const { error } = await supabase.from('items').insert([data]);
                if (error) throw error;
            } else if (selectedItem) {
                const { error } = await supabase
                    .from('items')
                    .update(data)
                    .eq('id', selectedItem.id);
                if (error) throw error;
            }

            await fetchItems();
            setSelectedItem(null);
            setShowAddForm(false);
        } catch (err) {
            throw err;
        }
    };

    const handleDeleteItem = async () => {
        if (!selectedItem) return;

        try {
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', selectedItem.id);

            if (error) throw error;

            await fetchItems();
            setSelectedItem(null);
        } catch (err) {
            throw err;
        }
    };

    const getCategoryCount = (category: ItemCategory) => {
        return items.filter((item) => item.category === category).length;
    };

    // Selection handlers
    const handleSelectAll = () => {
        if (selectedItems.size === paginatedItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(paginatedItems.map(item => item.id)));
        }
    };

    const handleSelectItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAllFiltered = () => {
        setSelectedItems(new Set(filteredItems.map(item => item.id)));
    };

    const handleClearSelection = () => {
        setSelectedItems(new Set());
    };

    const getSelectedItems = (): Item[] => {
        return items.filter(item => selectedItems.has(item.id));
    };

    const handleExportToExcel = async () => {
        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventory');

        // Define columns with headers
        const columns = [
            { header: 'Item Name', key: 'name', width: 25 },
            { header: 'Unique ID', key: 'unique_id', width: 18 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Serial Number', key: 'serial_number', width: 20 },
            { header: 'Property Number', key: 'property_number', width: 25 },
            { header: 'Category', key: 'category', width: 22 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'End User', key: 'end_user', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Acquisition Date', key: 'acquisition_date', width: 18 },
            { header: 'Acquisition Cost', key: 'acquisition_cost', width: 18 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Unit', key: 'unit', width: 10 },
            { header: 'ITR OR No.', key: 'itr_or_no', width: 18 },
            { header: 'Remarks', key: 'remarks', width: 30 },
        ];

        worksheet.columns = columns;

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2563EB' }, // Blue color
            };
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFF' },
                size: 11,
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
            };
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } },
            };
        });

        // Add data rows (only filtered items)
        filteredItems.forEach((item) => {
            const row = worksheet.addRow({
                name: item.name,
                unique_id: item.unique_id,
                description: item.description || '',
                serial_number: item.serial_number || '',
                property_number: item.property_number || '',
                category: item.category,
                location: item.location || '',
                end_user: item.end_user || '',
                status: item.status,
                acquisition_date: item.acquisition_date || '',
                acquisition_cost: item.acquisition_cost ? `₱${item.acquisition_cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '',
                quantity: item.quantity,
                unit: item.unit || '',
                itr_or_no: item.itr_or_no || '',
                remarks: item.remarks || '',
            });

            // Style data rows
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'CCCCCC' } },
                    left: { style: 'thin', color: { argb: 'CCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                    right: { style: 'thin', color: { argb: 'CCCCCC' } },
                };
                cell.alignment = { vertical: 'middle' };
            });
        });

        // Generate filename with date and filter info
        const date = new Date().toISOString().split('T')[0];
        const filterInfo = categoryFilter !== 'All' ? `_${categoryFilter.replace(/\s+/g, '-')}` : '';
        const filename = `inventory_export${filterInfo}_${date}.xlsx`;

        // Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount: number | null) => {
        if (!amount) return '-';
        return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="container mx-auto py-6 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl mt-5 font-bold text-foreground">Inventory Dashboard</h1>
                    <p className="text-muted mt-1">Manage your inventory items</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all shadow-md hover:shadow-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add New Item
                </button>
            </div>

            {/* Category Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div
                    className={`p-5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg cursor-pointer transition-all transform hover:scale-[1.02] hover:shadow-xl ${categoryFilter === 'Furniture and Fixtures' ? 'ring-4 ring-white/50' : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'Furniture and Fixtures' ? 'All' : 'Furniture and Fixtures')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-sm font-medium">Furniture & Fixtures</p>
                            <p className="text-4xl font-bold mt-1">
                                {getCategoryCount('Furniture and Fixtures')}
                            </p>
                            <p className="text-white/60 text-xs mt-1">
                                {categoryFilter === 'Furniture and Fixtures' ? 'Click to show all' : 'Click to filter'}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-red-400/30">
                            <CategoryIcon category="Furniture and Fixtures" className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>
                <div
                    className={`p-5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg cursor-pointer transition-all transform hover:scale-[1.02] hover:shadow-xl ${categoryFilter === 'ICT Equipments' ? 'ring-4 ring-white/50' : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'ICT Equipments' ? 'All' : 'ICT Equipments')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-sm font-medium">ICT Equipments</p>
                            <p className="text-4xl font-bold mt-1">
                                {getCategoryCount('ICT Equipments')}
                            </p>
                            <p className="text-white/60 text-xs mt-1">
                                {categoryFilter === 'ICT Equipments' ? 'Click to show all' : 'Click to filter'}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-400/30">
                            <CategoryIcon category="ICT Equipments" className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>
                <div
                    className={`p-5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg cursor-pointer transition-all transform hover:scale-[1.02] hover:shadow-xl ${categoryFilter === 'Other Equipments' ? 'ring-4 ring-white/50' : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'Other Equipments' ? 'All' : 'Other Equipments')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-sm font-medium">Other Equipments</p>
                            <p className="text-4xl font-bold mt-1">
                                {getCategoryCount('Other Equipments')}
                            </p>
                            <p className="text-white/60 text-xs mt-1">
                                {categoryFilter === 'Other Equipments' ? 'Click to show all' : 'Click to filter'}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-teal-400/30">
                            <CategoryIcon category="Other Equipments" className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar: Filters, Sort, Export */}
            <div className="bg-surface rounded-xl border border-border p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, serial number, property number..."
                            className="w-full pl-12 pr-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Location Filter */}
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            <option value="">All Locations ({items.length})</option>
                            {LOCATION_PRESETS.map((location) => (
                                <option key={location} value={location}>
                                    {location}
                                </option>
                            ))}
                        </select>

                        {/* Sort */}
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className="px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            <option value="date-desc">Date Added (Newest)</option>
                            <option value="date-asc">Date Added (Oldest)</option>
                            <option value="name-asc">Name (A-Z)</option>
                        </select>

                        {/* Export Button */}
                        <button
                            onClick={handleExportToExcel}
                            disabled={filteredItems.length === 0}
                            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        >
                            <ExportIcon className="w-5 h-5" />
                            Export to Excel
                        </button>
                    </div>
                </div>

                {/* Active Filters Display */}
                {(categoryFilter !== 'All' || locationFilter || searchQuery) && (
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
                        <span className="text-sm text-muted">Active filters:</span>
                        {categoryFilter !== 'All' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                                Category: {categoryFilter}
                                <button onClick={() => setCategoryFilter('All')} className="hover:text-primary-hover">×</button>
                            </span>
                        )}
                        {locationFilter && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                                Location: {locationFilter}
                                <button onClick={() => setLocationFilter('')} className="hover:text-primary-hover">×</button>
                            </span>
                        )}
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                                Search: {searchQuery}
                                <button onClick={() => setSearchQuery('')} className="hover:text-primary-hover">×</button>
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setCategoryFilter('All');
                                setLocationFilter('');
                                setSearchQuery('');
                            }}
                            className="text-sm text-muted hover:text-foreground underline"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Bulk Action Toolbar */}
            {selectedItems.size > 0 && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-primary font-medium">
                                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                            </span>
                            <button
                                onClick={handleSelectAllFiltered}
                                className="text-sm text-primary hover:underline"
                            >
                                Select all {filteredItems.length}
                            </button>
                            <button
                                onClick={handleClearSelection}
                                className="text-sm text-muted hover:text-foreground"
                            >
                                Clear selection
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBulkMode('download')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-md"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Download Stickers
                            </button>
                            <button
                                onClick={() => setBulkMode('print')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors shadow-md"
                            >
                                <PrintIcon className="w-4 h-4" />
                                Print Stickers
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted">
                    Showing {filteredItems.length} of {items.length} items
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
                    {error}
                    <button
                        onClick={fetchItems}
                        className="ml-4 underline hover:no-underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Items Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-xl border border-border">
                    <BoxIcon className="w-16 h-16 text-muted mx-auto mb-4" />
                    <p className="text-xl font-medium text-foreground">No items found</p>
                    <p className="text-muted mt-2">
                        {searchQuery || categoryFilter !== 'All' || locationFilter
                            ? 'Try adjusting your search or filters'
                            : 'Add your first item to get started'}
                    </p>
                </div>
            ) : (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-hover border-b border-border">
                                <tr>
                                    <th className="px-3 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={paginatedItems.length > 0 && selectedItems.size === paginatedItems.length}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Image</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Item Name</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Category</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Serial No.</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Location</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">End User</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginatedItems.map((item) => (
                                    <tr key={item.id} className={`hover:bg-surface-hover transition-colors ${selectedItems.has(item.id) ? 'bg-primary/5' : ''}`}>
                                        <td className="px-3 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => handleSelectItem(item.id)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-12 h-12 rounded-lg object-cover border border-border"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
                                                    <ImageIcon className="w-6 h-6 text-muted" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div>
                                                <p className="font-medium text-foreground">{item.name}</p>
                                                <p className="text-xs text-muted truncate max-w-[200px]">{item.description || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <CategoryBadge category={item.category} />
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm font-mono text-foreground">{item.serial_number || '-'}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm text-foreground">{item.location || '-'}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-sm text-foreground">{item.end_user || '-'}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusBadge status={item.status} size="sm" />
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedItem(item)}
                                                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="lg:hidden divide-y divide-border">
                        {paginatedItems.map((item) => (
                            <div
                                key={item.id}
                                className={`p-4 hover:bg-surface-hover transition-colors cursor-pointer ${selectedItems.has(item.id) ? 'bg-primary/5' : ''}`}
                            >
                                <div className="flex items-start gap-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={() => handleSelectItem(item.id)}
                                        className="w-5 h-5 mt-1 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                    />
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-surface-hover border border-border flex items-center justify-center flex-shrink-0">
                                            <ImageIcon className="w-8 h-8 text-muted" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-medium text-foreground">{item.name}</p>
                                                <CategoryBadge category={item.category} />
                                            </div>
                                            <StatusBadge status={item.status} size="sm" />
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-muted">Serial: </span>
                                                <span className="text-foreground font-mono">{item.serial_number || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted">Location: </span>
                                                <span className="text-foreground">{item.location || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedItem(item)}
                                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all flex-shrink-0"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-border bg-surface-hover">
                            <div className="text-sm text-muted">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface transition-colors"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface transition-colors"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                                    ? 'bg-primary text-white'
                                                    : 'border border-border hover:bg-surface'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface transition-colors"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface transition-colors"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal for Edit/Add */}
            {(selectedItem || showAddForm) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <InventoryItemForm
                            item={selectedItem}
                            isEditable={true}
                            isNew={showAddForm}
                            onSave={handleSaveItem}
                            onDelete={selectedItem ? handleDeleteItem : undefined}
                            onClose={() => {
                                setSelectedItem(null);
                                setShowAddForm(false);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Bulk Sticker Generator Modal */}
            {bulkMode && (
                <BulkStickerGenerator
                    items={getSelectedItems()}
                    mode={bulkMode}
                    onClose={() => {
                        setBulkMode(null);
                        setSelectedItems(new Set());
                    }}
                />
            )}
        </div>
    );
}

// Category Badge Component
function CategoryBadge({ category }: { category: ItemCategory }) {
    const config: Record<ItemCategory, { bg: string; text: string }> = {
        'Furniture and Fixtures': { bg: 'bg-red-600 dark:bg-red-700', text: 'text-white' },
        'ICT Equipments': { bg: 'bg-blue-600 dark:bg-blue-700', text: 'text-white' },
        'Other Equipments': { bg: 'bg-teal-600 dark:bg-teal-700', text: 'text-white' },
    };

    const cfg = config[category] || config['Other Equipments'];
    const shortLabel = category === 'Furniture and Fixtures' ? 'Furniture' :
        category === 'ICT Equipments' ? 'ICT' : 'Others';

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            {shortLabel}
        </span>
    );
}

// Category Icon Component
function CategoryIcon({ category, className }: { category: ItemCategory; className?: string }) {
    if (category === 'Furniture and Fixtures') {
        return (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        );
    }
    if (category === 'ICT Equipments') {
        return (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
        );
    }
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function BoxIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    );
}

function ChevronRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function LocationIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
    );
}

function ExportIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

function PrintIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
    );
}

