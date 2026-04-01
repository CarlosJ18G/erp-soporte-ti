'use client';

import { Button } from '@/components/ui/Button';
import { ArrowRight, ShieldCheck, Users, Wrench, ClipboardList, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff6ed,transparent_45%),radial-gradient(circle_at_bottom_right,#eef7ff,transparent_50%)] p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm md:p-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Soporte Técnico ERP</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Plataforma central para registrar incidencias, dar seguimiento a tickets, coordinar técnicos
            y mantener control de activos y órdenes de servicio en un solo lugar.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 inline-flex rounded-lg bg-blue-100 p-2 text-blue-700"><ClipboardList className="h-4 w-4" /></div>
              <p className="text-sm font-semibold text-slate-900">Gestión de tickets</p>
              <p className="mt-1 text-xs text-slate-600">Creación, seguimiento y resolución por prioridad y estado.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700"><Wrench className="h-4 w-4" /></div>
              <p className="text-sm font-semibold text-slate-900">Órdenes de servicio</p>
              <p className="mt-1 text-xs text-slate-600">Asignación técnica y control operativo de mantenimientos.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 inline-flex rounded-lg bg-amber-100 p-2 text-amber-700"><Cpu className="h-4 w-4" /></div>
              <p className="text-sm font-semibold text-slate-900">Inventario de activos</p>
              <p className="mt-1 text-xs text-slate-600">Trazabilidad de equipos, historial y estado por cliente.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link href="/login?role=technician" className="group">
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <ShieldCheck className="h-7 w-7 text-blue-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">Ingresar como Técnico/Administrador</h2>
              <p className="mb-6 text-slate-600">
                Gestiona tickets, técnicos, clientes, activos y flujo operativo del soporte.
              </p>
              <Button className="w-full justify-between">
                Continuar como técnico
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Link>

          <Link href="/login?role=client" className="group">
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
                <Users className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">Ingresar como Cliente</h2>
              <p className="mb-6 text-slate-600">
                Crea incidencias, consulta el estado de tus tickets y revisa tus activos registrados.
              </p>
              <Button className="w-full justify-between bg-green-600 hover:bg-green-700">
                Continuar como cliente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
