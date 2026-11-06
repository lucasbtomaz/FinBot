import type { Snapshot } from './api';

export function categories(data?: Snapshot): string[] {
  const defaults = [
    'Alimentação',
    'Moradia',
    'Transporte / Moto',
    'Saúde / Odonto',
    'Educação',
    'Lazer',
    'Assinaturas',
    'Dívidas / Empréstimos',
    'Eletrônicos / Igor',
    'Compras / Shopee',
    'Acordo / Serasa',
    'Impostos / Tributos',
    'Investimentos',
    'Outros'
  ];
  if (!data?.items) return defaults;
  const existing = Array.from(new Set(data.items.map(i => i.category).filter(Boolean)));
  return Array.from(new Set([...defaults, ...existing]));
}

export function canonicalCategory(options: string[], val: string): string {
  if (!val) return 'Outros';
  const match = options.find(o => o.toLowerCase() === val.trim().toLowerCase());
  return match || val.trim();
}

export function CategoryField({ 
  options, 
  value, 
  onChange 
}: { 
  options: string[]; 
  value: string; 
  onChange: (v: string) => void 
}) {
  return (
    <label>
      Categoria
      <input
        list="category-suggestions"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Selecione ou digite uma categoria..."
      />
      <datalist id="category-suggestions">
        {options.map(opt => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </label>
  );
}

export function IrCheck({ 
  checked, 
  onChange 
}: { 
  checked: boolean; 
  onChange: (v: boolean) => void 
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '8px 0' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Acompanhar no Imposto de Renda (IR)
      </span>
    </label>
  );
}
