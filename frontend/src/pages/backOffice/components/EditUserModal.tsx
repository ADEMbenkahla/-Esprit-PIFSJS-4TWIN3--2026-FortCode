import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { User } from '../types';
import { AvatarPicker } from './AvatarPicker';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserUpdated: () => void;
    user: User | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, onUserUpdated, user }) => {
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(user?.role || 'participant');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [loading, setLoading] = useState(false);

    const handleAvatarSelect = React.useCallback((url: string) => {
        setAvatar(url);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !email) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Fields',
                text: 'Username and Email are required',
                background: '#1a1a2e',
                color: '#fff',
                confirmButtonColor: '#7c3aed'
            });
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const body: any = { username, email, role, avatar };

            // Only include password if it's provided
            if (password) {
                body.password = password;
            }

            console.log("DEBUG: Sending Update Body:", body);

            const response = await fetch(`http://localhost:5000/api/auth/admin/users/${user?._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            console.log("DEBUG: Server Response for Update:", data);

            if (!response.ok) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                    background: '#1a1a2e',
                    color: '#fff',
                    confirmButtonColor: '#d33'
                });
                setLoading(false);
                return;
            }

            Swal.fire({
                icon: 'success',
                title: 'User Updated',
                text: data.message,
                background: '#1a1a2e',
                color: '#fff',
                confirmButtonColor: '#7c3aed',
                timer: 2000,
                showConfirmButton: false
            });

            // Notify parent
            onUserUpdated();
            onClose();

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update user',
                background: '#1a1a2e',
                color: '#fff'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface-dark border border-purple-900/30 rounded-xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white font-display">Edit User <span className="text-[10px] text-primary">(DEBUG-V3)</span></h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="john_doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="user@fortcode.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Password (leave empty to keep current)</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-background-dark border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                                >
                                    <option value="participant">Participant</option>
                                    <option value="recruiter">Recruiter</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-400 mb-1">User Appearance</label>
                            <AvatarPicker
                                currentAvatar={avatar}
                                onSelect={handleAvatarSelect}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-transparent border border-purple-900/50 text-gray-400 rounded-lg hover:bg-purple-900/20 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
