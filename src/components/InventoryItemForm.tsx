'use client';

import { useState, useEffect, useRef } from 'react';
import { Item, ItemFormData, ItemStatus, ITEM_STATUSES, Unit, ItemCategory, ITEM_CATEGORIES, Location } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { PropertySticker } from './PropertySticker';
import { ConfirmModal } from './ConfirmModal';
import { createClient } from '@/lib/supabase/client';

interface InventoryItemFormProps {
    item?: Item | null;
    isEditable?: boolean;
    onSave?: (data: ItemFormData) => Promise<void>;
    onDelete?: () => Promise<void>;
    onClose?: () => void;
    isNew?: boolean;
}

export function InventoryItemForm({
    item,
    isEditable = false,
    onSave,
    onDelete,
    onClose,
    isNew = false,
}: InventoryItemFormProps) {
    const [formData, setFormData] = useState<ItemFormData>({
        name: item?.name || '',
        unique_id: item?.unique_id || generateUniqueId(),
        description: item?.description || '',
        serial_number: item?.serial_number || '',
        acquisition_date: item?.acquisition_date || '',
        acquisition_cost: item?.acquisition_cost || null,
        location: item?.location || '',
        end_user: item?.end_user || '',
        status: item?.status || 'Brand New',
        category: item?.category || 'Other Equipments',
        remarks: item?.remarks || '',
        itr_or_no: item?.itr_or_no || '',
        property_number: item?.property_number || '',
        image_url: item?.image_url || '',
        quantity: item?.quantity || 0,
        unit: item?.unit || '',
    });
    const [units, setUnits] = useState<Unit[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(item?.image_url || '');
    const [showImageModal, setShowImageModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchUnits();
        fetchLocations();
    }, []);

    // Warning for unsaved changes on page refresh/leave
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges && isEditable) {
                e.preventDefault();
                e.returnValue = ''; // Modern browsers require this
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, isEditable]);

    const fetchUnits = async () => {
        try {
            const { data, error } = await supabase
                .from('units')
                .select('*')
                .order('name');

            if (error) throw error;
            setUnits(data || []);
        } catch (err) {
            console.error('Error fetching units:', err);
        }
    };

    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('locations')
                .select('*')
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            setLocations(data || []);
        } catch (err) {
            console.error('Error fetching locations:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onSave) return;

        try {
            setIsSaving(true);
            setError(null);
            await onSave(formData);
            setHasUnsavedChanges(false); // Reset unsaved changes flag after successful save
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save item');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;

        try {
            setIsDeleting(true);
            setError(null);
            setShowDeleteModal(false);
            await onDelete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete item');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleChange = (field: keyof ItemFormData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (isEditable) {
            setHasUnsavedChanges(true);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create local preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to Supabase Storage
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `item-images/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('inventory')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('inventory')
                .getPublicUrl(filePath);

            handleChange('image_url', publicUrl);
        } catch (err) {
            console.error('Error uploading image:', err);
            setError('Failed to upload image. Please try again.');
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            setStream(mediaStream);
            setShowCamera(true);
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Failed to access camera. Please check permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };

    const captureImage = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) return;

        context.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) return;

            // Create local preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(blob);

            // Upload to Supabase Storage
            try {
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const filePath = `item-images/${fileName}`;

                const file = new File([blob], fileName, { type: 'image/jpeg' });

                const { error: uploadError } = await supabase.storage
                    .from('inventory')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('inventory')
                    .getPublicUrl(filePath);

                handleChange('image_url', publicUrl);
                stopCamera();
            } catch (err) {
                console.error('Error uploading image:', err);
                setError('Failed to upload captured image. Please try again.');
            }
        }, 'image/jpeg', 0.9);
    };

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    useEffect(() => {
        if (showCamera && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => {
                console.error('Error playing video:', err);
            });
        }
    }, [showCamera, stream]);

    return (
        <>
            <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">
                                {isNew ? 'Add New Item' : formData.name || 'Item Details'}
                            </h2>
                            {!isNew && item && (
                                <p className="text-sm text-muted mt-1">ID: {item.unique_id}</p>
                            )}
                        </div>
                        {!isNew && item && (
                            <StatusBadge status={item.status} size="lg" />
                        )}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                            {error}
                        </div>
                    )}

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Item Image
                        </label>
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            {(imagePreview || formData.image_url) && (
                                <div className="relative w-full sm:w-32 h-32 rounded-lg border border-border overflow-hidden bg-surface-hover flex-shrink-0 group">
                                    <img
                                        src={imagePreview || formData.image_url}
                                        alt="Item preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowImageModal(true)}
                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="View full size"
                                    >
                                        <ExpandIcon className="w-8 h-8 text-white" />
                                    </button>
                                </div>
                            )}
                            {isEditable && (
                                <div className="flex-1 w-full space-y-3">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-surface-hover transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadIcon className="w-10 h-10 text-muted mb-2" />
                                            <p className="text-sm text-muted text-center px-2">
                                                <span className="font-medium text-primary">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-muted mt-1">PNG, JPG up to 5MB</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-border text-foreground font-medium hover:border-primary hover:bg-surface-hover transition-colors"
                                    >
                                        <CameraIcon className="w-5 h-5" />
                                        Capture with Camera
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Item Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Item Name *
                        </label>
                        {isEditable ? (
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="e.g., Epson Printer"
                                required
                            />
                        ) : (
                            <p className="text-2xl font-bold text-foreground">{formData.name}</p>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Category *
                        </label>
                        {isEditable ? (
                            <select
                                value={formData.category}
                                onChange={(e) => handleChange('category', e.target.value as ItemCategory)}
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                required
                            >
                                {ITEM_CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-foreground">{formData.category}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Description
                        </label>
                        {isEditable ? (
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                placeholder="e.g., Epson l3210 printer"
                            />
                        ) : (
                            <p className="text-foreground">{formData.description || '-'}</p>
                        )}
                    </div>

                    {/* Serial Number and Property Number */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Serial Number
                            </label>
                            {isEditable ? (
                                <input
                                    type="text"
                                    value={formData.serial_number}
                                    onChange={(e) => handleChange('serial_number', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="e.g., 222-19-01-03-12"
                                />
                            ) : (
                                <p className="text-foreground font-mono">{formData.serial_number || '-'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Property Number
                            </label>
                            {isEditable ? (
                                <input
                                    type="text"
                                    value={formData.property_number}
                                    onChange={(e) => handleChange('property_number', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="e.g., SPHV-2019-06-01-0012-RAD-01-02"
                                />
                            ) : (
                                <p className="text-foreground font-mono">{formData.property_number || '-'}</p>
                            )}
                        </div>
                    </div>

                    {/* Acquisition Date and Cost */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Acquisition Date
                            </label>
                            {isEditable ? (
                                <input
                                    type="date"
                                    value={formData.acquisition_date}
                                    onChange={(e) => handleChange('acquisition_date', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            ) : (
                                <p className="text-foreground">
                                    {formData.acquisition_date
                                        ? new Date(formData.acquisition_date).toLocaleDateString('en-PH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : '-'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Acquisition Cost
                            </label>
                            {isEditable ? (
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₱</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.acquisition_cost || ''}
                                        onChange={(e) => handleChange('acquisition_cost', e.target.value ? parseFloat(e.target.value) : null)}
                                        className="w-full pl-8 pr-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            ) : (
                                <p className="text-foreground">
                                    {formData.acquisition_cost
                                        ? `₱${formData.acquisition_cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                        : '-'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Location and End User */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Location
                            </label>
                            {isEditable ? (
                                <>
                                    <input
                                        type="text"
                                        list="location-presets"
                                        value={formData.location}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="Select or type a location"
                                    />
                                    <datalist id="location-presets">
                                        {locations.map((location) => (
                                            <option key={location.id} value={location.name} />
                                        ))}
                                    </datalist>
                                </>
                            ) : (
                                <p className="text-foreground">{formData.location || '-'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                End User
                            </label>
                            {isEditable ? (
                                <input
                                    type="text"
                                    value={formData.end_user}
                                    onChange={(e) => handleChange('end_user', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="e.g., JUDEL BAGISAN"
                                />
                            ) : (
                                <p className="text-foreground">{formData.end_user || '-'}</p>
                            )}
                        </div>
                    </div>

                    {/* ITR OR No. */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            ITR OR No.
                        </label>
                        {isEditable ? (
                            <input
                                type="text"
                                value={formData.itr_or_no}
                                onChange={(e) => handleChange('itr_or_no', e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="e.g., ITR-2020-0045 or n/a"
                            />
                        ) : (
                            <p className="text-foreground">{formData.itr_or_no || '-'}</p>
                        )}
                    </div>

                    {/* Unique ID (only for new items) */}
                    {isNew && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Unique ID *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.unique_id}
                                    onChange={(e) => handleChange('unique_id', e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                    placeholder="Unique identifier"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => handleChange('unique_id', generateUniqueId())}
                                    className="px-4 py-3 rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                                    title="Generate new ID"
                                >
                                    <RefreshIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Quantity and Unit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Quantity
                            </label>
                            {isEditable ? (
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    min="0"
                                />
                            ) : (
                                <p className="text-xl font-semibold text-foreground">{formData.quantity}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Unit
                            </label>
                            {isEditable ? (
                                <select
                                    value={formData.unit}
                                    onChange={(e) => handleChange('unit', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <option value="">Select unit</option>
                                    {units.map((unit) => (
                                        <option key={unit.id} value={unit.name}>
                                            {unit.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-xl font-semibold text-foreground">{formData.unit || '-'}</p>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Status
                        </label>
                        {isEditable ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {ITEM_STATUSES.map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => handleChange('status', status)}
                                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${formData.status === status
                                            ? getStatusButtonClass(status, true)
                                            : 'border-border text-muted hover:border-primary/50'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <StatusBadge status={formData.status} size="lg" />
                        )}
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Remarks
                        </label>
                        {isEditable ? (
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => handleChange('remarks', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                placeholder="Additional notes or comments"
                            />
                        ) : (
                            <p className="text-foreground whitespace-pre-wrap">
                                {formData.remarks || 'No remarks'}
                            </p>
                        )}
                    </div>

                    {/* QR Code Section (for existing items) */}
                    {!isNew && item && (
                        <div className="border-t border-border pt-6">
                            <button
                                type="button"
                                onClick={() => setShowQR(!showQR)}
                                className="flex items-center gap-2 text-primary hover:text-primary-hover font-medium transition-colors"
                            >
                                <QRIcon className="w-5 h-5" />
                                {showQR ? 'Hide Property Sticker' : 'Print Property Sticker'}
                            </button>

                            {showQR && (
                                <div className="mt-4">
                                    <PropertySticker item={item} onClose={() => setShowQR(false)} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                        {isEditable && (
                            <>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <SaveIcon className="w-5 h-5" />
                                            {isNew ? 'Create Item' : 'Save Changes'}
                                        </>
                                    )}
                                </button>

                                {!isNew && onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteModal(true)}
                                        disabled={isDeleting}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-danger/10 text-danger font-medium hover:bg-danger hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <TrashIcon className="w-5 h-5" />
                                                Delete
                                            </>
                                        )}
                                    </button>
                                )}
                            </>
                        )}

                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-6 py-3 rounded-lg border border-border text-muted font-medium hover:text-foreground hover:bg-surface-hover transition-all"
                            >
                                {isEditable ? 'Cancel' : 'Close'}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Item"
                message="Are you sure you want to delete this item? This item will be stored in archived items."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            {/* Full-Screen Image Modal */}
            {showImageModal && (imagePreview || formData.image_url) && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200"
                    onClick={() => setShowImageModal(false)}
                >
                    <button
                        onClick={() => setShowImageModal(false)}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        aria-label="Close"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={imagePreview || formData.image_url}
                            alt="Full size"
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between">
                            <h3 className="text-xl font-bold text-foreground">Capture Image</h3>
                            <button
                                onClick={stopCamera}
                                className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                                aria-label="Close camera"
                            >
                                <CloseIcon className="w-6 h-6 text-foreground" />
                            </button>
                        </div>

                        {/* Camera View */}
                        <div className="p-6">
                            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Camera Controls */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={captureImage}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all shadow-md hover:shadow-lg"
                                >
                                    <CameraIcon className="w-5 h-5" />
                                    Capture Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="px-6 py-3 rounded-lg border border-border text-muted font-medium hover:text-foreground hover:bg-surface-hover transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}
        </>
    );
}

// Helper function to generate unique ID
function generateUniqueId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `INV-${timestamp}-${randomPart}`.toUpperCase();
}

// Helper function for status button styling
function getStatusButtonClass(status: ItemStatus, isSelected: boolean): string {
    if (!isSelected) return '';

    const classes: Record<ItemStatus, string> = {
        'Brand New': 'border-emerald-500 bg-emerald-500/10 text-emerald-600',
        'Good': 'border-blue-500 bg-blue-500/10 text-blue-600',
        'Serviceable': 'border-teal-500 bg-teal-500/10 text-teal-600',
        'Unserviceable': 'border-red-500 bg-red-500/10 text-red-600',
        'Repair Needed': 'border-orange-500 bg-orange-500/10 text-orange-600',
        'Donated': 'border-purple-500 bg-purple-500/10 text-purple-600',
        'For Disposal': 'border-gray-500 bg-gray-500/10 text-gray-600',
        'Disposable': 'border-slate-500 bg-slate-500/10 text-slate-600',
    };

    return classes[status];
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}

function SaveIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

function QRIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
    );
}

function ExpandIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function UploadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
    );
}

function CameraIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}
