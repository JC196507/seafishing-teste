window.gerarRankingLocais = function () {
    try {
        let capturas = obterCapturas();
        let rankingLocais = {};

        capturas.forEach(c => {
            const local = c.local;
            if (!rankingLocais[local]) {
                rankingLocais[local] = {
                    quantidade: 0,
                    pesoTotal: 0,
                    peixeMaisPesado: {
                        peso: 0,
                        tipoPeixe: ''
                    }
                };
            }

            rankingLocais[local].quantidade++;
            rankingLocais[local].pesoTotal += c.peso;

            if (c.peso > rankingLocais[local].peixeMaisPesado.peso) {
                rankingLocais[local].peixeMaisPesado.peso = c.peso;
                rankingLocais[local].peixeMaisPesado.tipoPeixe = c.tipoPeixe || 'N/A';
            }
        });

        let rankingArray = Object.entries(rankingLocais).map(([local, dados]) => ({
            local,
            quantidade: dados.quantidade,
            pesoTotal: dados.pesoTotal,
            peixeMaisPesado: dados.peixeMaisPesado
        }));

        rankingArray.sort((a, b) => b.quantidade - a.quantidade);

        let html = `
        <html>
        <head>
            <title>Ranking dos Spots</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; color: #000080; }
                h2 { color: #000080; }
                table { width: 85%; border-collapse: collapse; margin: 20px auto; }
                th, td { border: 1px solid black; padding: 8px; text-align: center; }
                th { background-color: #1E90FF; color: white; }
                .destaque { font-weight: bold; }
            </style>
        </head>
        <body>
            <h2>Ranking dos Spots</h2>
            <table>
                <thead>
                    <tr>
                        <th>Local</th>
                        <th>Quantidade de Peixes</th>
                        <th>Peso Total (g)</th>
                        <th>Peixe Mais Pesado</th>
                    </tr>
                </thead>
                <tbody>
                    ${rankingArray.map(item => `
                        <tr>
                            <td>${item.local}</td>
                            <td>${item.quantidade}</td>
                            <td>${item.pesoTotal.toLocaleString('pt-BR')}</td>
                            <td>${item.peixeMaisPesado.tipoPeixe} (${item.peixeMaisPesado.peso.toLocaleString('pt-BR')}g)</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Imprimir/Exportar</button>
        </body>
        </html>`;

        let novaJanela = window.open('', '_blank');
        novaJanela.document.write(html);
        novaJanela.document.close();
    } catch (error) {
        console.error("Erro ao gerar ranking de spots:", error);
        alert("Ocorreu um erro ao gerar o ranking de spots. Consulte a consola para mais detalhes.");
    }
};
