export const PARENTESCO_LABELS: Record<string, string> = {
  eu: 'Eu',
  conjuge: 'Cônjuge',
  filho: 'Filho',
  filha: 'Filha',
  pai: 'Pai',
  mae: 'Mãe',
  avo: 'Avô',
  avo_f: 'Avó',
  outro: 'Outro',
};

export const TIPO_LABELS: Record<string, string> = {
  cpf: 'CPF',
  rg: 'RG',
  cnh: 'CNH',
  passaporte: 'Passaporte',
  certidao: 'Certidão',
  contrato: 'Contrato',
  exame: 'Exame',
  vacina: 'Vacina',
  documento_carro: 'Documento do carro',
  documento_imovel: 'Documento do imóvel',
  garantia_produto: 'Garantia de produto',
  boleto: 'Boleto importante',
  matricula_escolar: 'Matrícula escolar',
  outro: 'Outro',
};

export const TIPO_OPTIONS = Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label }));
export const PARENTESCO_OPTIONS = Object.entries(PARENTESCO_LABELS).map(([value, label]) => ({ value, label }));

export const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  vencendo_em_breve: 'Vencendo em breve',
  vencido: 'Vencido',
  sem_vencimento: 'Sem vencimento',
};

export const LEMBRETES_OPTIONS = [7, 15, 30, 60, 90];

export function formatDateBR(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

export function initialsFromName(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
