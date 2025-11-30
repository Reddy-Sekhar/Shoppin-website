import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { fetchLeads, fetchMyLeads, updateLead } from '../api';
import { Mail, Eye } from 'lucide-react';
import LeadDetailsModal from '../components/LeadDetailsModal';
import AddLeadModal from '../components/AddLeadModal';

const LeadManagement = () => {
    const { user } = useSelector((state) => state.auth);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    // cache to avoid duplicate fetches per role during the session
    const fetchedRoles = useRef({});

    const normalizeLead = (lead) => ({
        ...lead,
        id: lead?.id ?? lead?._id ?? lead?.uuid,
        productType: lead?.productType ?? lead?.product_type ?? '',
        createdAt: lead?.createdAt ?? lead?.created_at ?? null,
        quantity: lead?.quantity ?? lead?.quantity_requested ?? 0,
        budget: lead?.budget ?? lead?.target_budget ?? '',
        referenceImages: lead?.referenceImages ?? lead?.reference_images ?? [],
    });

    useEffect(() => {
        const role = user?.role;
        if (!role) {
            setLoading(false);
            return;
        }

        // Prevent duplicate fetches (React StrictMode in dev can mount/unmount twice)
        // We keep a per-role cache so we only fetch once per role during the session.
        if (fetchedRoles.current[role]) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError('');

        const loadLeads = async () => {
            try {
                const fetcher = role === 'BUYER' ? fetchMyLeads : fetchLeads;
                const { data } = await fetcher();
                if (!isMounted) return;
                const rawLeads = Array.isArray(data?.data)
                    ? data.data
                    : Array.isArray(data?.results)
                        ? data.results
                        : Array.isArray(data)
                            ? data
                            : [];
                const normalized = rawLeads.map(normalizeLead).filter((leadItem) => leadItem.id);
                setLeads(normalized);
                // mark as fetched for this role to avoid duplicate requests
                fetchedRoles.current[role] = true;
            } catch (error) {
                console.error(error);
                if (isMounted) {
                    setError('Unable to load leads at the moment. Please try again later.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadLeads();

        return () => {
            isMounted = false;
        };
    }, [user?.role]);

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateLead(id, { status: newStatus });
            setLeads((prevLeads) =>
                prevLeads.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead))
            );

            if (selectedLead && selectedLead.id === id) {
                setSelectedLead((prev) => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleLeadAdded = (newLead) => {
        const formatted = normalizeLead(newLead);
        if (!formatted.id) {
            return;
        }
        setLeads((prev) => [formatted, ...prev]);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'NEW': return 'bg-blue-100 text-blue-800';
            case 'QUALIFIED': return 'bg-purple-100 text-purple-800';
            case 'SCOPE_LOCKED': return 'bg-indigo-100 text-indigo-800';
            case 'PI_SENT': return 'bg-yellow-100 text-yellow-800';
            case 'ORDER_CONFIRMED': return 'bg-green-100 text-green-800';
            case 'LOST': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Lead Management</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                    Add New Lead
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {error ? (
                    <div className="text-center py-12 text-red-500 text-sm">{error}</div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No leads found.
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium text-gray-500 text-sm">Name</th>
                                <th className="px-6 py-4 font-medium text-gray-500 text-sm">Product</th>
                                <th className="px-6 py-4 font-medium text-gray-500 text-sm">Country</th>
                                <th className="px-6 py-4 font-medium text-gray-500 text-sm">Status</th>
                                <th className="px-6 py-4 font-medium text-gray-500 text-sm">Date</th>
                                <th className="px-6 py-4 font-medium text-gray-500 text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{lead.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center mt-1">
                                            <Mail size={12} className="mr-1" /> {lead.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="font-medium">{lead.productType || '—'}</div>
                                        <div className="text-xs text-gray-400">{lead.quantity || 0} pcs</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{lead.country}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={lead.status}
                                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer appearance-none text-center min-w-[100px] ${getStatusColor(lead.status)}`}
                                        >
                                            <option value="NEW">NEW</option>
                                            <option value="QUALIFIED">QUALIFIED</option>
                                            <option value="SCOPE_LOCKED">SCOPE LOCKED</option>
                                            <option value="PI_SENT">PI SENT</option>
                                            <option value="ORDER_CONFIRMED">ORDER CONFIRMED</option>
                                            <option value="LOST">LOST</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedLead(lead)}
                                                className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Lead Details Modal */}
            <LeadDetailsModal
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onStatusChange={handleStatusChange}
            />

            {/* Add Lead Modal */}
            {showAddModal && (
                <AddLeadModal
                    onClose={() => setShowAddModal(false)}
                    onLeadAdded={handleLeadAdded}
                />
            )}
        </div>
    );
};

export default LeadManagement;
