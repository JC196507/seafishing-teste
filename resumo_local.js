function consultarResumoPorLocal() {
    let ano = document.getElementById("anoConsulta").value;
    let capturas = obterCapturas();
    let filtradas = capturas.filter(c => c.data.startsWith(ano));
    let resumo = {}

    filtradas.forEach(c => {
        if (!resumo[c.local]) {
            resumo[c.local] = {
                totalPeso: 0,
                especies: {}
            };
        }

        resumo[c.local].totalPeso += c.peso;

        if (!resumo[c.local].especies[c.tipoPeixe]) {
            resumo[c.local].especies[c.tipoPeixe] = 0;
        }

        resumo[c.local].especies[c.tipoPeixe] += c.peso;
    });

    // Ordenar locais por peso total
    let locaisOrdenados = Object.entries(resumo).sort((a, b) => b[1].totalPeso - a[1].totalPeso);

    // Gerar tabela
    let tabelaResumo = `<table>
        <tr>
            <th>Local</th>
            <th>Espécie</th>
            <th>Peso Total da Espécie (g)</th>
            <th>Peso Total no Local (g)</th>
        </tr>`;

    locaisOrdenados.forEach(([local, dados]) => {
        let especies = Object.entries(dados.especies);
        especies.sort((a, b) => b[1] - a[1]);

        especies.forEach(([tipoPeixe, peso], index) => {
            tabelaResumo += `
                <tr>
                    <td>${index === 0 ? local : ""}</td>
                    <td>${tipoPeixe}</td>
                    <td>${peso.toLocaleString("pt-BR")}</td>
                    <td>${index === 0 ? dados.totalPeso.toLocaleString("pt-BR") : ""}</td>
                </tr>`;
        });
    });

    tabelaResumo += `</table>`;

    document.getElementById("resumoLocais").innerHTML = tabelaResumo;

}
