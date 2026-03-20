'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Asset, Client } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, assetStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, Pencil } from 'lucide-react';

const TIPOS   = ['COMPUTADORA','LAPTOP','SERVIDOR','IMPRESORA','UPS','SWITCH','ROUTER','FIREWALL','OTRO'];
const ESTADOS = ['OPERATIVO', 'EN_REPARACION', 'DADO_DE_BAJA'];
const MARCAS_POR_TIPO: Record<string, string[]> = {
  COMPUTADORA: ['DELL', 'HP', 'LENOVO', 'ASUS', 'ACER', 'APPLE', 'MSI'],
  LAPTOP: ['DELL', 'HP', 'LENOVO', 'ASUS', 'ACER', 'APPLE', 'MSI', 'SAMSUNG'],
  SERVIDOR: ['DELL_EMC', 'HPE', 'LENOVO', 'IBM', 'SUPERMICRO', 'CISCO'],
  IMPRESORA: ['HP', 'EPSON', 'BROTHER', 'CANON', 'XEROX', 'LEXMARK'],
  UPS: ['APC', 'EATON', 'TRIPP_LITE', 'FORZA', 'CDP'],
  SWITCH: ['CISCO', 'TP_LINK', 'D_LINK', 'UBIQUITI', 'HPE_ARUBA', 'MIKROTIK'],
  ROUTER: ['CISCO', 'TP_LINK', 'D_LINK', 'UBIQUITI', 'MIKROTIK', 'JUNIPER'],
  FIREWALL: ['FORTINET', 'PALO_ALTO', 'CISCO', 'SOPHOS', 'CHECK_POINT', 'SONICWALL'],
  OTRO: ['GENERICA', 'OTRA'],
};
const MODELOS_POR_TIPO_Y_MARCA: Record<string, Record<string, string[]>> = {
  COMPUTADORA: {
    DELL: ['OPTIPLEX_3000', 'OPTIPLEX_5000', 'OPTIPLEX_7000', 'OPTIPLEX_7010', 'VOSTRO_3710', 'VOSTRO_3910', 'PRECISION_3660', 'XPS_DESKTOP_8960'],
    HP: ['PRODESK_400_G7', 'PRODESK_400_G9', 'ELITEDESK_800_G6', 'ELITEDESK_800_G9', 'PAVILION_TP01', 'OMEN_25L', 'PROONE_440_G9'],
    LENOVO: ['THINKCENTRE_M70S', 'THINKCENTRE_M80S', 'THINKCENTRE_M90S', 'THINKCENTRE_NEO_50T', 'IDEACENTRE_3', 'IDEACENTRE_5', 'LEGION_T5'],
    ASUS: ['EXPERTCENTER_D5', 'EXPERTCENTER_D7', 'VIVO_PC_K3402', 'ROG_STRIX_G10'],
    ACER: ['VERITON_X', 'VERITON_M', 'ASPIRE_TC', 'NITRO_50'],
    APPLE: ['IMAC_24_M1', 'IMAC_24_M3', 'MAC_MINI_M2', 'MAC_STUDIO_M2'],
    MSI: ['PRO_DP21', 'PRO_DP130', 'MAG_INFINITE_S3', 'MPG_TRIDENT_AS'],
  },
  LAPTOP: {
    DELL: ['LATITUDE_3420', 'LATITUDE_5440', 'LATITUDE_7440', 'INSPIRON_15_3520', 'INSPIRON_14_5430', 'VOSTRO_3520', 'XPS_13_9315', 'PRECISION_3580'],
    HP: ['PROBOOK_440_G9', 'PROBOOK_440_G10', 'ELITEBOOK_840_G9', 'ELITEBOOK_840_G10', 'PAVILION_15', 'ENVY_X360_15', 'ZBOOK_POWER_G10', 'OMEN_16'],
    LENOVO: ['THINKPAD_E14', 'THINKPAD_T14', 'THINKPAD_X1_CARBON', 'IDEAPAD_3', 'IDEAPAD_5', 'YOGA_7', 'LEGION_5', 'LOQ_15'],
    ASUS: ['VIVOBOOK_15', 'ZENBOOK_14', 'EXPERTBOOK_B1', 'EXPERTBOOK_B5', 'TUF_GAMING_F15', 'ROG_ZEPHYRUS_G14'],
    ACER: ['ASPIRE_5', 'ASPIRE_7', 'SWIFT_3', 'SWIFT_GO_14', 'TRAVELMATE_P2', 'NITRO_5', 'PREDATOR_HELIOS_300'],
    APPLE: ['MACBOOK_AIR_M1', 'MACBOOK_AIR_M2', 'MACBOOK_AIR_M3', 'MACBOOK_PRO_14_M3', 'MACBOOK_PRO_16_M3'],
    MSI: ['MODERN_14', 'PRESTIGE_15', 'GF63_THIN', 'KATANA_15', 'STEALTH_14'],
    SAMSUNG: ['GALAXY_BOOK2', 'GALAXY_BOOK3', 'GALAXY_BOOK4_PRO', 'GALAXY_BOOK_ODYSSEY'],
  },
  SERVIDOR: {
    DELL_EMC: ['POWEREDGE_R250', 'POWEREDGE_R350', 'POWEREDGE_R450', 'POWEREDGE_R550', 'POWEREDGE_R650', 'POWEREDGE_R750', 'POWEREDGE_T350', 'POWEREDGE_T550'],
    HPE: ['PROLIANT_DL320', 'PROLIANT_DL360', 'PROLIANT_DL380', 'PROLIANT_DL385', 'PROLIANT_ML110', 'PROLIANT_ML350', 'PROLIANT_DL20'],
    LENOVO: ['THINKSYSTEM_SR250', 'THINKSYSTEM_SR530', 'THINKSYSTEM_SR630', 'THINKSYSTEM_SR650', 'THINKSYSTEM_ST250'],
    IBM: ['SYSTEM_X3550_M5', 'SYSTEM_X3650_M5', 'POWER_S914', 'POWER_S922', 'POWER_S924'],
    SUPERMICRO: ['SUPERSERVER_1019', 'SUPERSERVER_1029', 'SUPERSERVER_2029', 'SUPERSERVER_6029'],
    CISCO: ['UCS_C220_M6', 'UCS_C240_M6', 'UCS_B200_M6', 'UCS_X210C_M6'],
  },
  IMPRESORA: {
    HP: ['LASERJET_PRO_M404', 'LASERJET_PRO_M402', 'LASERJET_MFP_M428', 'LASERJET_MFP_M234', 'SMART_TANK_530', 'SMART_TANK_750', 'OFFICEJET_PRO_9020'],
    EPSON: ['ECOTANK_L3250', 'ECOTANK_L4260', 'ECOTANK_L5590', 'WORKFORCE_WF_2850', 'WORKFORCE_PRO_WF_4830', 'TM_T20III'],
    BROTHER: ['HL_L2370DW', 'HL_L3270CDW', 'DCP_L2550DW', 'DCP_T720DW', 'MFC_L8900CDW', 'MFC_J6945DW'],
    CANON: ['PIXMA_G3160', 'PIXMA_G6010', 'PIXMA_TR8620', 'MAXIFY_GX7010', 'IMAGECLASS_MF445DW'],
    XEROX: ['B230', 'B235', 'VERSALINK_B405', 'VERSALINK_C405', 'WORKCENTRE_6515'],
    LEXMARK: ['MB2236ADW', 'MS431DW', 'MX431ADW', 'CX431ADW', 'MX622ADE'],
  },
  UPS: {
    APC: ['BACK_UPS_700', 'BACK_UPS_1200', 'BACK_UPS_1500', 'SMART_UPS_1000', 'SMART_UPS_1500', 'SMART_UPS_2200', 'SMART_UPS_3000'],
    EATON: ['5E_850', '5E_1500', '5P_1550', '9SX_1000', '9SX_2000', '9PX_3000'],
    TRIPP_LITE: ['SMART1500LCD', 'SMART2200LCD', 'SU1500RTXL2UA', 'SMX1500LCDT'],
    FORZA: ['NT_511', 'NT_751', 'NT_1011', 'FX_1500LCD', 'SL_1011UL'],
    CDP: ['R_UPR508', 'R_UPR1008', 'R_SMART1510', 'R_SMART2010'],
  },
  SWITCH: {
    CISCO: ['CATALYST_2960X', 'CATALYST_3560CX', 'CATALYST_9200L', 'CATALYST_9300', 'CBS_250_24T', 'CBS_350_24P'],
    TP_LINK: ['TL_SG2428P', 'TL_SG3428', 'TL_SG3210XHP_M2', 'TL_SG2210MP', 'TL_SX3016F'],
    D_LINK: ['DGS_1210_28', 'DGS_1210_52', 'DGS_1510_28X', 'DGS_3630_28SC'],
    UBIQUITI: ['USW_24', 'USW_24_POE', 'USW_PRO_24_POE', 'USW_PRO_48', 'USW_ENTERPRISE_24_POE'],
    HPE_ARUBA: ['ARUBA_1930_24G', 'ARUBA_2530_24G', 'ARUBA_2540_48G', 'ARUBA_2930F_24G'],
    MIKROTIK: ['CSS326_24G_2S_RM', 'CRS326_24G_2S_IN', 'CRS328_24P_4S_RM', 'CRS354_48G_4S_2Q_RM'],
  },
  ROUTER: {
    CISCO: ['RV340', 'RV345', 'ISR_1100', 'ISR_4321', 'ISR_4331', 'ASR_1001_X'],
    TP_LINK: ['ER605', 'ER7206', 'ER8411', 'ARCHER_AX55', 'ARCHER_AX73', 'ARCHER_AXE75'],
    D_LINK: ['DIR_X1560', 'DIR_2150', 'DIR_3040', 'DWR_M960'],
    UBIQUITI: ['EDGEROUTER_X', 'EDGEROUTER_4', 'UDM_PRO', 'UDM_SE'],
    MIKROTIK: ['HAP_AC2', 'HAP_AX3', 'RB4011', 'RB5009', 'CCR1009', 'CCR2004'],
    JUNIPER: ['SRX300', 'SRX320', 'SRX340', 'MX204'],
  },
  FIREWALL: {
    FORTINET: ['FORTIGATE_40F', 'FORTIGATE_60F', 'FORTIGATE_80F', 'FORTIGATE_100F', 'FORTIGATE_200F'],
    PALO_ALTO: ['PA_220', 'PA_440', 'PA_820', 'PA_3220', 'PA_3410'],
    CISCO: ['FIREPOWER_1010', 'FIREPOWER_1120', 'FIREPOWER_1140', 'ASA_5506_X', 'ASA_5516_X'],
    SOPHOS: ['XGS_87', 'XGS_107', 'XGS_116', 'XGS_126', 'XGS_136'],
    CHECK_POINT: ['QUANTUM_1530', 'QUANTUM_1550', 'QUANTUM_1590', 'QUANTUM_6200'],
    SONICWALL: ['TZ270', 'TZ370', 'TZ470', 'NSA_2700', 'NSA_3700'],
  },
  OTRO: {
    GENERICA: ['MODELO_ESTANDAR', 'MODELO_OFICINA', 'MODELO_INDUSTRIAL', 'MODELO_BASICO', 'MODELO_AVANZADO'],
    OTRA: ['MODELO_PERSONALIZADO'],
  },
};

interface AssetForm { clienteId: string; nombre: string; tipo: string; marca: string; modelo: string; numeroSerie: string; estado: string; descripcion: string; }
const empty: AssetForm = { clienteId: '', nombre: '', tipo: 'COMPUTADORA', marca: '', modelo: '', numeroSerie: '', estado: 'OPERATIVO', descripcion: '' };

export default function AssetsPage() {
  const [assets,   setAssets]   = useState<Asset[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState<Asset | null>(null);
  const [form,     setForm]     = useState<AssetForm>(empty);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = () => Promise.all([
    api.get<Asset[]>('/assets').then(r => setAssets(r.data ?? [])),
    api.get<Client[]>('/clients').then(r => setClients(r.data ?? [])),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setOpen(true); };
  const openEdit   = (a: Asset) => {
    setEditing(a);
    setForm({ clienteId: a.clienteId, nombre: a.nombre, tipo: a.tipo, marca: a.marca ?? '', modelo: a.modelo ?? '', numeroSerie: a.numeroSerie ?? '', estado: a.estado, descripcion: a.descripcion ?? '' });
    setError(''); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/assets/${editing.id}`, form);
      else         await api.post('/assets', form);
      await load(); setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const f = (k: keyof AssetForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const onTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value;
    setForm((prev) => ({ ...prev, tipo, marca: '', modelo: '' }));
  };

  const marcasDisponibles = MARCAS_POR_TIPO[form.tipo] ?? [];
  const marcaKey = form.marca.trim().toUpperCase().replace(/\s+/g, '_');
  const modelosDisponibles = MODELOS_POR_TIPO_Y_MARCA[form.tipo]?.[marcaKey] ?? [];

  const clientName = (id: string) => {
    const c = clients.find(c => c.id === id);
    return c ? `${c.nombre} ${c.apellido}` : id;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{assets.length} activo(s)</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo activo</Button>
      </div>

      {assets.length === 0 ? (
        <EmptyState title="Sin activos" action={<Button size="sm" onClick={openCreate}>Agregar</Button>} />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Serie</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Marca / Modelo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Creado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{a.nombre}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{a.numeroSerie ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-700">{fmt(a.tipo)}</td>
                  <td className="px-5 py-3 text-gray-700">{a.marca} {a.modelo ? `/ ${a.modelo}` : ''}</td>
                  <td className="px-5 py-3"><Badge variant={assetStatusVariant(a.estado)}>{fmt(a.estado)}</Badge></td>
                  <td className="px-5 py-3 text-gray-500">{clientName(a.clienteId)}</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(a.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => openEdit(a)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar activo' : 'Nuevo activo'} maxWidth="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Cliente *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.clienteId} onChange={f('clienteId')} required>
              <option value="">Seleccionar...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          <Input label="Nombre del equipo *" value={form.nombre} onChange={f('nombre')} required />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tipo *</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tipo} onChange={onTipoChange}>
                {TIPOS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.estado} onChange={f('estado')}>
                {ESTADOS.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Marca *</label>
              <input
                list="asset-brand-options"
                type="text"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={form.marca}
                onChange={(e) => setForm((prev) => ({ ...prev, marca: e.target.value, modelo: '' }))}
                placeholder="Escribe o selecciona una marca"
                required
              />
              <datalist id="asset-brand-options">
                {marcasDisponibles.map((m) => <option key={m} value={fmt(m)} />)}
              </datalist>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Modelo</label>
              <input
                list="asset-model-options"
                type="text"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={form.modelo}
                onChange={f('modelo')}
                placeholder="Escribe o selecciona un modelo"
              />
              <datalist id="asset-model-options">
                {modelosDisponibles.map((m) => <option key={m} value={fmt(m)} />)}
              </datalist>
            </div>
          </div>
          <Input label="Numero de serie *" value={form.numeroSerie} onChange={f('numeroSerie')} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" rows={2} value={form.descripcion} onChange={f('descripcion')} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
