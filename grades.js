// grades.js
// "Grade": saída de pesca SEM capturas.
// Só com as saídas sem peixe é que se percebe a taxa de sucesso (sem elas só se vê
// o que correu bem). As grades ficam guardadas à parte das capturas (ver dados.js),
// por isso nenhum relatório ou contagem das capturas muda por causa delas.
//
// Regra de contagem: uma SAÍDA = um dia num local.
//  - Se nesse dia e local houver capturas, a saída é "com capturas" e qualquer grade
//    registada para o mesmo dia e local deixa de contar.
//  - A taxa de grade só conta a partir da data da 1.ª grade válida: as saídas sem
//    capturas anteriores nunca foram registadas e enviesariam o resultado.

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

function gradePct(grades, saidas) {
    return saidas ? ((grades / saidas) * 100).toFixed(1) + "%" : "—";
}

// Devolve null se ainda não há nenhuma grade válida.
function gradesResumo(capturas, grades) {
    let validas = gradesValidas(capturas, grades);
    if (!validas.length) return null;

    let desde = validas.map(g => g.data).sort()[0];
    let saidas = {};
    capturas.forEach(c => {
        if (c.data && c.data >= desde) saidas[gradeChaveSaida(c)] = { ano: c.data.slice(0, 4), grade: false };
    });
    validas.forEach(g => {
        saidas[gradeChaveSaida(g)] = { ano: g.data.slice(0, 4), grade: true };
    });

    let porAno = {};
    Object.values(saidas).forEach(s => {
        let a = porAno[s.ano] || (porAno[s.ano] = { ano: s.ano, saidas: 0, comCapturas: 0, grades: 0 });
        a.saidas++;
        if (s.grade) a.grades++; else a.comCapturas++;
    });
    let anos = Object.values(porAno).sort((a, b) => a.ano.localeCompare(b.ano))
        .map(a => ({ ...a, pct: gradePct(a.grades, a.saidas) }));
    let total = anos.reduce((t, a) => ({ saidas: t.saidas + a.saidas, comCapturas: t.comCapturas + a.comCapturas, grades: t.grades + a.grades }),
        { saidas: 0, comCapturas: 0, grades: 0 });
    total.pct = gradePct(total.grades, total.saidas);
    return { desde, anos, total };
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

    let v = id => document.getElementById(id).value;
    let concelho = v("concelho");
    let g = { data: v("dataCaptura"), local: v("local"), tipoPesca: v("tipoPesca"), tipoIsco: v("tipoIsco"),
        mare: v("mare"), lua: v("lua"), periodoDia: v("periodoDia") };

    if (!concelho || Object.values(g).some(x => !x) || new Date(g.data) > new Date()) {
        exibirMensagem("error", "Para registar uma grade preenche as condições da saída (data, local, pesca, isco, maré, lua e período) e usa uma data válida.");
        if (typeof abrirCondicoes === "function") abrirCondicoes();
        return;
    }

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
        html += `<h3 class="rel-subtitulo">Taxa de grade desde ${gradeFormatarData(r.desde)}</h3>` +
            relTabela("rel-t-grades-resumo", ["Ano", "Saídas", "Com capturas", "Grades", "% grade"], corpo) +
            '<p class="rel-nota">Uma saída = um dia num local. Só conta a partir da 1.ª grade registada, porque as saídas sem capturas anteriores não ficaram registadas.</p>';
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
    let titulo = "Saídas sem capturas (grades)";
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
