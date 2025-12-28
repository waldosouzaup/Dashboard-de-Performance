
import { SaleRecord } from '../types';

const SPREADSHEET_ID = '1AJQWvfDryRJSxKXE6wKuB33JRzcAEAJb';
const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

export const fetchSalesData = async (): Promise<SaleRecord[]> => {
  try {
    const response = await fetch(SPREADSHEET_URL);
    if (!response.ok) {
      throw new Error('Falha ao buscar dados da planilha');
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
};

export const parseCSV = (csv: string): SaleRecord[] => {
  const cleanedCsv = csv.replace(/^\uFEFF/, '');
  const lines = cleanedCsv.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  // Detecta o separador (vírgula ou ponto-e-vírgula)
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
     .replace(/["']/g, "")
  );
  
  const idx = {
    data: headers.findIndex(h => h.includes('data')),
    produto: headers.findIndex(h => h.includes('produto') || h.includes('curso')),
    quantidade: headers.findIndex(h => h.includes('quantidade') || h.includes('vendas') || h.includes('qtd')),
    receita: headers.findIndex(h => h.includes('receita') || h.includes('valor') || h.includes('total')),
    origem: headers.findIndex(h => h.includes('origem') || h.includes('fonte') || h.includes('utm')),
    custo: headers.findIndex(h => h.includes('custo'))
  };

  return lines.slice(1).map(line => {
    const values = splitLine(line);
    const getVal = (i: number) => (i >= 0 && i < values.length) ? values[i] : '';

    const rawReceita = getVal(idx.receita);
    const receita = parseFloat(rawReceita.replace(/[^\d.-]/g, '').replace(',', '.')) || 0;
    
    const rawCusto = getVal(idx.custo);
    const custo = parseFloat(rawCusto.replace(/[^\d.-]/g, '').replace(',', '.')) || 0;

    return {
      data: getVal(idx.data),
      produto: getVal(idx.produto) || 'Produto Indefinido',
      quantidade_vendida: parseInt(getVal(idx.quantidade)) || 0,
      receita: receita,
      origem: getVal(idx.origem) || 'Direto',
      custo_aquisicao: custo
    } as SaleRecord;
  }).filter(record => record.produto !== 'Produto Indefinido' || record.receita > 0);
};
