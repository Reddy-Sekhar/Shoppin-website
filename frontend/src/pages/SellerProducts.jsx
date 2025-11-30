import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { createProduct, uploadProductImages, fetchMyProducts, fetchProducts, updateProduct, deleteProduct } from '../api';

const SellerProducts = ({ title = 'Products' } = {}) => {
    const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark');
    const currentUser = useSelector((state) => state.auth.user);
    const isAdmin = currentUser?.role === 'ADMIN';
    const [form, setForm] = useState({
        name: '',
        description: '',
        category: '',
        sub_category: '',
        price: '',
        colors: '', // comma-separated
        sizes: '', // comma-separated
        moq: 1,
        lead_time: '',
        material: '',
        warranty: '',
        certifications: '',
        shipping_terms: '',
        payment_terms: '',
        bulk_pricing: '',
        specifications: '{}',
    });
    const MAX_IMAGES = 7;
    const [images, setImages] = useState([]);

    const [status, setStatus] = useState({ loading: false, message: '', error: '' });
    const [products, setProducts] = useState([]);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = isAdmin ? await fetchProducts() : await fetchMyProducts();
                const data = res.data?.data || res.data?.results || res.data || [];
                setProducts(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to fetch products', err);
            }
        };
        load();
    }, [isAdmin]);
    
    const fieldBaseStyle = {
        padding: '0.85rem',
        borderRadius: '10px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.16)' : '#cbd5e1'}`,
        backgroundColor: isDark ? '#141e34' : '#ffffff',
        color: isDark ? '#f8fafc' : '#1f2937',
        boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : 'none',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
    };

    const sectionBaseStyle = {
        borderRadius: '16px',
        padding: '1.5rem',
        backgroundColor: isDark ? '#111a2c' : '#f8fafc',
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : '#e2e8f0'}`,
        boxShadow: isDark ? '0 10px 24px rgba(5,9,20,0.45)' : 'none',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
    };

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const revokeBlobUrl = (url) => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };

    const clearImages = () => {
        setImages((prev) => {
            prev.forEach((img) => revokeBlobUrl(img.previewUrl));
            return [];
        });
    };

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const onFilesChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const remainingSlots = MAX_IMAGES - images.length;
        if (remainingSlots <= 0) {
            setStatus({ loading: false, message: '', error: `Maximum ${MAX_IMAGES} images allowed` });
            return;
        }

        const filesToUpload = files.slice(0, remainingSlots);
        if (filesToUpload.length < files.length) {
            setStatus({ loading: false, message: '', error: `Only ${remainingSlots} more image(s) can be added` });
        }

        const newEntries = filesToUpload.map((file) => ({
            id: generateId(),
            previewUrl: URL.createObjectURL(file),
            serverUrl: null,
            name: file.name,
        }));

        setImages((prev) => [...prev, ...newEntries]);
        setStatus({ loading: true, message: 'Uploading images to server...', error: '' });

        const fd = new FormData();
        filesToUpload.forEach((file) => fd.append('images', file));

        const newIds = newEntries.map((entry) => entry.id);

        try {
            const res = await uploadProductImages(fd);
            const urls = res.data?.urls || [];

            if (!urls.length || urls.length !== filesToUpload.length) {
                throw new Error('Image upload mismatch. Please try again.');
            }

            setImages((prev) => {
                const updated = [...prev];
                let assignIndex = 0;
                return updated.map((img) => {
                    if (!newIds.includes(img.id)) return img;
                    const assignedUrl = urls[assignIndex++] || null;
                    return { ...img, serverUrl: assignedUrl };
                });
            });

            setStatus({
                loading: false,
                message: `✅ ${urls.length} image(s) uploaded successfully`,
                error: '',
            });
        } catch (err) {
            console.error('Upload failed:', err);
            console.error('Response data:', err?.response?.data);

            setImages((prev) => {
                const filtered = prev.filter((img) => {
                    if (newIds.includes(img.id)) {
                        revokeBlobUrl(img.previewUrl);
                        return false;
                    }
                    return true;
                });
                return filtered;
            });

            const errorMsg = err?.response?.data?.error ||
                err?.response?.data?.detail ||
                err.message ||
                'Image upload failed';

            setStatus({
                loading: false,
                message: '',
                error: errorMsg,
            });
        }
    };

    const removeImage = (id) => {
        setImages((prev) => {
            const target = prev.find((img) => img.id === id);
            if (target) {
                revokeBlobUrl(target.previewUrl);
            }
            return prev.filter((img) => img.id !== id);
        });
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        const serverUrls = images.map((img) => img.serverUrl).filter(Boolean);
        if (images.length === 0) {
            setStatus({ loading: false, message: '', error: 'Please upload at least one image' });
            return;
        }

        if (serverUrls.length !== images.length) {
            setStatus({ loading: false, message: '', error: 'Images still uploading. Please wait for the upload to complete.' });
            return;
        }

        console.log('Saving product to database with server URLs:', serverUrls);
        setStatus({ loading: true, message: '', error: '' });
        try {
            const payload = {
                name: form.name,
                description: form.description,
                category: form.category,
                sub_category: form.sub_category,
                images: serverUrls,
                price_tiers: [{ minQty: 1, maxQty: 0, price: parseFloat(form.price || 0) }],
                colors: form.colors ? form.colors.split(',').map((c) => ({ name: c.trim() })) : [],
                sizes: form.sizes ? form.sizes.split(',').map((s) => s.trim()) : [],
                moq: parseInt(form.moq, 10) || 1,
                lead_time: form.lead_time,
                material: form.material,
                warranty: form.warranty,
                certifications: form.certifications,
                shipping_terms: form.shipping_terms,
                payment_terms: form.payment_terms,
                bulk_pricing: form.bulk_pricing,
                specifications: form.specifications ? JSON.parse(form.specifications) : {},
            };

            console.log('Creating product with payload:', payload);
            const res = await createProduct(payload);
            const newProduct = res.data?.data || res.data;
            console.log('✅ Product saved to database:', newProduct);
            
            setProducts((prev) => [newProduct, ...prev]);
            setStatus({ loading: false, message: '✅ Product published successfully!', error: '' });
            
            // Clear form
            setForm({ name: '', description: '', category: '', sub_category: '', price: '', colors: '', sizes: '', moq: 1, lead_time: '', material: '', warranty: '', certifications: '', shipping_terms: '', payment_terms: '', bulk_pricing: '', specifications: '{}' });
            clearImages();
            setShowFormModal(false);
            
        } catch (err) {
            console.error('Save error:', err);
            setStatus({ loading: false, message: '', error: err?.response?.data || err.message || 'Failed to save product' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return;
        try {
            await deleteProduct(id);
            setProducts((prev) => prev.filter((p) => (p.id ?? p.pk) !== id));
        } catch (err) {
            console.error(err);
            alert('Delete failed');
        }
    };

    const openEdit = (product) => {
        // populate form with product data
        setEditingProduct(product);
        setForm({
            name: product.name || '',
            description: product.description || '',
            category: product.category || '',
            sub_category: product.sub_category || '',
            price: (product.price_tiers && product.price_tiers[0] && product.price_tiers[0].price) || '',
            colors: (product.colors || []).map(c=>c.name||c).join(', '),
            sizes: (product.sizes || []).join(', '),
            moq: product.moq || 1,
            lead_time: product.lead_time || '',
            material: product.material || '',
            warranty: product.warranty || '',
            certifications: product.certifications || '',
            shipping_terms: product.shipping_terms || '',
            payment_terms: product.payment_terms || '',
            bulk_pricing: product.bulk_pricing || '',
            specifications: product.specifications ? JSON.stringify(product.specifications) : '{}',
        });
        setImages(
            (product.images || []).map((url, idx) => ({
                id: `${product.id || product.pk || 'existing'}-${idx}-${Date.now()}`,
                previewUrl: url,
                serverUrl: url,
            }))
        );
        setShowFormModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingProduct) return;
        
        const serverUrls = images.map((img) => img.serverUrl).filter(Boolean);
        if (images.length === 0) {
            setStatus({ loading: false, message: '', error: 'Please upload at least one image' });
            return;
        }
        
        if (serverUrls.length !== images.length) {
            setStatus({ loading: false, message: '', error: 'Images still uploading. Please wait for the upload to complete.' });
            return;
        }

        setStatus({ loading: true, message: '', error: '' });
        try {
            const payload = {
                name: form.name,
                description: form.description,
                category: form.category,
                sub_category: form.sub_category,
                images: serverUrls,
                price_tiers: [{ minQty: 1, maxQty: 0, price: parseFloat(form.price || 0) }],
                colors: form.colors ? form.colors.split(',').map((c) => ({ name: c.trim() })) : [],
                sizes: form.sizes ? form.sizes.split(',').map((s) => s.trim()) : [],
                moq: parseInt(form.moq, 10) || 1,
                lead_time: form.lead_time,
                material: form.material,
                warranty: form.warranty,
                certifications: form.certifications,
                shipping_terms: form.shipping_terms,
                payment_terms: form.payment_terms,
                bulk_pricing: form.bulk_pricing,
                specifications: form.specifications ? JSON.parse(form.specifications) : {},
            };
            const res = await updateProduct(editingProduct.id || editingProduct.pk, payload);
            const updated = res.data?.data || res.data;
            setProducts((prev) => prev.map((p) => ((p.id || p.pk) === (updated.id || updated.pk) ? updated : p)));
            setStatus({ loading: false, message: 'Product updated', error: '' });
            setEditingProduct(null);
            setShowFormModal(false);
            clearImages();
        } catch (err) {
            console.error(err);
            setStatus({ loading: false, message: '', error: 'Update failed' });
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{title}</h1>
                <div>
                        <button onClick={() => { setShowFormModal(true); setEditingProduct(null); setForm({ name: '', description: '', category: '', sub_category: '', price: '', colors: '', sizes: '', moq: 1, lead_time: '', material: '', warranty: '', certifications: '', shipping_terms: '', payment_terms: '', bulk_pricing: '', specifications: '{}' }); clearImages(); }} className="btn btn-accent">Add Product</button>
                </div>
            </div>

            {/* Product cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {products.map((p) => (
                    <div key={p.id || p.pk} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col">
                        <div className="h-40 w-full bg-gray-100 rounded mb-3 overflow-hidden">
                            {p.images && p.images[0] && !p.images[0].startsWith('blob:') ? (
                                <img
                                    src={p.images[0]}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex flex-col items-center justify-center text-sm"
                                    style={{
                                        backgroundColor: isDark ? '#111a2c' : '#ffffff',
                                        color: isDark ? '#f8fafc' : '#0b1220',
                                        border: `1px solid ${isDark ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)'}`,
                                    }}
                                >
                                    <span>No preview</span>
                                    <span className="text-xs opacity-70">Upload images to display</span>
                                </div>
                            )}
                        </div>
                        <h3 className="font-semibold text-lg">{p.name}</h3>
                        <p className="text-sm text-gray-500 mb-3">{p.category} • MOQ: {p.moq}</p>
                        <div className="mt-auto flex items-center justify-between gap-2">
                            <button onClick={() => openEdit(p)} className="px-3 py-2 bg-primary text-white rounded">Edit</button>
                            <button onClick={() => handleDelete(p.id || p.pk)} className="px-3 py-2 bg-red-500 text-white rounded">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Form modal (reuses existing form) */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div
                        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto"
                        style={{
                            backgroundColor: isDark ? '#101a33' : '#ffffff',
                            color: isDark ? '#f8fafc' : '#0b1220',
                            border: `1px solid ${isDark ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)'}`,
                            boxShadow: isDark ? '0 26px 60px rgba(5,8,20,0.9)' : '0 12px 25px rgba(15,23,42,0.12)',
                            backdropFilter: 'none',
                            opacity: 1,
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowFormModal(false);
                                    setEditingProduct(null);
                                    clearImages();
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: isDark ? 'var(--text)' : '#6b7280',
                                    padding: '0.25rem 0.5rem',
                                    lineHeight: '1',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.color = isDark ? 'rgba(230,238,248,0.6)' : '#374151';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.color = isDark ? 'var(--text)' : '#6b7280';
                                }}
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <form
                            onSubmit={editingProduct ? handleUpdate : onSubmit}
                            className="space-y-6"
                            style={{
                                backgroundColor: isDark ? '#0c1527' : '#ffffff',
                                borderRadius: '18px',
                                padding: '1rem',
                                border: `1px solid ${isDark ? 'rgba(148,163,184,0.15)' : 'rgba(15,23,42,0.06)'}`,
                                boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,0.015)' : 'none',
                            }}
                        >
                            {/* Product Images Section */}
                            <div
                                style={{
                                    padding: '2rem',
                                    borderRadius: '14px',
                                    backgroundColor: isDark ? '#141e34' : '#f8fafc',
                                    border: `2px dashed ${isDark ? 'rgba(99,102,241,0.5)' : '#cbd5e1'}`,
                                }}
                            >
                                <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: '600' }}>📷 Product Images (Upload up to {MAX_IMAGES})</label>
                                <label
                                    style={{
                                        display: 'inline-block',
                                        padding: '1rem 2rem',
                                        borderRadius: '8px',
                                        backgroundColor: isDark ? '#f59e0b' : '#f59e0b',
                                        color: '#1a1a1a',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: '2px solid transparent',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 6px 16px rgba(245,158,11,0.35)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = '0 10px 20px rgba(245,158,11,0.45)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 6px 16px rgba(245,158,11,0.35)';
                                    }}
                                >
                                    📁 Choose Files
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={onFilesChange}
                                        style={{
                                            display: 'none',
                                        }}
                                    />
                                </label>
                                {images.length > 0 && (
                                    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.5rem' }}>
                                            {images.map((img, idx) => (
                                                <div key={img.id} style={{
                                                    position: 'relative',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                    border: `2px solid ${isDark ? 'rgba(217,119,6,0.5)' : 'rgba(217,119,6,0.3)'}`,
                                                    backgroundColor: isDark ? '#10192f' : '#f3f4f6',
                                                }}>
                                                    <img 
                                                        src={img.previewUrl || img.serverUrl} 
                                                        alt={`preview-${idx}`} 
                                                        style={{ width: '100%', height: '70px', objectFit: 'cover' }} 
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        right: '22px',
                                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                                        color: '#ffffff',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                    }}>
                                                        {idx + 1}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(img.id)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '2px',
                                                            right: '2px',
                                                            backgroundColor: 'rgba(239,68,68,0.8)',
                                                            color: '#ffffff',
                                                            borderRadius: '50%',
                                                            width: '20px',
                                                            height: '20px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '0',
                                                            transition: 'all 0.2s',
                                                        }}
                                                        onMouseEnter={(e) => { e.target.style.backgroundColor = 'rgba(220,38,38,1)'; }}
                                                        onMouseLeave={(e) => { e.target.style.backgroundColor = 'rgba(239,68,68,0.8)'; }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <p style={{
                                            marginTop: '0.75rem',
                                            fontSize: '0.8rem',
                                            color: '#16a34a',
                                            fontWeight: '500',
                                        }}>
                                            ✅ {images.length} image(s) selected
                                        </p>
                                    </div>
                                )}
                                <p style={{
                                    marginTop: images.length > 0 ? '0rem' : '0.75rem',
                                    fontSize: '0.875rem',
                                    color: isDark ? 'rgba(230,238,248,0.6)' : '#6b7280',
                                }}>
                                    Drag & drop images or click to browse (Max {MAX_IMAGES} images)
                                </p>
                            </div>

                            {/* Basic Information */}
                            <div style={sectionBaseStyle}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: isDark ? 'var(--text)' : '#1f2937' }}>📝 Basic Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input
                                        required
                                        name="name"
                                        value={form.name}
                                        onChange={onChange}
                                        placeholder="Product Name"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="category"
                                        value={form.category}
                                        onChange={onChange}
                                        placeholder="Category"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="sub_category"
                                        value={form.sub_category}
                                        onChange={onChange}
                                        placeholder="Sub-Category"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="material"
                                        value={form.material}
                                        onChange={onChange}
                                        placeholder="Material"
                                        style={fieldBaseStyle}
                                    />
                                </div>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={onChange}
                                    placeholder="Detailed Product Description"
                                    style={{
                                        ...fieldBaseStyle,
                                        width: '100%',
                                        marginTop: '1rem',
                                        minHeight: '100px',
                                        fontFamily: 'inherit',
                                    }}
                                    rows={4}
                                />
                            </div>

                            {/* Pricing & MOQ */}
                            <div style={sectionBaseStyle}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: isDark ? 'var(--text)' : '#1f2937' }}>💰 Pricing & Quantity</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <input
                                        name="price"
                                        value={form.price}
                                        onChange={onChange}
                                        placeholder="Unit Price (USD)"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="moq"
                                        type="number"
                                        value={form.moq}
                                        onChange={onChange}
                                        placeholder="MOQ (Qty)"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="bulk_pricing"
                                        value={form.bulk_pricing}
                                        onChange={onChange}
                                        placeholder="Bulk Pricing (100+ $5)"
                                        style={fieldBaseStyle}
                                    />
                                </div>
                            </div>

                            {/* Product Features */}
                            <div style={sectionBaseStyle}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: isDark ? 'var(--text)' : '#1f2937' }}>🎨 Product Features</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input
                                        name="colors"
                                        value={form.colors}
                                        onChange={onChange}
                                        placeholder="Colors (comma separated)"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="sizes"
                                        value={form.sizes}
                                        onChange={onChange}
                                        placeholder="Sizes (comma separated)"
                                        style={fieldBaseStyle}
                                    />
                                </div>
                            </div>

                            {/* Shipping & Delivery */}
                            <div style={sectionBaseStyle}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: isDark ? 'var(--text)' : '#1f2937' }}>🚚 Shipping & Delivery</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input
                                        name="lead_time"
                                        value={form.lead_time}
                                        onChange={onChange}
                                        placeholder="Lead Time (e.g., 15-30 days)"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="shipping_terms"
                                        value={form.shipping_terms}
                                        onChange={onChange}
                                        placeholder="Shipping Terms (FOB/CIF/etc)"
                                        style={fieldBaseStyle}
                                    />
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div style={sectionBaseStyle}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: isDark ? 'var(--text)' : '#1f2937' }}>📋 Additional Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input
                                        name="warranty"
                                        value={form.warranty}
                                        onChange={onChange}
                                        placeholder="Warranty (e.g., 1 Year)"
                                        style={fieldBaseStyle}
                                    />
                                    <input
                                        name="certifications"
                                        value={form.certifications}
                                        onChange={onChange}
                                        placeholder="Certifications (CE/RoHS/etc)"
                                        style={fieldBaseStyle}
                                    />
                                </div>
                                <input
                                    name="payment_terms"
                                    value={form.payment_terms}
                                    onChange={onChange}
                                    placeholder="Payment Terms (T/T, L/C, etc)"
                                    style={{
                                        ...fieldBaseStyle,
                                        width: '100%',
                                        marginTop: '1rem',
                                    }}
                                />
                            </div>

                            {/* Specifications */}
                            <div style={sectionBaseStyle}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: isDark ? 'var(--text)' : '#1f2937' }}>⚙️ Specifications (JSON)</h3>
                                <textarea
                                    name="specifications"
                                    value={form.specifications}
                                    onChange={onChange}
                                    placeholder='{"material":"cotton","weight":"500g","length":"10cm"}'
                                    style={{
                                        ...fieldBaseStyle,
                                        width: '100%',
                                        minHeight: '80px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                    }}
                                    rows={3}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                marginTop: '2rem',
                                padding: '1.25rem',
                                borderRadius: '16px',
                                backgroundColor: isDark ? '#101a33' : '#f8fafc',
                                border: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : '#e2e8f0'}`,
                            }}>
                                <button
                                    type="submit"
                                    disabled={status.loading}
                                    className="btn btn-accent"
                                    style={{
                                        flex: 1,
                                        opacity: status.loading ? 0.6 : 1,
                                        cursor: status.loading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {editingProduct ? '✏️ Update Product' : (status.loading ? '⏳ Publishing...' : '✨ Publish Product')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFormModal(false);
                                        setEditingProduct(null);
                                        clearImages();
                                    }}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                        color: isDark ? '#e2e8f0' : '#1f2937',
                                        backgroundColor: isDark ? '#141e34' : '#ffffff',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = isDark ? '#1b2742' : '#f3f4f6';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = isDark ? '#141e34' : '#ffffff';
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>

                            {status.message && (
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
                                    color: isDark ? '#4ade80' : '#16a34a',
                                    border: `1px solid ${isDark ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.3)'}`,
                                    marginTop: '1rem',
                                }}>
                                    ✅ {status.message}
                                </div>
                            )}
                            {status.error && (
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239, 68, 68, 0.1)',
                                    color: isDark ? '#f87171' : '#dc2626',
                                    border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    marginTop: '1rem',
                                }}>
                                    ❌ {typeof status.error === 'string' ? status.error : JSON.stringify(status.error)}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerProducts;
