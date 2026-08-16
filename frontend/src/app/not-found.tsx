import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark p-4 text-center">
      <h1 className="text-6xl font-extrabold text-primary">404</h1>
      <h2 className="mt-4 text-xl font-bold text-text">Página Não Encontrada</h2>
      <p className="mt-2 text-sm text-muted max-w-md">
        A página que procuras não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-dark hover:opacity-90 transition-opacity"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
