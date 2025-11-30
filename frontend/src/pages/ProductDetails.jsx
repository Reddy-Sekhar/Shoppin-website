import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { ChevronRight, Star, MessageCircle, Send, ShoppingCart, Heart, Share2 } from 'lucide-react';
import InquiryModal from '../components/InquiryModal';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImage, setActiveImage] = useState(0);
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [quantity, setQuantity] = useState(0);
    const [showInquiryModal, setShowInquiryModal] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products/${id}`);
                setProduct(data);
                if (data.colors && data.colors.length > 0) setSelectedColor(data.colors[0]);
                if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[0]);
                setQuantity(data.moq || 1);
                setLoading(false);
            } catch (err) {
                setError('Product not found');
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
    if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;
    if (!product) return null;

    // Calculate current price based on quantity
    const getCurrentPrice = (qty) => {
        const priceTiers = product.price_tiers || product.priceTiers || [];
        if (!priceTiers || priceTiers.length === 0) return 0;
        let price = priceTiers[0].price;
        for (let tier of priceTiers) {
            if (qty >= tier.minQty) {
                price = tier.price;
            }
        }
        return price;
    };

    const currentPrice = getCurrentPrice(quantity);

    const handleAuthAction = (action) => {
        if (user) {
            action();
        } else {
            navigate('/login', { state: { from: location.pathname } });
        }
    };

    const handleChatNow = () => {
        handleAuthAction(() => {
            // Default WhatsApp number (replace with actual seller number if available)
            const phoneNumber = '919876543210';
            const message = `Hi, I am interested in ${product.name}.`;
            const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        });
    };

    const handleInquiry = () => {
        handleAuthAction(() => {
            setShowInquiryModal(true);
        });
    };

    // Map color names to hex values
    const colorNameToHex = {
        red: '#EF4444',
        blue: '#3B82F6',
        green: '#10B981',
        yellow: '#FBBF24',
        purple: '#A855F7',
        pink: '#EC4899',
        orange: '#F97316',
        black: '#1F2937',
        white: '#FFFFFF',
        gray: '#6B7280',
        grey: '#6B7280',
        brown: '#92400E',
        navy: '#001F3F',
        teal: '#14B8A6',
        cyan: '#06B6D4',
        beige: '#F5DEB3',
        cream: '#FFFDD0',
        silver: '#C0C0C0',
        gold: '#FFD700',
        maroon: '#800000',
    };

    const getColorHex = (color) => {
        if (!color) return '#E5E7EB';
        // If color has hex value, use it
        if (color.hex && color.hex.trim() !== '') return color.hex;
        // Otherwise map by name
        const lowerName = (color.name || color).toLowerCase().trim();
        return colorNameToHex[lowerName] || '#E5E7EB';
    };

    return (
        <div className="bg-secondary min-h-screen pb-20 pt-0">
            {/* Breadcrumb */}
            <div className="mx-auto px-12 sm:px-16 lg:px-20 py-2">
                <div className="flex items-center text-sm text-slate-600">
                    <Link to="/" className="hover:text-accent transition-colors">Home</Link>
                    <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />
                    <Link to="/products" className="hover:text-accent transition-colors">{product.category}</Link>
                    <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />
                    <span className="text-primary font-medium">{product.sub_category || product.subCategory}</span>
                </div>
            </div>

            <div className="mx-auto px-12 sm:px-16 lg:px-20">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

                    {/* Left Column: Image Gallery */}
                    <div className="lg:col-span-6 flex flex-col-reverse lg:flex-row gap-6">
                        {/* Vertical Thumbnails */}
                        <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto lg:h-[600px] scrollbar-hide py-2 px-1">
                            {product.images.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveImage(index)}
                                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${activeImage === index
                                        ? 'border-accent ring-2 ring-accent/20'
                                        : 'border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <img src={img} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>

                        {/* Main Image */}
                        <div className="flex-1 h-[500px] lg:h-[600px] bg-gray-50 rounded-2xl overflow-hidden relative group border border-slate-100">
                            <img
                                src={product.images[activeImage]}
                                alt={product.name}
                                className="w-full h-full object-contain mix-blend-multiply p-8 transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute top-6 right-6 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button className="p-3 bg-white rounded-full shadow-md hover:bg-accent hover:text-white text-slate-400 transition-all transform hover:scale-110">
                                    <Heart className="w-5 h-5" />
                                </button>
                                <button className="p-3 bg-white rounded-full shadow-md hover:bg-accent hover:text-white text-slate-400 transition-all transform hover:scale-110">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Product Info */}
                    <div className="lg:col-span-6 flex flex-col">
                        <div className="mb-6">
                            <h1 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4 leading-tight">{product.name}</h1>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-100">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <div>
                                        <div className="text-sm font-bold text-yellow-700">4.8</div>
                                        <div className="text-xs text-yellow-600">24 Reviews</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-accent/10 px-3 py-2 rounded-lg border border-accent/30">
                                    <ShoppingCart className="w-4 h-4 text-accent" />
                                    <div>
                                        <div className="text-sm font-bold text-accent">MOQ</div>
                                        <div className="text-xs text-accent/80">{product.moq} Pieces</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Wholesale Pricing Tiers */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl mb-6 border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">💰 Wholesale Pricing</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {(product.price_tiers || product.priceTiers || []).map((tier, index) => (
                                    <div key={index} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-slate-100">
                                        <span className="text-sm text-slate-700">{tier.minQty}{tier.maxQty ? ` - ${tier.maxQty}` : '+'} Pcs</span>
                                        <div className="text-xl font-bold text-accent">${tier.price.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Configuration Options */}
                        <div className="space-y-5">

                            {/* Colors */}
                            <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                                    <span className="text-lg">🎨</span>
                                    Select Color: <span className="text-accent font-semibold">{selectedColor?.name || 'Choose'}</span>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {(product.colors || []).map((color, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all transform hover:scale-110 ${selectedColor?.name === color.name
                                                ? 'border-accent ring-2 ring-accent/30 scale-105 shadow-lg'
                                                : 'border-slate-200 hover:border-accent shadow-sm'
                                                }`}
                                            title={color.name}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-full shadow-inner"
                                                style={{ backgroundColor: getColorHex(color) }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sizes */}
                            <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                                    <span className="text-lg">📏</span>
                                    Select Size: <span className="text-accent font-semibold">{selectedSize}</span>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {(product.sizes || []).map((size, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedSize(size)}
                                            className={`min-w-max px-4 py-2 text-sm font-medium rounded-lg transition-all transform ${selectedSize === size
                                                ? 'bg-accent text-white shadow-lg scale-105 border border-accent'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:border-accent hover:text-accent shadow-sm'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Lead Time & Customization */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-2 flex items-center gap-1">
                                        <span>⏱️</span> Lead Time
                                    </span>
                                    <span className="text-lg font-bold text-blue-700">{product.lead_time || product.leadTime || 'N/A'}</span>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block mb-2 flex items-center gap-1">
                                        <span>✨</span> Customization
                                    </span>
                                    <span className="text-sm font-bold text-purple-700">{(product.customization || []).length > 0 ? 'Available' : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-4">
                            <button
                                onClick={handleChatNow}
                                className="flex-1 px-6 py-3 border-2 border-accent text-accent hover:bg-accent hover:text-white rounded-lg font-bold text-base flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-md"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Chat Now
                            </button>
                            <button
                                onClick={handleInquiry}
                                className="flex-1 sm:flex-[1.5] px-6 py-3 bg-gradient-to-r from-accent to-accent/90 text-white rounded-lg font-bold text-base flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg hover:shadow-accent/40"
                            >
                                <Send className="w-5 h-5" />
                                Send Inquiry
                            </button>
                        </div>

                        <p className="text-center text-xs text-slate-500 mt-3">
                            ✓ Secure payments • Global Shipping • Quality Guarantee
                        </p>
                    </div>
                </div>

                {/* Product Details Tabs/Section */}
                <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-12">
                        {/* Description */}
                        <section>
                            <h3 className="text-2xl font-heading font-bold text-primary mb-6">Product Description</h3>
                            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                                <p>{product.description}</p>
                            </div>
                        </section>

                        {/* Specifications */}
                        <section>
                            <h3 className="text-2xl font-heading font-bold text-primary mb-6">Specifications</h3>
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.entries(product.specifications || {}).map(([key, value], index) => (
                                            <tr key={key} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                                <td className="px-6 py-4 font-semibold text-slate-700 capitalize w-1/3">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-800">
                                                    {value}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Sidebar / Related (Placeholder) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
                            <h4 className="font-bold text-primary mb-4">Why Buy From Us?</h4>
                            <ul className="space-y-4">
                                {[
                                    { text: 'Direct Factory Prices', icon: Star },
                                    { text: 'Low MOQ (100 pcs)', icon: ShoppingCart },
                                    { text: 'Premium Quality Control', icon: Heart },
                                    { text: 'Fast Global Shipping', icon: Share2 },
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                            <item.icon size={14} />
                                        </div>
                                        {item.text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {showInquiryModal && (
                <InquiryModal
                    product={product}
                    user={user}
                    onClose={() => setShowInquiryModal(false)}
                />
            )}
        </div>
    );
};

export default ProductDetails;
