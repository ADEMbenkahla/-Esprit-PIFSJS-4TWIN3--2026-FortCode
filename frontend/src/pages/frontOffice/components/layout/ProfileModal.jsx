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

export function ProfileModal({ isOpen, onClose, userData, onUpdateSuccess }) {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        avatar: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userData) {
            setFormData({
                username: userData.username || "",
                email: userData.email || "",
                avatar: userData.avatar || "",
            });
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
            const token = sessionStorage.getItem("token") || localStorage.getItem("token");
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-serif text-blue-400">Update Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
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
