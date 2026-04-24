'use client';

import { useState, useEffect } from 'react';
import { User, Lock, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { authStorage, ROLE_LABELS } from '@/lib/auth';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Section 1 : modifier le nom ─────────────────────────────── */
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  /* ── Section 2 : changer le mot de passe ─────────────────────── */
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = authStorage.getAccessToken();
        const res = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Impossible de charger le profil');
        const json = await res.json();
        const data: ProfileData = json.data ?? json;
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* Mettre à jour le nom */
  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setNameError('Le prénom et le nom sont requis.');
      return;
    }
    setNameSaving(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? 'Erreur lors de la mise à jour');
      }
      const json = await res.json();
      const updated: ProfileData = json.data ?? json;
      setProfile(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError((err as Error).message);
    } finally {
      setNameSaving(false);
    }
  };

  /* Changer le mot de passe */
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd) {
      setPwdError('Le mot de passe actuel est requis.');
      return;
    }
    if (newPwd.length < 8) {
      setPwdError('Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPwdSaving(true);
    setPwdError(null);
    setPwdSuccess(false);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(Array.isArray(json.message) ? json.message[0] : (json.message ?? 'Erreur'));
      }
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err) {
      setPwdError((err as Error).message);
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  }
  if (error || !profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error ?? 'Erreur inconnue'}
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] ?? profile.role;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      {/* Info carte */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-start gap-4">
        <div className="rounded-full bg-blue-100 p-4 flex-shrink-0">
          <User className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-gray-900">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-sm text-gray-500">{profile.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {roleLabel}
            </span>
            {profile.isActive ? (
              <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Actif
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                Inactif
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>
              <span className="font-medium text-gray-500">Membre depuis</span>
              <p>
                {new Date(profile.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Dernière connexion</span>
              <p>
                {profile.lastLoginAt
                  ? new Date(profile.lastLoginAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modifier le nom */}
      <form
        onSubmit={handleNameSave}
        className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          Informations personnelles
        </h2>

        {nameSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 flex-shrink-0" /> Profil mis à jour avec succès.
          </div>
        )}
        {nameError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {nameError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Email (non modifiable)
          </label>
          <input
            type="email"
            value={profile.email}
            readOnly
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={nameSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {nameSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Changer le mot de passe */}
      <form
        onSubmit={handlePasswordSave}
        className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Lock className="h-4 w-4 text-gray-400" />
          Changer le mot de passe
        </h2>

        {pwdSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 flex-shrink-0" /> Mot de passe changé avec succès.
          </div>
        )}
        {pwdError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {pwdError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe actuel
          </label>
          <input
            type="password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmer le nouveau mot de passe
          </label>
          <input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            autoComplete="new-password"
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              confirmPwd && confirmPwd !== newPwd ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {confirmPwd && confirmPwd !== newPwd && (
            <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pwdSaving || !currentPwd || !newPwd || newPwd !== confirmPwd}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {pwdSaving ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
        </div>
      </form>
    </div>
  );
}
