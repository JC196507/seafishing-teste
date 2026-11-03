// grades.js
// "Grade": saída de pesca SEM capturas (ir pescar e não tirar peixe).
// Só com as saídas sem peixe é que se percebe a taxa de sucesso: sem elas só se vê
// o que correu bem. As grades ficam guardadas à parte das capturas (ver dados.js),
// por isso nenhum relatório ou contagem das capturas muda por causa delas.
//
// Como tudo se liga (todas as saídas na mesma conta):
//  - Uma SAÍDA = um dia num local. Cada dia+local com capturas é uma saída "com
//    capturas" (todas as capturas antigas contam); cada grade é uma saída sem capturas.
//  - Se nesse dia e local houver capturas, qualquer grade para o mesmo dia e local
//    deixa de contar (seria uma contradição).
//  - Sucesso = saída com pelo menos uma captura. Taxa de sucesso = saídas com capturas / saídas.
//  - Só se contam as saídas a partir da data da 1.ª grade válida: as saídas sem capturas
//    anteriores nunca foram registadas e a taxa ficaria enviesada para cima.
//  - As condições (maré, lua, período, técnica, isco) de uma saída com capturas são as da
//    1.ª captura desse dia e local; as de uma grade são as que registaste nela.

const GRADE_MIN_SAIDAS = 5;   // abaixo disto uma linha ainda diz pouco

function gradeChaveSaida(x) {
    return `${x.data}|${x.local}`;
}

function gerarIdGrade() {
    return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// "2026-10-12" -> "12/10/2026" (sem Date, para não haver problemas de fuso horário)
function gradeFormatarData(iso) {
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || "");
}

// ===== Contas (puras) =====

function gradesValidas(capturas, grades) {
    let comCapturas = new Set(capturas.filter(c => c.data).map(gradeChaveSaida));
    return grades.filter(g => !comCapturas.has(gradeChaveSaida(g)));
}

function gradeFmtPct(parte, total) {
    return total ? ((parte / total) * 100).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%" : "—";
}

function gradeFmtMedia(soma, n) {
    return n ? (soma / n).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";
}

// Todas as saídas (com capturas e sem elas) numa só lista, uma por dia e local.
function saidasConstruir(capturas, grades) {
    let mapa = new Map();
    capturas.forEach(c => {
        if (!c.data) return;
        let chave = gradeChaveSaida(c);
        let s = mapa.get(chave);
        if (!s) {
            s = { chave, data: c.data, local: c.local, comCapturas: true, nCapturas: 0,
                cond: { mare: c.mare, lua: c.lua, periodoDia: c.periodoDia, tipoPesca: c.tipoPesca, tipoIsco: c.tipoIsco } };
            mapa.set(chave, s);
        }
        s.nCapturas++;
    });
    gradesValidas(capturas, grades).forEach(g => {
        mapa.set(gradeChaveSaida(g), { chave: gradeChaveSaida(g), data: g.data, local: g.local, comCapturas: false, nCapturas: 0,
            cond: { mare: g.mare, lua: g.lua, periodoDia: g.periodoDia, tipoPesca: g.tipoPesca, tipoIsco: g.tipoIsco } });
    });
    return Array.from(mapa.values());
}

// Devolve null se ainda não há nenhuma grade válida.
function gradesResumo(capturas, grades) {
    let validas = gradesValidas(capturas, grades);
    if (!validas.length) return null;

    let desde = validas.map(g => g.data).sort()[0];
    let saidas = saidasConstruir(capturas, grades).filter(s => s.data >= desde);

    let porAno = {};
    saidas.forEach(s => {
        let ano = s.data.slice(0, 4);
        let a = porAno[ano] || (porAno[ano] = { ano, saidas: 0, comCapturas: 0, grades: 0 });
        a.saidas++;
        if (s.comCapturas) a.comCapturas++; else a.grades++;
    });
    let anos = Object.values(porAno).sort((a, b) => a.ano.localeCompare(b.ano))
        .map(a => ({ ...a, pct: gradeFmtPct(a.comCapturas, a.saidas) }));
    let total = anos.reduce((t, a) => ({ saidas: t.saidas + a.saidas, comCapturas: t.comCapturas + a.comCapturas, grades: t.grades + a.grades }),
        { saidas: 0, comCapturas: 0, grades: 0 });
    total.pct = gradeFmtPct(total.comCapturas, total.saidas);
    return { desde, anos, total, saidas };
}

const GRADE_DIMENSOES = [
    ["Local", "local", null],
    ["Maré", "mare", "mare"],
    ["Fase da lua", "lua", "lua"],
    ["Período do dia", "periodoDia", "periodoDia"],
    ["Técnica de pesca", "tipoPesca", "tipoPesca"],
    ["Isco", "tipoIsco", "tipoIsco"]
];

// Taxa de sucesso por condição, a partir da lista de saídas (já filtrada pelo "desde").
function gradesPorCondicao(saidas) {
    return GRADE_DIMENSOES.map(([titulo, campo, select]) => {
        let grupos = {};
        saidas.forEach(s => {
            let valor = (campo === "local" ? s.local : s.cond[campo]) || "Indefinido";
            let g = grupos[valor] || (grupos[valor] = { valor, saidas: 0, comCapturas: 0, grades: 0, nCapturas: 0 });
            g.saidas++;
            g.nCapturas += s.nCapturas;
            if (s.comCapturas) g.comCapturas++; else g.grades++;
        });
        let linhas = Object.values(grupos)
            .map(g => ({ ...g, pct: gradeFmtPct(g.comCapturas, g.saidas), porSaida: gradeFmtMedia(g.nCapturas, g.saidas) }))
            .sort((a, b) => b.saidas - a.saidas || a.valor.localeCompare(b.valor));
        return { titulo, campo, select, linhas };
    });
}

// ===== Backup: só entra o que for válido =====

function opcoesDoSelect(id) {
    let s = document.getElementById(id);
    if (!s || !s.options) return null;
    let valores = Array.from(s.options).map(o => o.value).filter(Boolean);
    return valores.length ? valores : null;
}

function filtrarGradesImportadas(lista, nomesValidos) {
    if (!Array.isArray(lista)) return [];
    let chaves = new Set(), ids = new Set(), limpas = [];
    lista.forEach(g => {
        if (!g || typeof g !== "object") return;
        if (typeof g.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(g.data) || isNaN(new Date(g.data).getTime())) return;
        if (!nomesValidos.includes(g.local)) return;
        for (let campo of ["tipoPesca", "tipoIsco", "mare", "lua", "periodoDia"]) {
            if (typeof g[campo] !== "string" || !g[campo] || g[campo].length > 60) return;
            let permitidas = opcoesDoSelect(campo);
            if (permitidas && !permitidas.includes(g[campo])) return;
        }
        let chave = gradeChaveSaida(g);
        if (chaves.has(chave)) return;
        chaves.add(chave);
        let id = typeof g.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(g.id) && !ids.has(g.id) ? g.id : gerarIdGrade();
        ids.add(id);
        limpas.push({
            id, data: g.data, local: g.local,
            tipoPesca: escaparHTML(g.tipoPesca), tipoIsco: escaparHTML(g.tipoIsco),
            mare: escaparHTML(g.mare), lua: escaparHTML(g.lua), periodoDia: escaparHTML(g.periodoDia)
        });
    });
    return limpas;
}

// Junta sem repetir (mesmo dia e local). Devolve { finais, adicionadas }.
function juntarGrades(atuais, novas) {
    let chaves = new Set(atuais.map(gradeChaveSaida));
    let ids = new Set(atuais.map(g => g.id));
    let adicionadas = novas.filter(g => !chaves.has(gradeChaveSaida(g))).map(g => ids.has(g.id) ? { ...g, id: gerarIdGrade() } : g);
    return { finais: atuais.concat(adicionadas), adicionadas: adicionadas.length };
}

// ===== Registar =====

function registarGrade() {
    if (typeof idEdicaoAtual !== "undefined" && idEdicaoAtual) {
        exibirMensagem("error", "Estás a editar uma captura. Toca em «Nova saída» para a cancelar antes de registares uma grade.");
        return;
    }
    if (typeof aplicarSugestoesRegisto === "function") aplicarSugestoesRegisto();

    let problemas = problemasDoRegisto(ORDEM_CAMPOS_GRADE);
    if (problemas.faltam.length || problemas.erros.length) {
        mostrarProblemas(problemas, ORDEM_CAMPOS_GRADE);
        return;
    }
    let v = id => document.getElementById(id).value;
    let g = { data: v("dataCaptura"), local: v("local"), tipoPesca: v("tipoPesca"), tipoIsco: v("tipoIsco"),
        mare: v("mare"), lua: v("lua"), periodoDia: v("periodoDia") };

    let chave = gradeChaveSaida(g);
    if (obterCapturas().some(c => c.data && gradeChaveSaida(c) === chave)) {
        exibirMensagem("error", "Já tens capturas nesse dia e local, por isso não foi uma grade.");
        return;
    }
    let grades = obterGrades();
    if (grades.some(x => gradeChaveSaida(x) === chave)) {
        exibirMensagem("error", "Já registaste uma grade nesse dia e local.");
        return;
    }

    g.id = gerarIdGrade();
    grades.push(g);
    if (!guardarGrades(grades)) return;

    exibirMensagem("success", `Grade registada: ${g.local}, ${gradeFormatarData(g.data)}.`);
    // A saída acabou: formulário limpo para a próxima
    if (typeof novaSaida === "function") novaSaida();
}

// ===== Ver / apagar =====

// Texto da opção do <select> ("BM" -> "Baixa-mar", "Manha" -> "Manhã")
function gradeRotulo(idSelect, valor) {
    let s = document.getElementById(idSelect);
    let opcao = s && s.options ? Array.from(s.options).find(o => o.value === valor) : null;
    return opcao && opcao.textContent ? opcao.textContent.trim() : valor;
}

function gradeHtml(capturas, grades) {
    let html = "";
    let r = gradesResumo(capturas, grades);
    if (r) {
        let corpo = r.anos.map(a =>
            `<tr><td>${relE(a.ano)}</td><td>${a.saidas}</td><td>${a.comCapturas}</td><td>${a.grades}</td><td>${a.pct}</td></tr>`).join("");
        if (r.anos.length > 1) {
            corpo += `<tr class="rel-total"><td>Total</td><td>${r.total.saidas}</td><td>${r.total.comCapturas}</td><td>${r.total.grades}</td><td>${r.total.pct}</td></tr>`;
        }
        html += `<h3 class="rel-subtitulo">Taxa de sucesso desde ${gradeFormatarData(r.desde)}</h3>` +
            relTabela("rel-t-grades-resumo", ["Ano", "Saídas", "Com capturas", "Grades", "% sucesso"], corpo) +
            '<p class="rel-nota">Saída = um dia num local. Sucesso = saída com pelo menos 1 captura. Só conta a partir da 1.ª grade registada, porque as saídas sem capturas anteriores não ficaram registadas.</p>';

        html += '<h3 class="rel-subtitulo">Taxa de sucesso por condição</h3>' +
            '<p class="rel-nota">Nas saídas com capturas, as condições são as da 1.ª captura desse dia e local. «Capt./saída» é a média de capturas por saída, com as grades a contar zero. Linhas a cinzento têm menos de ' + GRADE_MIN_SAIDAS + ' saídas: ainda dizem pouco.</p>';
        gradesPorCondicao(r.saidas).forEach(d => {
            let linhas = d.linhas.map(l => {
                let nome = d.select ? gradeRotulo(d.select, l.valor) : l.valor;
                return `<tr${l.saidas < GRADE_MIN_SAIDAS ? ' class="rel-poucos"' : ""}>` +
                    `<td class="rel-esq">${relE(nome)}</td><td>${l.saidas}</td><td>${l.grades}</td><td>${l.pct}</td><td>${l.porSaida}</td></tr>`;
            }).join("");
            html += `<div class="rel-bloco"><h3 class="rel-subtitulo">${relE(d.titulo)}</h3>` +
                relTabela("rel-t-grades-cond", [relE(d.titulo), "Saídas", "Grades", "% sucesso", "Capt./saída"], linhas) + "</div>";
        });
    }

    let comCapturas = new Set(capturas.filter(c => c.data).map(gradeChaveSaida));
    let linhas = grades.slice().sort((a, b) => b.data.localeCompare(a.data)).map(g => {
        let invalida = comCapturas.has(gradeChaveSaida(g));
        return "<tr>" +
            `<td>${relE(gradeFormatarData(g.data))}</td>` +
            `<td class="rel-esq">${relE(g.local)}${invalida ? "<br><small>já tem capturas nesse dia: não conta</small>" : ""}</td>` +
            `<td class="rel-esq">${relE(gradeRotulo("tipoPesca", g.tipoPesca))} · ${relE(gradeRotulo("tipoIsco", g.tipoIsco))}` +
            `<br><small>${relE(gradeRotulo("mare", g.mare))} · ${relE(gradeRotulo("lua", g.lua))} · ${relE(gradeRotulo("periodoDia", g.periodoDia))}</small></td>` +
            `<td class="no-print"><button type="button" class="botao-pequeno" onclick="apagarGrade('${relE(g.id)}')" aria-label="Apagar grade">✕</button></td>` +
            "</tr>";
    }).join("");
    html += '<h3 class="rel-subtitulo">As tuas grades</h3>' +
        relTabela("rel-t-grades", ["Data", "Local", "Condições", { t: "", c: "no-print" }], linhas);
    return html;
}

function abrirGrades() {
    let titulo = "Saídas e taxa de sucesso";
    try {
        let grades = obterGrades();
        if (!grades.length) {
            abrirRelatorio(titulo, "", '<p class="inicio-vazio">Ainda não registaste nenhuma grade.<br>No Registo, preenche as condições da saída e toca em «Registar grade».</p>', "retrato");
            return;
        }
        abrirRelatorio(titulo, `${grades.length} grade(s) registada(s)`, gradeHtml(obterCapturas(), grades), "retrato");
    } catch (erro) {
        console.error("Erro ao mostrar as grades:", erro);
        exibirMensagem("error", "Não foi possível mostrar as grades.");
    }
}

function apagarGrade(id) {
    if (!confirm("Apagar esta grade?")) return;
    let grades = obterGrades();
    let restantes = grades.filter(g => g.id !== id);
    if (restantes.length === grades.length) {
        exibirMensagem("error", "Grade não encontrada.");
        return;
    }
    if (!guardarGrades(restantes)) return;
    exibirMensagem("success", "Grade apagada.");
    abrirGrades();
}
