#!/usr/bin/env node

const fetch = require('node-fetch');

const GAMMA_API = 'https://gamma-api.polymarket.com';
const PAGE_SIZE = 200; // max por request

// Buscar todos os mercados ativos
async function fetchAllMarkets() {
  let allMarkets = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore && offset < 1000) { // limit para não estourar
    const url = `${GAMMA_API}/markets?limit=${PAGE_SIZE}&offset=${offset}&active=true&closed=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    
    if (data.markets && data.markets.length > 0) {
      allMarkets = allMarkets.concat(data.markets);
      offset += data.markets.length;
    } else {
      hasMore = false;
    }
  }
  
  return allMarkets;
}

// Agrupar mercados por categoria
function groupByCategory(markets) {
  const categories = {};
  
  for (const m of markets) {
    const cat = m.category || 'Outros';
    if (!categories[cat]) {
      categories[cat] = {
        name: cat,
        markets: [],
        totalVolume: 0,
        totalLiquidity: 0,
        count: 0
      };
    }
    
    const volume = parseFloat(m.volume || 0);
    const liquidity = parseFloat(m.liquidity || 0);
    const yesPrice = parseFloat(m.outcomePrices?.[0] || 0);
    const spread = Math.abs(yesPrice - 0.5) * 2;
    
    categories[cat].markets.push({
      id: m.id,
      question: m.question,
      volume,
      liquidity,
      spread,
      endDate: m.endDate,
      yesPrice,
      noPrice: parseFloat(m.outcomePrices?.[1] || 0)
    });
    categories[cat].totalVolume += volume;
    categories[cat].totalLiquidity += liquidity;
    categories[cat].count++;
  }
  
  // Para cada categoria, pegar top 10 por volume
  const result = [];
  for (const [catName, catData] of Object.entries(categories)) {
    const topMarkets = catData.markets
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
    
    // Top 1 mercado da categoria (para a tabela "todas")
    const topMarket = topMarkets[0];
    
    result.push({
      name: catName,
      marketCount: catData.count,
      totalVolume: catData.totalVolume,
      avgLiquidity: catData.totalLiquidity / catData.count,
      topMarkets,
      topMarket
    });
  }
  
  // Ordenar categorias por volume total
  result.sort((a, b) => b.totalVolume - a.totalVolume);
  
  return result;
}

async function main() {
  console.log('🏆 Buscando mercados do Polymarket...');
  
  try {
    const markets = await fetchAllMarkets();
    console.log(`📊 Total de mercados ativos: ${markets.length}`);
    
    const categories = groupByCategory(markets);
    console.log(`📈 Categorias encontradas: ${categories.length}`);
    
    const output = {
      generatedAt: new Date().toISOString(),
      totalMarkets: markets.length,
      categories,
      // Também incluir todos os mercados ordenados por volume (top 50)
      topMarketsGlobally: markets
        .map(m => ({
          id: m.id,
          question: m.question,
          category: m.category || 'Outros',
          volume: parseFloat(m.volume || 0),
          liquidity: parseFloat(m.liquidity || 0),
          yesPrice: parseFloat(m.outcomePrices?.[0] || 0),
          noPrice: parseFloat(m.outcomePrices?.[1] || 0),
          endDate: m.endDate,
          spread: Math.abs(parseFloat(m.outcomePrices?.[0] || 0) - 0.5) * 2
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 50)
    };
    
    const fs = require('fs');
    fs.writeFileSync('data.json', JSON.stringify(output, null, 2));
    console.log('✅ data.json gerado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
