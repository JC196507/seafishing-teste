// relatorios.js
// Relatórios pensados para o ecrã do telemóvel: aparecem DENTRO da app, como listas
// de cartões com letra grande (em vez de janelas novas com tabelas de 8 colunas).
// As contas seguem as mesmas regras dos relatórios antigos; só a apresentação mudou.
// O botão "Imprimir / Guardar PDF" usa um formato próprio para papel (ver print.css).

const REL_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ===== Funções de apoio (puras) =====

// Abaixo de 1 kg mostra gramas ("850 g"); a partir de 1 kg mostra kg ("1,5 kg")
function relFormatarPeso(gramas) {
    let g = Number(gramas) || 0;
    if (g >= 1000) return (g / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 2 }) + " kg";
    return Math.round(g).toLocaleString("pt-PT") + " g";
}

function relNomeMes(mm) {
    return REL_MESES[Number(mm) - 1] || String(mm);
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

// ===== Apresentação (HTML) =====

function relE(texto) {
    return escaparHTML(String(texto === undefined || texto === null ? "" : texto));
}

function relHtmlResumoAnoEspecie(r) {
    let html = "";
    r.anos.forEach(a => {
        html += `<h3 class="rel-ano">${relE(a.ano)} <small>${a.n} capturas · ${relFormatarPeso(a.peso)}</small></h3>`;
        html += '<div class="rel-lista">';
        a.especies.forEach(e => {
            let tam = e.tamanhoMedio === null ? "" : ` · tamanho médio ${e.tamanhoMedio.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} cm`;
            let par = f => f ? `${relE(f.chave)} (${f.n})` : "—";
            html += '<article class="rel-cartao">' +
                `<div class="rel-topo"><span class="rel-nome">${relE(e.especie)}</span><span class="rel-valor">${relFormatarPeso(e.peso)}</span></div>` +
                `<p class="rel-sub">${e.n} captura(s)${tam}</p>` +
                '<dl class="rel-detalhes">' +
                `<div><dt>Mais pesado</dt><dd>${relFormatarPeso(e.maior.peso)} · ${relE(e.maior.local)}</dd></div>` +
                `<div><dt>Mês com mais capturas</dt><dd>${e.mes ? `${relE(relNomeMes(e.mes.chave))} (${e.mes.n})` : "—"}</dd></div>` +
                `<div><dt>Local com mais capturas</dt><dd>${par(e.local)}</dd></div>` +
                `<div><dt>Isco mais usado</dt><dd>${par(e.isco)}</dd></div>` +
                "</dl></article>";
        });
        html += "</div>";
    });
    html += '<div class="rel-lista"><article class="rel-cartao rel-total">' +
        `<div class="rel-topo"><span class="rel-nome">Total geral</span><span class="rel-valor">${relFormatarPeso(r.total.peso)}</span></div>` +
        `<p class="rel-sub">${r.total.n} capturas</p></article></div>`;
    return html;
}

function relHtmlRankingSpots(lista) {
    return '<div class="rel-lista">' + lista.map((l, i) =>
        '<article class="rel-cartao rel-rank">' +
        `<span class="rel-pos">${i + 1}</span>` +
        '<div class="rel-corpo">' +
        `<div class="rel-topo"><span class="rel-nome">${relE(l.local)}</span><span class="rel-valor">${l.quantidade}</span></div>` +
        `<p class="rel-sub">${l.quantidade === 1 ? "1 peixe" : l.quantidade + " peixes"} · ${relFormatarPeso(l.pesoTotal)}</p>` +
        `<p class="rel-sub">Maior: ${relE(l.maior.tipoPeixe)} · ${relFormatarPeso(l.maior.peso)}</p>` +
        "</div></article>").join("") + "</div>";
}

function relHtmlTop25(r) {
    let html = '<div class="rel-lista">' + r.itens.map(c =>
        '<article class="rel-cartao rel-rank">' +
        `<span class="rel-pos">${c.pos}</span>` +
        '<div class="rel-corpo">' +
        `<div class="rel-topo"><span class="rel-nome">${relE(c.tipoPeixe)}</span><span class="rel-valor">${relFormatarPeso(c.peso)}</span></div>` +
        `<p class="rel-sub">${relE(c.tamanho)} cm · ${relE(c.mes)} ${relE(c.ano)}</p>` +
        `<p class="rel-sub">${relE(c.local)} · ${relE(c.isco)}</p>` +
        "</div></article>").join("") + "</div>";

    let s = r.resumo;
    let linha = (rotulo, valor) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`;
    html += '<h3 class="rel-ano">O que dizem estes ' + r.total + ' peixes</h3>' +
        '<article class="rel-cartao"><dl class="rel-detalhes">' +
        linha("Ano com mais capturas", `${relE(s.anoFreq.nome)} (${s.anoFreq.pct})`) +
        linha("Ano com capturas mais pesadas", `${relE(s.anoPesado.nome)} (${relFormatarPeso(s.anoPesado.peso)})`) +
        linha("Mês com mais capturas", `${relE(s.mesFreq.nome)} (${s.mesFreq.pct})`) +
        linha("Mês com capturas mais pesadas", `${relE(s.mesPesado.nome)} (${relFormatarPeso(s.mesPesado.peso)})`) +
        linha("Local com mais capturas", `${relE(s.localFreq.nome)} (${s.localFreq.pct})`) +
        linha("Local com capturas mais pesadas", `${relE(s.localPesado.nome)} (${relFormatarPeso(s.localPesado.peso)})`) +
        linha("Isco mais usado", `${relE(s.iscoFreq.nome)} (${s.iscoFreq.pct})`) +
        "</dl></article>";
    return html;
}

// ===== Ecrã do relatório =====

let relatorioTituloAtual = "";

function abrirRelatorio(titulo, subtitulo, corpoHtml) {
    relatorioTituloAtual = titulo;
    let el = document.getElementById("relatorioConteudo");
    if (!el) return;
    el.innerHTML = `<h2 class="relatorio-titulo">${relE(titulo)}</h2>` +
        (subtitulo ? `<p class="relatorio-sub">${relE(subtitulo)}</p>` : "") + corpoHtml;
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
        abrirRelatorio("Capturas por espécie e ano", `${r.total.n} capturas em ${r.anos.length} ano(s)`, relHtmlResumoAnoEspecie(r));
    });
};

window.gerarRankingLocais = function () {
    relProteger("Ranking dos spots", capturas => {
        let lista = relRankingSpots(capturas);
        abrirRelatorio("Ranking dos spots", `${lista.length} locais, por número de peixes`, relHtmlRankingSpots(lista));
    });
};

window.abrirRankingMaioresPeixes = function () {
    relProteger("Os maiores peixes", capturas => {
        let r = relTop25(capturas);
        abrirRelatorio(`Os ${r.total} maiores peixes`, "Por peso", relHtmlTop25(r));
    });
};
