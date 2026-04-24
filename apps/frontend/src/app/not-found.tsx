import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-8xl font-black text-gray-200 select-none">404</p>
          <h1 className="text-2xl font-bold text-gray-900">Page introuvable</h1>
          <p className="text-sm text-gray-500">
            La page que vous cherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Tableau de bord
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Retour
          </Link>
        </div>
      </div>
    </div>
  );
}
