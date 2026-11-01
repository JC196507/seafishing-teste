// relatorios.js
// Relatórios pensados para o ecrã do telemóvel: aparecem DENTRO da app, como listas
// de cartões com letra grande (em vez de janelas novas com tabelas de 8 colunas).
// As contas seguem as mesmas regras dos relatórios antigos; só a apresentação mudou.
// O botão "Imprimir / Guardar PDF" usa um formato próprio para papel (ver print.css).

const REL_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const REL_MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ===== Funções de apoio (puras) =====

// Gramas com separador de milhares, como nos relatórios antigos (1.500)
function relGramas(gramas) {
    return (Number(gramas) || 0).toLocaleString("pt-BR");
}

function relNomeMes(mm) {
    return REL_MESES[Number(mm) - 1] || String(mm);
}

// Mês abreviado para caber nas tabelas do telemóvel ("Set")
function relMesCurto(mm) {
    return REL_MESES_CURTO[Number(mm) - 1] || String(mm);
}

// Mais frequente de um objeto { chave: contagem }. Em empate fica a última chave
// (mesma regra dos relatórios antigos). Devolve null se estiver vazio.
function relMaisFrequente(obj) {
    let chaves = Object.keys(obj);
    if (!chaves.length) return null;
    let k = chaves.reduce((a, b) => obj[a] > obj[b] ? a : b);
    return { chave: k, n: obj[k] };
}

// ===== 1. Resumo por espécie e ano (antigo "Análise geral capturas-anos") =====

function relResumoAnoEspecie(capturas) {
    let porChave = {};
    let total = { n: 0, peso: 0 };

    capturas.forEach(c => {
        let ano = c.data.substring(0, 4);
        let especie = c.tipoPeixe || "Indefinido";
        let chave = ano + "__" + especie;
        let r = porChave[chave];
        if (!r) {
            r = porChave[chave] = {
                ano, especie, n: 0, peso: 0,
                maior: { peso: 0, data: "", local: "" },
                somaTamanho: 0, nTamanho: 0, meses: {}, locais: {}, iscos: {}
            };
        }
        r.n++;
        r.peso += c.peso;
        if (c.peso > r.maior.peso) r.maior = { peso: c.peso, data: c.data, local: c.local };
        if (c.tamanho) { r.somaTamanho += c.tamanho; r.nTamanho++; }
        let mes = c.data.substring(5, 7);
        r.meses[mes] = (r.meses[mes] || 0) + 1;
        r.locais[c.local] = (r.locais[c.local] || 0) + 1;
        r.iscos[c.tipoIsco] = (r.iscos[c.tipoIsco] || 0) + 1;
        total.n++;
        total.peso += c.peso;
    });

    let linhas = Object.values(porChave).sort((a, b) =>
        a.ano === b.ano ? a.especie.localeCompare(b.especie) : a.ano.localeCompare(b.ano));

    let anos = [];
    linhas.forEach(l => {
        let grupo = anos[anos.length - 1];
        if (!grupo || grupo.ano !== l.ano) {
            grupo = { ano: l.ano, especies: [], n: 0, peso: 0 };
            anos.push(grupo);
        }
        grupo.n += l.n;
        grupo.peso += l.peso;
        grupo.especies.push({
            especie: l.especie,
            n: l.n,
            peso: l.peso,
            maior: l.maior,
            tamanhoMedio: l.nTamanho > 0 ? l.somaTamanho / l.nTamanho : null,
            mes: relMaisFrequente(l.meses),
            local: relMaisFrequente(l.locais),
            isco: relMaisFrequente(l.iscos)
        });
    });
    return { anos, total };
}

// ===== 2. Ranking dos spots (antigo "Ranking geral dos spots") =====

function relRankingSpots(capturas) {
    let porLocal = {};
    capturas.forEach(c => {
        let r = porLocal[c.local];
        if (!r) r = porLocal[c.local] = { local: c.local, quantidade: 0, pesoTotal: 0, maior: { peso: 0, tipoPeixe: "" } };
        r.quantidade++;
        r.pesoTotal += c.peso;
        if (c.peso > r.maior.peso) r.maior = { peso: c.peso, tipoPeixe: c.tipoPeixe || "N/A" };
    });
    return Object.values(porLocal).sort((a, b) => b.quantidade - a.quantidade);
}

// ===== 3. Ranking dos 25 maiores peixes =====

function relTop25(capturas) {
    let ordenadas = capturas.slice().sort((a, b) => b.peso - a.peso).slice(0, 25);
    let total = ordenadas.length;

    let anos = {}, meses = {}, locais = {}, iscos = {};
    let pesoLocal = {}, pesoMes = {}, pesoAno = {};
    let localPesado = { nome: "N/A", peso: 0 }, mesPesado = { nome: "N/A", peso: 0 }, anoPesado = { nome: "N/A", peso: 0 };

    let itens = ordenadas.map((c, i) => {
        let ano = Number(c.data.substring(0, 4));
        let mes = relNomeMes(c.data.substring(5, 7));

        anos[ano] = (anos[ano] || 0) + 1;
        meses[mes] = (meses[mes] || 0) + 1;
        locais[c.local] = (locais[c.local] || 0) + 1;
        iscos[c.tipoIsco] = (iscos[c.tipoIsco] || 0) + 1;

        // Máximos acumulados, com a mesma regra dos relatórios antigos
        pesoLocal[c.local] = (pesoLocal[c.local] || 0) + c.peso;
        if (pesoLocal[c.local] > localPesado.peso) localPesado = { nome: c.local, peso: pesoLocal[c.local] };
        pesoMes[mes] = (pesoMes[mes] || 0) + c.peso;
        if (pesoMes[mes] > mesPesado.peso) mesPesado = { nome: mes, peso: pesoMes[mes] };
        pesoAno[ano] = (pesoAno[ano] || 0) + c.peso;
        if (pesoAno[ano] > anoPesado.peso) anoPesado = { nome: String(ano), peso: pesoAno[ano] };

        return { pos: i + 1, tipoPeixe: c.tipoPeixe || "-", peso: c.peso, tamanho: c.tamanho, ano, mes, local: c.local, isco: c.tipoIsco, data: c.data };
    });

    let freq = obj => {
        let f = relMaisFrequente(obj);
        return f ? { nome: f.chave, pct: ((f.n / total) * 100).toFixed(0) + "%" } : { nome: "N/A", pct: "0%" };
    };
    return {
        itens, total,
        resumo: {
            anoFreq: freq(anos), anoPesado,
            mesFreq: freq(meses), mesPesado,
            localFreq: freq(locais), localPesado,
            iscoFreq: freq(iscos)
        }
    };
}

// ===== Apresentação (HTML): tabelas ajustadas ao ecrã =====

function relE(texto) {
    return escaparHTML(String(texto === undefined || texto === null ? "" : texto));
}

// <thead> + <tbody>. 'classe' identifica a tabela no CSS; 'orientacao' escolhe o formato do papel.
function relTabela(classe, cabecalhos, corpo) {
    return `<div class="rel-tabela-wrap"><table class="rel-tabela ${classe}">` +
        "<thead><tr>" + cabecalhos.map(h => `<th>${h}</th>`).join("") + "</tr></thead>" +
        `<tbody>${corpo}</tbody></table></div>`;
}

function relHtmlResumoAnoEspecie(r) {
    let par = f => f ? `${relE(f.chave)} (${f.n})` : "—";
    let corpo = "";
    r.anos.forEach(a => {
        corpo += `<tr class="rel-sep"><td colspan="6">${relE(a.ano)} · ${a.n} capturas · ${relGramas(a.peso)} g</td></tr>`;
        a.especies.forEach(e => {
            // Mês, local e isco mais frequentes ficam empilhados numa só coluna para a tabela caber no ecrã
            let frequentes =
                `<small>Mês</small> ${e.mes ? `${relMesCurto(e.mes.chave)} (${e.mes.n})` : "—"}<br>` +
                `<small>Local</small> ${par(e.local)}<br>` +
                `<small>Isco</small> ${par(e.isco)}`;
            corpo += "<tr>" +
                `<td class="rel-esq">${relE(e.especie)}</td>` +
                `<td>${e.n}</td>` +
                `<td>${relGramas(e.peso)}</td>` +
                `<td>${relGramas(e.maior.peso)}<br><small>${relE(e.maior.local)}</small></td>` +
                `<td>${e.tamanhoMedio === null ? "—" : e.tamanhoMedio.toFixed(1)}</td>` +
                `<td class="rel-esq">${frequentes}</td>` +
                "</tr>";
        });
    });
    corpo += `<tr class="rel-total"><td class="rel-esq">Total</td><td>${r.total.n}</td><td>${relGramas(r.total.peso)}</td><td colspan="3"></td></tr>`;
    return relTabela("rel-t-geral",
        ["Espécie", "Total", "Peso total (g)", "Mais pesado (g)", "Tam. médio (cm)", "Mais frequente"], corpo) +
        '<p class="rel-nota">Mais frequente: o mês, o local e o isco com mais capturas (entre parênteses, quantas).</p>';
}

function relHtmlRankingSpots(lista) {
    let corpo = lista.map((l, i) =>
        "<tr>" +
        `<td>${i + 1}</td>` +
        `<td class="rel-esq">${relE(l.local)}</td>` +
        `<td>${l.quantidade}</td>` +
        `<td>${relGramas(l.pesoTotal)}</td>` +
        `<td class="rel-esq">${relE(l.maior.tipoPeixe)}<br><small>${relGramas(l.maior.peso)} g</small></td>` +
        "</tr>").join("");
    return relTabela("rel-t-spots", ["#", "Local", "Peixes", "Peso total (g)", "Peixe mais pesado"], corpo);
}

function relHtmlTop25(r) {
    let corpo = r.itens.map(c =>
        "<tr>" +
        `<td>${c.pos}</td>` +
        `<td class="rel-esq">${relE(c.tipoPeixe)}</td>` +
        `<td>${relGramas(c.peso)}</td>` +
        `<td>${relE(c.tamanho)}</td>` +
        `<td>${relMesCurto(c.data.substring(5, 7))} ${relE(c.ano)}</td>` +
        `<td class="rel-esq">${relE(c.local)}</td>` +
        `<td class="rel-esq">${relE(c.isco)}</td>` +
        "</tr>").join("");
    let html = relTabela("rel-t-top", ["#", "Espécie", "Peso (g)", "cm", "Mês/Ano", "Local", "Isco"], corpo);

    let s = r.resumo;
    let linha = (rotulo, nome, extra) => `<tr><td class="rel-esq">${rotulo}</td><td class="rel-esq">${relE(nome)}</td><td>${relE(extra)}</td></tr>`;
    let analise =
        linha("Ano com mais capturas", s.anoFreq.nome, s.anoFreq.pct) +
        linha("Ano com capturas mais pesadas", s.anoPesado.nome, relGramas(s.anoPesado.peso) + " g") +
        linha("Mês com mais capturas", s.mesFreq.nome, s.mesFreq.pct) +
        linha("Mês com capturas mais pesadas", s.mesPesado.nome, relGramas(s.mesPesado.peso) + " g") +
        linha("Local com mais capturas", s.localFreq.nome, s.localFreq.pct) +
        linha("Local com capturas mais pesadas", s.localPesado.nome, relGramas(s.localPesado.peso) + " g") +
        linha("Isco mais usado", s.iscoFreq.nome, s.iscoFreq.pct);
    html += `<h3 class="rel-subtitulo">Análise destes ${r.total} peixes</h3>` +
        relTabela("rel-t-analise", ["Indicador", "Resultado", "Valor"], analise);
    return html;
}

// ===== Ecrã do relatório =====

let relatorioTituloAtual = "";

// orientacao: "paisagem" (tabelas largas) ou "retrato"; só afeta o papel / PDF
function abrirRelatorio(titulo, subtitulo, corpoHtml, orientacao) {
    relatorioTituloAtual = titulo;
    let el = document.getElementById("relatorioConteudo");
    if (!el) return;
    el.innerHTML = `<div class="rel-${orientacao || "retrato"}">` +
        `<h2 class="relatorio-titulo">${relE(titulo)}</h2>` +
        (subtitulo ? `<p class="relatorio-sub">${relE(subtitulo)}</p>` : "") +
        corpoHtml + "</div>";
    mostrarSecao("relatorio");
}

function relVazio(titulo) {
    abrirRelatorio(titulo, "", '<p class="inicio-vazio">Ainda não há capturas registadas para este relatório.</p>');
}

// Imprimir / guardar em PDF: o nome do ficheiro sugerido é o título do relatório
function imprimirRelatorio() {
    let tituloOriginal = document.title;
    document.title = "Pesca Lúdica - " + (relatorioTituloAtual || "Relatório");
    let restaurar = () => { document.title = tituloOriginal; };
    window.addEventListener("afterprint", restaurar, { once: true });
    window.print();
}

function relProteger(titulo, fn) {
    try {
        let capturas = obterCapturas();
        if (!capturas.length) { relVazio(titulo); return; }
        fn(capturas);
    } catch (erro) {
        console.error("Erro ao gerar o relatório '" + titulo + "':", erro);
        if (typeof exibirMensagem === "function") exibirMensagem("error", "Não foi possível gerar o relatório.");
    }
}

window.abrirResumoGeral = function () {
    relProteger("Capturas por espécie e ano", capturas => {
        let r = relResumoAnoEspecie(capturas);
        abrirRelatorio("Capturas por espécie e ano", `${r.total.n} capturas em ${r.anos.length} ano(s)`, relHtmlResumoAnoEspecie(r), "paisagem");
    });
};

window.gerarRankingLocais = function () {
    relProteger("Ranking dos spots", capturas => {
        let lista = relRankingSpots(capturas);
        abrirRelatorio("Ranking dos spots", `${lista.length} locais, por número de peixes`, relHtmlRankingSpots(lista), "retrato");
    });
};

window.abrirRankingMaioresPeixes = function () {
    relProteger("Os maiores peixes", capturas => {
        let r = relTop25(capturas);
        abrirRelatorio(`Os ${r.total} maiores peixes`, "Por peso", relHtmlTop25(r), "paisagem");
    });
};
