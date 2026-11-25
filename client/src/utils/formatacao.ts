const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatarMoeda(valor: number): string {
  // Intl usa espaço não separável entre "R$" e o número; normalizamos para espaço comum.
  return formatadorMoeda.format(valor).replace(/\s/g, ' ');
}

export function formatarDataHora(isoString: string): string {
  const data = new Date(isoString);
  if (Number.isNaN(data.getTime())) {
    return '—';
  }
  return formatadorDataHora.format(data);
}

export function idCurto(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
