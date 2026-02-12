#!/usr/bin/env node

const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('%GENERATED_AT%', new Date().toLocaleString('pt-BR'));
html = html.replace(/%DATA_JSON%/g, JSON.stringify(data));

fs.writeFileSync('index.html', html);
console.log(`✅ index.html gerado • ${data.totalMarkets} mercados • ${data.categories.length} categorias`);
