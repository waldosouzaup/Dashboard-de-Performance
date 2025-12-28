import { SaleRecord } from '../types';

const SPREADSHEET_ID = '1AJQWvfDryRJSxKXE6wKuB33JRzcAEAJb';
const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

export const fetchSalesData = async (): Promise<SaleRecord[]> => {
  try {
    const response = await fetch(SPREADSHEET_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Falha ao sincronizar com Google Sheets:', error);
    // Retorna array vazio em caso de erro para não quebrar a UI
    return [];
  }
};

export const parseCSV = (csv: string): SaleRecord[] => {
  if (!csv || csv.trim() === '') return [];
  
  const cleanedCsv = csv.replace(/^\uFEFF/, '');
  const lines = cleanedCsv.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  // Detector de separador inteligente
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';

  const splitLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map(h => 
    h.toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/[^a-z0-9_]/g, "_") // Garante chaves limpas para mapeamento
  );
  
  const idx = {
    data: headers.findIndex(h => h.includes('data')),
    produto: headers.findIndex(h => h.includes('produto') || h.includes('curso') || h.includes('item')),
    quantidade: headers.findIndex(h => h.includes('quantidade') || h.includes('vendas') || h.includes('qtd')),
    receita: headers.findIndex(h => h.includes('receita') || h.includes('valor') || h.includes('total') || h.includes('faturamento')),
    origem: headers.findIndex(h => h.includes('origem') || h.includes('fonte') || h.includes('utm') || h.includes('canal')),
    custo: headers.findIndex(h => h.includes('custo') || h.includes('investimento'))
  };

  return lines.slice(1).map(line => {
    const values = splitLine(line);
    const getVal = (i: number) => (i >= 0 && i < values.length) ? values[i] : '';

    // Parsing robusto de números (trata 1.000,50 e 1000.50)
    const parseNumber = (val: string) => {
      if (!val) return 0;
      const normalized = val.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
      return parseFloat(normalized) || 0;
    };

    const receita = parseNumber(getVal(idx.receita));
    const custo = parseNumber(getVal(idx.custo));
    const quantidade = parseInt(getVal(idx.quantidade).replace(/[^\d]/g, '')) || 0;

    return {
      data: getVal(idx.data),
      produto: getVal(idx.produto) || 'Produto Indefinido',
      quantidade_vendida: quantidade,
      receita: receita,
      origem: getVal(idx.origem) || 'Direto',
      custo_aquisicao: custo
    } as SaleRecord;
  }).filter(record => record.receita > 0 || record.quantidade_vendida > 0);
};