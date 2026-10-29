window.imprimirCapturas = function mostrarAnaliseGlobal() {
    try {
        let ano = document.getElementById("anoConsulta").value;
        let capturas = obterCapturas();
        let filtradas = capturas.filter(c => c.data.startsWith(ano));
        let total = filtradas.length;

        if (total === 0) {
            document.getElementById("analiseGlobal").innerHTML = "<p>Não há capturas registadas para o ano selecionado.</p>";
            return;
        }

        const contarECalcular = (campo) => {
            let mapa = {};
            filtradas.forEach(c => {
                let valor = c[campo] || "Indefinido";
                mapa[valor] = (mapa[valor] || 0) + 1;
            });
            return Object.entries(mapa)
                .map(([chave, valor]) => ({
                    chave,
                    quantidade: valor,
                    percentagem: ((valor / total) * 100).toFixed(1) + "%"
                }))
                .sort((a, b) => b.quantidade - a.quantidade);
        };

        const tabelar = (titulo, dados) => `
            <h3>${titulo}</h3>
            <table>
                <thead><tr><th>Item</th><th>Quantidade</th><th>%</th></tr></thead>
                <tbody>
                    ${dados.map(d => `
                        <tr>
                            <td>${d.chave}</td>
                            <td>${d.quantidade}</td>
                            <td>${d.percentagem}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

        const analiseHTML = `
            <h2>Análise Global de Capturas - ${ano}</h2>
            <p>Total de capturas: <strong>${total}</strong></p>
            ${tabelar("1. Tipos de Peixe Pescado", contarECalcular("tipoPeixe"))}
            ${tabelar("2. Tipos de Pesca", contarECalcular("tipoPesca"))}
            ${tabelar("3. Iscos Mais Utilizados", contarECalcular("tipoIsco"))}
            ${tabelar("4. Marés com Mais Capturas", contarECalcular("mare"))}
            ${tabelar("5. Fases da Lua", contarECalcular("lua"))}
            ${tabelar("6. Períodos do Dia", contarECalcular("periodoDia"))}
        `;

        document.getElementById("analiseGlobal").innerHTML = analiseHTML;

    } catch (error) {
        console.error("Erro na análise global:", error);
        alert("Erro ao gerar análise. Verifique a consola.");
    }
};
window.limparAnaliseGlobal = function () {
    const div = document.getElementById("analiseGlobal");
    if (div) div.innerHTML = "";
}