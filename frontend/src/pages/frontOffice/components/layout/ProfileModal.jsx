import React, { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/Button";
import Swal from "sweetalert2";
import { AvatarPicker } from "./AvatarPicker";
import { Briefcase, Video, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";
import { getMyVirtualRoomRequest, deleteMyAccount } from "../../../../services/api";

export function ProfileModal({ isOpen, onClose, userData, onUpdateSuccess }) {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        avatar: "",
    });
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ email: "", password: "", phrase: "" });
    const [virtualRoomStatus, setVirtualRoomStatus] = useState(null);

    useEffect(() => {
        if (userData) {
            setFormData({
                username: userData.username || "",
                email: userData.email || "",
                avatar: userData.avatar || "",
            });

            // Fetch virtual room status for recruiters
            if (userData.role === "recruiter" && isOpen) {
                getMyVirtualRoomRequest()
                    .then(response => setVirtualRoomStatus(response.data.request))
                    .catch(() => setVirtualRoomStatus(null));
            }
        }
        if (!isOpen) {
            setShowDeleteConfirm(false);
            setDeleteConfirm({ email: "", password: "", phrase: "" });
        }
    }, [userData, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarSelect = useCallback((url) => {
        setFormData(prev => ({ ...prev, avatar: url }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:5000/api/auth/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    username: formData.username,
                    avatar: formData.avatar,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                Swal.fire({
                    icon: "success",
                    title: "Profile Updated",
                    text: "Your profile has been updated successfully!",
                    background: "#1a1a2e",
                    color: "#fff",
                    timer: 2000,
                    showConfirmButton: false,
                });
                onUpdateSuccess(data.user);
                onClose();
            } else {
                const errorData = await response.json();
                Swal.fire({
                    icon: "error",
                    title: "Update Failed",
                    text: errorData.message || "Something went wrong",
                    background: "#1a1a2e",
                    color: "#fff",
                });
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Could not connect to the server",
                background: "#1a1a2e",
                color: "#fff",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfirmChange = (e) => {
        const { name, value } = e.target;
        setDeleteConfirm((prev) => ({ ...prev, [name]: value }));
    };

    const handleDeleteAccountSubmit = async () => {
        const { email, password, phrase } = deleteConfirm;
        if (!email?.trim()) {
            Swal.fire({ icon: "error", title: "Required", text: "Enter your email.", background: "#1a1a2e", color: "#fff" });
            return;
        }
        const hasPassword = userData?.hasPassword === true;
        if (hasPassword && !password) {
            Swal.fire({ icon: "error", title: "Required", text: "Enter your password.", background: "#1a1a2e", color: "#fff" });
            return;
        }
        if (!hasPassword && phrase?.trim() !== "DELETE MY ACCOUNT") {
            Swal.fire({ icon: "error", title: "Required", text: 'Type exactly "DELETE MY ACCOUNT" to confirm (you signed up with Google).', background: "#1a1a2e", color: "#fff" });
            return;
        }

        setDeleting(true);
        try {
            await deleteMyAccount({
                email: email.trim(),
                ...(hasPassword ? { password } : { confirmationPhrase: phrase?.trim() }),
            });
            localStorage.removeItem("token");
            Swal.fire({
                icon: "success",
                title: "Account deleted",
                text: "Your account has been deleted. Redirecting to login.",
                background: "#1a1a2e",
                color: "#fff",
                timer: 2000,
                showConfirmButton: false,
            }).then(() => {
                window.location.href = "/";
            });
        } catch (err) {
            setDeleting(false);
            Swal.fire({
                icon: "error",
                title: "Could not delete account",
                text: err.response?.data?.message || "Something went wrong.",
                background: "#1a1a2e",
                color: "#fff",
            });
        }
    };

    const cancelDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setDeleteConfirm({ email: "", password: "", phrase: "" });
    };

    const getStatusBadge = () => {
        if (!virtualRoomStatus) return null;
        const status = virtualRoomStatus.status;
        const colors = {
            approved: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
            pending: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
            rejected: 'bg-red-500/10 border-red-500/30 text-red-300'
        };
        const icons = {
            approved: <CheckCircle className="w-4 h-4" />,
            pending: <Clock className="w-4 h-4" />,
            rejected: <XCircle className="w-4 h-4" />
        };
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors[status] || 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {icons[status]}
                <span className="text-xs font-semibold capitalize">{status}</span>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className={`text-xl font-serif ${userData?.role === "recruiter" ? "text-amber-400" : "text-blue-400"}`}>
                            Update Profile
                        </DialogTitle>
                        {userData?.role === "recruiter" && (
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-400 uppercase">Recruiter</span>
                            </div>
                        )}
                    </div>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* Recruiter Virtual Room Status Section */}
                    {userData?.role === "recruiter" && (
                        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Video className="w-5 h-5 text-amber-400" />
                                    <span className="text-sm font-semibold text-slate-200">Virtual Room Status</span>
                                </div>
                                {getStatusBadge()}
                            </div>
                            {virtualRoomStatus ? (
                                <p className="text-xs text-slate-400">
                                    {virtualRoomStatus.status === 'approved' && virtualRoomStatus.roomLink
                                        ? `Room Link: ${virtualRoomStatus.roomLink}`
                                        : virtualRoomStatus.status === 'pending'
                                        ? 'Your request is being reviewed by admin'
                                        : virtualRoomStatus.status === 'rejected'
                                        ? 'Request was rejected. Check your profile for details.'
                                        : 'No active request'}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500">No virtual room request yet. Use the profile dropdown to request one.</p>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-300">Username</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter username"
                                    className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Email (Read-only)</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    className="bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                    readOnly
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-slate-300 block">Avatar Selection</Label>
                            <AvatarPicker
                                currentAvatar={formData.avatar}
                                onSelect={handleAvatarSelect}
                            />
                        </div>
                    </div>

                    {/* Delete account — participants only */}
                    {userData?.role === "participant" && (
                        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Trash2 className="w-5 h-5 text-red-400" />
                                <span className="text-sm font-semibold text-red-300">Danger zone</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                                Permanently delete your account and all associated data. This cannot be undone.
                            </p>
                            {!showDeleteConfirm ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={loading}
                                    className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-500/50"
                                >
                                    Delete my account
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="delete-email" className="text-slate-300 text-xs">Confirm your email</Label>
                                        <Input
                                            id="delete-email"
                                            name="email"
                                            type="email"
                                            value={deleteConfirm.email}
                                            onChange={handleDeleteConfirmChange}
                                            placeholder="your@email.com"
                                            className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-red-500"
                                            autoComplete="email"
                                        />
                                    </div>
                                    {userData?.hasPassword ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="delete-password" className="text-slate-300 text-xs">Confirm your password</Label>
                                            <Input
                                                id="delete-password"
                                                name="password"
                                                type="password"
                                                value={deleteConfirm.password}
                                                onChange={handleDeleteConfirmChange}
                                                placeholder="••••••••"
                                                className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-red-500"
                                                autoComplete="current-password"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label htmlFor="delete-phrase" className="text-slate-300 text-xs">Type exactly: DELETE MY ACCOUNT</Label>
                                            <Input
                                                id="delete-phrase"
                                                name="phrase"
                                                type="text"
                                                value={deleteConfirm.phrase}
                                                onChange={handleDeleteConfirmChange}
                                                placeholder="DELETE MY ACCOUNT"
                                                className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-red-500 font-mono"
                                            />
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-1">
                                        <Button type="button" variant="secondary" onClick={cancelDeleteConfirm} disabled={deleting}>
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            disabled={deleting}
                                            onClick={handleDeleteAccountSubmit}
                                            className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-500/50"
                                        >
                                            {deleting ? "Deleting…" : "Confirm deletion"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-4 border-t border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading} className="w-32">
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
