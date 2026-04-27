import React, { useRef, useState } from "react";
import { authApi, uploadApi } from "@ronbri/api-client";
import { useAuth } from "../contexts/AuthContext";

const ProfilePage: React.FC = () => {
  const { user, setCurrentUser } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const { url } = await uploadApi.image(file);
      const updatedUser = await authApi.updateAvatar(url);
      setCurrentUser(updatedUser);
    } catch {
      setError("Could not update your profile photo. Try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur rounded-[2rem] shadow-xl border border-white/60 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {user.avatar ? (
              <img src={user.avatar} alt={user.displayName} className="w-28 h-28 rounded-[2rem] object-cover shadow-md border border-gray-100" />
            ) : (
              <div className="w-28 h-28 rounded-[2rem] bg-[var(--color-light)] text-[var(--color-accent)] flex items-center justify-center text-4xl font-black shadow-md">
                {user.displayName.charAt(0)}
              </div>
            )}

            <div className="flex-1">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400 font-bold">Profile</p>
              <h1 className="text-4xl font-black text-gray-800 mt-2">{user.displayName}</h1>
              <p className="text-gray-500 mt-2">This is your cute little identity card inside RonBri.</p>

              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-5 py-3 rounded-2xl bg-[var(--color-primary)] text-white font-black disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload Profile Photo"}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-8 md:p-10">
          <div className="rounded-3xl bg-gray-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 font-bold">Username</p>
            <p className="mt-2 text-lg font-bold text-gray-800">{user.username}</p>
          </div>
          <div className="rounded-3xl bg-gray-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 font-bold">Role</p>
            <p className="mt-2 text-lg font-bold text-gray-800">{user.role === "BOY" ? "Ron Ron 💙" : "BriBri 💛"}</p>
          </div>
          <div className="rounded-3xl bg-gray-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 font-bold">Theme</p>
            <p className="mt-2 text-lg font-bold text-gray-800 capitalize">{user.theme}</p>
          </div>
          <div className="rounded-3xl bg-gray-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 font-bold">Joined</p>
            <p className="mt-2 text-lg font-bold text-gray-800">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;