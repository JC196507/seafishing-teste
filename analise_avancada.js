// analise_avancada.js
// Análises mais profissionais: gráficos, cruzamento maré×período, comparação
// entre anos, e estatísticas (média/mediana) por espécie.
// Tudo calculado a partir dos mesmos dados já guardados em obterCapturas().

// ===== Utilitários =====
function obterCapturasAA() {
    return obterCapturas();
}

function mediaAA(valores) {
    if (!valores.length) return 0;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function medianaAA(valores) {
    if (!valores.length) return 0;
    let ordenado = [...valores].sort((a, b) => a - b);
    let meio = Math.floor(ordenado.length / 2);
    return ordenado.length % 2 !== 0 ? ordenado[meio] : (ordenado[meio - 1] + ordenado[meio]) / 2;
}

function formatarPesoAA(gramas) {
    return (gramas / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 2 }) + ' kg';
}

// Guarda instâncias de gráficos activos para os destruir antes de redesenhar
// (o Chart.js dá erro/duplica se desenharmos outra vez em cima sem destruir o anterior)
let graficosAA = {};

function destruirGraficoAA(id) {
    if (graficosAA[id]) {
        graficosAA[id].destroy();
        delete graficosAA[id];
    }
}

function semDadosAA() {
    exibirMensagem('error', 'Ainda não há capturas registadas para analisar.');
}

// ===== 1. Evolução mensal (peso total + nº de capturas) =====
function gerarGraficoEvolucao() {
    let capturas = obterCapturasAA();
    if (!capturas.length) { semDadosAA(); return; }

    let porMes = {};
    capturas.forEach(c => {
        let mes = c.data ? c.data.slice(0, 7) : 'Sem data'; // "AAAA-MM"
        if (!porMes[mes]) porMes[mes] = { peso: 0, quantidade: 0 };
        porMes[mes].peso += c.peso;
        porMes[mes].quantidade += 1;
    });

    let meses = Object.keys(porMes).sort();
    let pesos = meses.map(m => +(porMes[m].peso / 1000).toFixed(2));
    let quantidades = meses.map(m => porMes[m].quantidade);

    destruirGraficoAA('evolucao');
    let ctx = document.getElementById('graficoEvolucao').getContext('2d');
    graficosAA['evolucao'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Peso total (kg)',
                    data: pesos,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0,102,204,0.15)',
                    yAxisID: 'y',
                    tension: 0.25,
                    fill: true
                },
                {
                    label: 'Nº de capturas',
                    data: quantidades,
                    borderColor: '#e67e22',
                    backgroundColor: 'rgba(230,126,34,0.15)',
                    yAxisID: 'y1',
                    tension: 0.25
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { type: 'linear', position: 'left', title: { display: true, text: 'kg' } },
                y1: { type: 'linear', position: 'right', title: { display: true, text: 'nº capturas' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

// ===== 2. Peso total por espécie =====
function gerarGraficoEspecies() {
    let capturas = obterCapturasAA();
    if (!capturas.length) { semDadosAA(); return; }

    let porEspecie = {};
    capturas.forEach(c => {
        porEspecie[c.tipoPeixe] = (porEspecie[c.tipoPeixe] || 0) + c.peso;
    });
    let entradas = Object.entries(porEspecie).sort((a, b) => b[1] - a[1]);

    destruirGraficoAA('especies');
    let ctx = document.getElementById('graficoEspecies').getContext('2d');
    graficosAA['especies'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: entradas.map(e => e[0]),
            datasets: [{ label: 'Peso total (kg)', data: entradas.map(e => +(e[1] / 1000).toFixed(2)), backgroundColor: '#0066cc' }]
        },
        options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

// ===== 3. Distribuição por maré, lua e período do dia =====
function gerarGraficosDistribuicao() {
    let capturas = obterCapturasAA();
    if (!capturas.length) { semDadosAA(); return; }

    function contarPor(campo) {
        let contagem = {};
        capturas.forEach(c => {
            let chave = c[campo] || 'N/D';
            contagem[chave] = (contagem[chave] || 0) + 1;
        });
        return contagem;
    }

    function desenhar(idCanvas, dados, cores) {
        destruirGraficoAA(idCanvas);
        let ctx = document.getElementById(idCanvas).getContext('2d');
        graficosAA[idCanvas] = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: Object.keys(dados), datasets: [{ data: Object.values(dados), backgroundColor: cores }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    desenhar('graficoMare', contarPor('mare'), ['#0066cc', '#3399ff', '#66b3ff', '#99ccff']);
    desenhar('graficoLua', contarPor('lua'), ['#2c3e50', '#7f8c8d', '#bdc3c7', '#34495e']);
    desenhar('graficoPeriodo', contarPor('periodoDia'), ['#e67e22', '#f39c12', '#f1c40f', '#d35400', '#c0392b']);
}

// ===== 4. Cruzamento Maré × Período do dia =====
function gerarCruzamentoMarePeriodo() {
    let capturas = obterCapturasAA();
    if (!capturas.length) { semDadosAA(); return; }

    let mares = ['Vazante', 'BM', 'Enchente', 'PM'];
    let nomesMares = { Vazante: 'Vazante', BM: 'Baixa-mar', Enchente: 'Enchente', PM: 'Preia-mar' };
    let periodos = ['Amanhecer', 'Manha', 'Tarde', 'Escurecer', 'Noite'];

    let matriz = {};
    mares.forEach(m => {
        matriz[m] = {};
        periodos.forEach(p => { matriz[m][p] = { quantidade: 0, pesoTotal: 0 }; });
    });

    let ignoradas = 0;
    capturas.forEach(c => {
        if (matriz[c.mare] && matriz[c.mare][c.periodoDia]) {
            matriz[c.mare][c.periodoDia].quantidade++;
            matriz[c.mare][c.periodoDia].pesoTotal += c.peso;
        } else {
            ignoradas++;
        }
    });

    let html = `<table><tr><th>Maré \\ Período</th>${periodos.map(p => `<th>${p}</th>`).join('')}</tr>`;
    mares.forEach(m => {
        html += `<tr><td><strong>${nomesMares[m]}</strong></td>`;
        periodos.forEach(p => {
            let cel = matriz[m][p];
            html += cel.quantidade === 0
                ? `<td>—</td>`
                : `<td>${cel.quantidade} capturas<br><small>${(cel.pesoTotal / cel.quantidade / 1000).toFixed(2)} kg médio</small></td>`;
        });
        html += `</tr>`;
    });
    html += `</table>`;
    if (ignoradas > 0) {
        html += `<p><small>${ignoradas} captura(s) sem maré e/ou período do dia preenchidos não entraram nesta análise.</small></p>`;
    }

    document.getElementById('cruzamentoMarePeriodo').innerHTML = html;
}

// ===== 5. Comparar dois anos =====
function preencherAnosComparacao() {
    let capturas = obterCapturasAA();
    let anos = [...new Set(capturas.map(c => c.data ? c.data.slice(0, 4) : null).filter(Boolean))].sort();
    ['anoComparar1', 'anoComparar2'].forEach(id => {
        let select = document.getElementById(id);
        if (!select) return;
        let atual = select.value;
        select.innerHTML = '<option value="">Seleccione o ano</option>' + anos.map(a => `<option value="${a}">${a}</option>`).join('');
        if (anos.includes(atual)) select.value = atual;
    });
}

function compararAnos() {
    let ano1 = document.getElementById('anoComparar1').value;
    let ano2 = document.getElementById('anoComparar2').value;
    if (!ano1 || !ano2) { exibirMensagem('error', 'Escolhe os dois anos a comparar.'); return; }
    if (ano1 === ano2) { exibirMensagem('error', 'Escolhe dois anos diferentes.'); return; }

    let capturas = obterCapturasAA();

    function statsAno(ano) {
        let doAno = capturas.filter(c => c.data && c.data.startsWith(ano));
        let pesos = doAno.map(c => c.peso);
        let tamanhos = doAno.map(c => c.tamanho);
        let maior = doAno.reduce((max, c) => (!max || c.peso > max.peso ? c : max), null);
        return {
            quantidade: doAno.length,
            pesoTotal: pesos.reduce((a, b) => a + b, 0),
            pesoMedio: mediaAA(pesos),
            tamanhoMedio: mediaAA(tamanhos),
            maior,
            especiesDiferentes: new Set(doAno.map(c => c.tipoPeixe)).size
        };
    }

    let s1 = statsAno(ano1);
    let s2 = statsAno(ano2);
    let linha = (label, v1, v2) => `<tr><td>${label}</td><td>${v1}</td><td>${v2}</td></tr>`;

    document.getElementById('comparacaoAnos').innerHTML = `<table>
        <tr><th></th><th>${ano1}</th><th>${ano2}</th></tr>
        ${linha('Nº de capturas', s1.quantidade, s2.quantidade)}
        ${linha('Peso total', formatarPesoAA(s1.pesoTotal), formatarPesoAA(s2.pesoTotal))}
        ${linha('Peso médio', formatarPesoAA(s1.pesoMedio), formatarPesoAA(s2.pesoMedio))}
        ${linha('Tamanho médio', s1.tamanhoMedio.toFixed(1) + ' cm', s2.tamanhoMedio.toFixed(1) + ' cm')}
        ${linha('Espécies diferentes', s1.especiesDiferentes, s2.especiesDiferentes)}
        ${linha('Maior peixe', s1.maior ? `${s1.maior.tipoPeixe} (${formatarPesoAA(s1.maior.peso)})` : '—', s2.maior ? `${s2.maior.tipoPeixe} (${formatarPesoAA(s2.maior.peso)})` : '—')}
    </table>`;
}

// ===== 6. Estatísticas por espécie: média e mediana =====
function gerarEstatisticasEspecie() {
    let capturas = obterCapturasAA();
    if (!capturas.length) { semDadosAA(); return; }

    let porEspecie = {};
    capturas.forEach(c => {
        if (!porEspecie[c.tipoPeixe]) porEspecie[c.tipoPeixe] = { pesos: [], tamanhos: [] };
        porEspecie[c.tipoPeixe].pesos.push(c.peso);
        porEspecie[c.tipoPeixe].tamanhos.push(c.tamanho);
    });

    let linhas = Object.entries(porEspecie).map(([especie, dados]) => ({
        especie,
        quantidade: dados.pesos.length,
        pesoTotal: dados.pesos.reduce((a, b) => a + b, 0),
        pesoMedio: mediaAA(dados.pesos),
        pesoMediano: medianaAA(dados.pesos),
        tamanhoMedio: mediaAA(dados.tamanhos)
    })).sort((a, b) => b.pesoTotal - a.pesoTotal);

    document.getElementById('estatisticasEspecie').innerHTML = `<table>
        <tr><th>Espécie</th><th>Nº Capturas</th><th>Peso Total</th><th>Peso Médio</th><th>Peso Mediano</th><th>Tamanho Médio</th></tr>
        ${linhas.map(l => `<tr>
            <td>${l.especie}</td>
            <td>${l.quantidade}</td>
            <td>${formatarPesoAA(l.pesoTotal)}</td>
            <td>${formatarPesoAA(l.pesoMedio)}</td>
            <td>${formatarPesoAA(l.pesoMediano)}</td>
            <td>${l.tamanhoMedio.toFixed(1)} cm</td>
        </tr>`).join('')}
    </table>`;
}

// ===== Limpar tudo =====
function limparAnaliseAvancada() {
    ['evolucao', 'especies', 'graficoMare', 'graficoLua', 'graficoPeriodo'].forEach(destruirGraficoAA);
    document.getElementById('cruzamentoMarePeriodo').innerHTML = '';
    document.getElementById('comparacaoAnos').innerHTML = '';
    document.getElementById('estatisticasEspecie').innerHTML = '';
}
