
// print4.js
window.abrirRankingMaioresPeixes = function () {
    try {
        let capturas = obterCapturas();

        capturas.sort((a, b) => b.peso - a.peso);
        let maioresCapturas = capturas.slice(0, 25);
        const totalMaioresCapturas = maioresCapturas.length;

        if (totalMaioresCapturas === 0) {
            alert("Não há capturas suficientes para gerar o ranking.");
            return;
        }

        let anosTop25 = {}, mesesTop25 = {}, locaisTop25 = {}, amostrasTop25 = {};
        let pesoTotalLocalTop25 = {}, localMaisPesadoTop25 = { nome: 'N/A', pesoTotal: 0 };
        let pesoTotalMesTop25 = {}, mesMaisPesadoTop25 = { nome: 'N/A', pesoTotal: 0 };
        let pesoTotalAnoTop25 = {}, anoMaisPesadoTop25 = { valor: 'N/A', pesoTotal: 0 };

        maioresCapturas.forEach(c => {
            const dataObj = new Date(c.data);
            const ano = dataObj.getFullYear();
            const mes = dataObj.toLocaleString('pt-PT', { month: 'long' });

            anosTop25[ano] = (anosTop25[ano] || 0) + 1;
            mesesTop25[mes] = (mesesTop25[mes] || 0) + 1;
            locaisTop25[c.local] = (locaisTop25[c.local] || 0) + 1;
            amostrasTop25[c.tipoIsco] = (amostrasTop25[c.tipoIsco] || 0) + 1;

            pesoTotalLocalTop25[c.local] = (pesoTotalLocalTop25[c.local] || 0) + c.peso;
            if (pesoTotalLocalTop25[c.local] > localMaisPesadoTop25.pesoTotal) {
                localMaisPesadoTop25.pesoTotal = pesoTotalLocalTop25[c.local];
                localMaisPesadoTop25.nome = c.local;
            }

            pesoTotalMesTop25[mes] = (pesoTotalMesTop25[mes] || 0) + c.peso;
            if (pesoTotalMesTop25[mes] > mesMaisPesadoTop25.pesoTotal) {
                mesMaisPesadoTop25.pesoTotal = pesoTotalMesTop25[mes];
                mesMaisPesadoTop25.nome = mes;
            }

            pesoTotalAnoTop25[ano] = (pesoTotalAnoTop25[ano] || 0) + c.peso;
            if (pesoTotalAnoTop25[ano] > anoMaisPesadoTop25.pesoTotal) {
                anoMaisPesadoTop25.pesoTotal = pesoTotalAnoTop25[ano];
                anoMaisPesadoTop25.valor = ano;
            }
        });

        const calcularPercentagem = (contagem) => ((contagem / totalMaioresCapturas) * 100).toFixed(0) + '%';

        const anoMaisFrequente = Object.keys(anosTop25).reduce((a, b) => anosTop25[a] > anosTop25[b] ? a : b, 'N/A');
        const percAnoMaisFrequente = calcularPercentagem(anosTop25[anoMaisFrequente] || 0);
        const mesMaisFrequente = Object.keys(mesesTop25).reduce((a, b) => mesesTop25[a] > mesesTop25[b] ? a : b, 'N/A');
        const percMesMaisFrequente = calcularPercentagem(mesesTop25[mesMaisFrequente] || 0);
        const localMaisFrequente = Object.keys(locaisTop25).reduce((a, b) => locaisTop25[a] > locaisTop25[b] ? a : b, 'N/A');
        const percLocalMaisFrequente = calcularPercentagem(locaisTop25[localMaisFrequente] || 0);
        const amostraMaisFrequente = Object.keys(amostrasTop25).reduce((a, b) => amostrasTop25[a] > amostrasTop25[b] ? a : b, 'N/A');
        const percAmostraMaisFrequente = calcularPercentagem(amostrasTop25[amostraMaisFrequente] || 0);

        let html = `
        <html>
        <head>
            <title>Ranking dos 25 Maiores Peixes</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; }
                h2 { color: #000080; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f2f2f2; }
                .footer-analysis {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #000;
                    text-align: center;
                    color: #000080;
                    font-size: 0.9em;
                }
                .footer-analysis p { margin: 5px 0; }
                .destaque-total {
                    font-weight: bold;
                    text-decoration: underline;
                }
                button { margin-top: 20px; padding: 10px 20px; cursor: pointer; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            <h2>Ranking dos ${totalMaioresCapturas} Maiores Peixes</h2>
            <table>
                <thead>
                    <tr>
                        <th>Posição</th>
                        <th>Espécie</th>
                        <th>Peso (g)</th>
                        <th>Comprimento (cm)</th>
                        <th>Ano</th>
                        <th>Mês</th>
                        <th>Local</th>
                        <th>Isco/Amostra</th>
                    </tr>
                </thead>
                <tbody>
        `;

        maioresCapturas.forEach((c, i) => {
            const dataObj = new Date(c.data);
            const ano = dataObj.getFullYear();
            const mes = dataObj.toLocaleString('pt-PT', { month: 'long' });

            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${c.tipoPeixe || '-'}</td>
                    <td>${c.peso.toLocaleString('pt-BR')}</td>
                    <td>${c.tamanho}</td>
                    <td>${ano}</td>
                    <td>${mes}</td>
                    <td>${c.local}</td>
                    <td>${c.tipoIsco}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div class="footer-analysis">
                <p class="destaque-total">Total de Peixes Analisados relativamente ao Top: ${totalMaioresCapturas}</p>
                <p><strong>Ano com maiores Capturas:</strong> ${anoMaisFrequente} (${percAnoMaisFrequente})</p>
                <p><strong>Ano com Capturas Mais Pesadas:</strong> ${anoMaisPesadoTop25.valor} (${anoMaisPesadoTop25.pesoTotal.toLocaleString('pt-BR')}g)</p>
                <p><strong>Mês com maiores Capturas:</strong> ${mesMaisFrequente} (${percMesMaisFrequente})</p>
                <p><strong>Mês com Capturas Mais Pesadas:</strong> ${mesMaisPesadoTop25.nome} (${mesMaisPesadoTop25.pesoTotal.toLocaleString('pt-BR')}g)</p>
                <p><strong>Local com maiores Capturas:</strong> ${localMaisFrequente} (${percLocalMaisFrequente})</p>
                <p><strong>Local com Capturas Mais Pesadas:</strong> ${localMaisPesadoTop25.nome} (${localMaisPesadoTop25.pesoTotal.toLocaleString('pt-BR')}g)</p>
                <p><strong>Isco/Amostra mais Utilizado:</strong> ${amostraMaisFrequente} (${percAmostraMaisFrequente})</p>
            </div>
            <button onclick="window.print()">Imprimir/Exportar</button>
        </body>
        </html>
        `;

        let novaJanela = window.open('', '_blank');
        novaJanela.document.write(html);
        novaJanela.document.close();
    } catch (e) {
        console.error("Erro ao gerar ranking dos maiores peixes:", e);
        alert("Erro ao gerar o ranking. Ver consola.");
    }
};
