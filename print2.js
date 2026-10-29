
// print2.js

window.abrirResumoGeral = function () {
    try {
        let capturas = obterCapturas();
        let anos = [...new Set(capturas.map(c => c.data.substring(0, 4)))];
        anos.sort();
        let resumoPorAnoEspecie = {};
        let resumoGeral = { totalCapturas: 0, totalPeso: 0 };

        capturas.forEach(c => {
            let ano = c.data.substring(0, 4);
            let especie = c.tipoPeixe || "Indefinido";
            let chave = `${ano}__${especie}`;

            if (!resumoPorAnoEspecie[chave]) {
                resumoPorAnoEspecie[chave] = {
                    ano: ano,
                    especie: especie,
                    totalCapturas: 0,
                    totalPeso: 0,
                    peixeMaisPesado: {
                        peso: 0,
                        data: '',
                        local: '',
                        tipoPeixe: especie
                    },
                    somaTamanho: 0,
                    totalTamanho: 0,
                    meses: {},
                    locais: {},
                    amostras: {}
                };
            }

            let r = resumoPorAnoEspecie[chave];
            r.totalCapturas++;
            r.totalPeso += c.peso;

            if (c.peso > r.peixeMaisPesado.peso) {
                r.peixeMaisPesado = {
                    peso: c.peso,
                    data: c.data,
                    local: c.local,
                    tipoPeixe: c.tipoPeixe
                };
            }

            if (c.tamanho) {
                r.somaTamanho += c.tamanho;
                r.totalTamanho++;
            }

            let mes = c.data.substring(5, 7);
            r.meses[mes] = (r.meses[mes] || 0) + 1;
            r.locais[c.local] = (r.locais[c.local] || 0) + 1;
            r.amostras[c.tipoIsco] = (r.amostras[c.tipoIsco] || 0) + 1;

            resumoGeral.totalCapturas++;
            resumoGeral.totalPeso += c.peso;
        });

        function maisFrequente(obj) {
            return Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b, 'N/A');
        }

        let linhas = Object.values(resumoPorAnoEspecie).sort((a, b) => {
            if (a.ano === b.ano) return a.especie.localeCompare(b.especie);
            return a.ano.localeCompare(b.ano);
        });

        let html = `
        <html><head><title>Resumo Geral por Espécie</title>
        <style>
        body { font-family: Arial, sans-serif; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 6px; font-size: 13px; text-align: center; }
        th { background-color: #e0e0e0; }
        .ano-separador td {
            text-align: center;
            font-size: 14px;
            background-color: #cce5ff;
            font-weight: bold;
        }
        .total { font-weight: bold; background-color: #d0ffd0; }
        @media print { button { display: none; } }
        </style>
        </head><body>
        <h2>Resumo de Capturas por Espécie e Ano</h2>
        <table>
            <thead>
                <tr>
                    <th>Espécie</th>
                    <th>Total Capturas</th>
                    <th>Peso Total (g)</th>
                    <th>Mais Pesado</th>
                    <th>Média Tamanho (cm)</th>
                    <th>Mês + Capturas</th>
                    <th>Local + Capturas</th>
                    <th>Isco/Amostra + Usado</th>
                </tr>
            </thead>
            <tbody>
        `;

        let anoAtual = '';
        linhas.forEach(l => {
            if (l.ano !== anoAtual) {
                html += `<tr class="ano-separador"><td colspan="8">${l.ano}</td></tr>`;
                anoAtual = l.ano;
            }

            html += `
                <tr>
                    <td>${l.especie}</td>
                    <td>${l.totalCapturas}</td>
                    <td>${l.totalPeso.toLocaleString('pt-BR')}</td>
                    <td>${l.peixeMaisPesado.peso.toLocaleString('pt-BR')}g (${l.peixeMaisPesado.local})</td>
                    <td>${l.totalTamanho > 0 ? (l.somaTamanho / l.totalTamanho).toFixed(2) : 'N/A'}</td>
                    <td>${maisFrequente(l.meses)}</td>
                    <td>${maisFrequente(l.locais)}</td>
                    <td>${maisFrequente(l.amostras)}</td>
                </tr>
            `;
        });

        html += `
            <tr class="total">
                <td colspan="1">TOTAL GERAL</td>
                <td>${resumoGeral.totalCapturas}</td>
                <td>${resumoGeral.totalPeso.toLocaleString('pt-BR')}</td>
                <td colspan="5">—</td>
            </tr>
            </tbody>
        </table>
        <button onclick="window.print()">Imprimir</button>
        </body></html>`;

        let novaJanela = window.open('', '_blank');
        novaJanela.document.write(html);
        novaJanela.document.close();
    } catch (erro) {
        console.error("Erro ao gerar relatório por espécie:", erro);
        alert("Erro ao gerar o relatório.");
    }
};
