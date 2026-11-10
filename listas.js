// listas.js
// Locais, espécies e iscos que acrescentas dentro da app.
//  - As listas de origem (locais.js e o HTML) nunca são alteradas: o que acrescentas
//    fica à parte (ver dados.js) e é juntado a elas.
//  - Só se pode apagar o que acrescentaste E ainda não foi usado em nenhum registo:
//    as capturas e grades guardam o nome por extenso, e apagar um nome em uso deixava
//    registos antigos sem poderem ser editados.
//  - Os nomes ficam por extenso nas capturas, por isso os teus nomes entram nos
//    backups e voltam a existir quando importas.

const LISTA_MAX_NOME = 40;
const LISTA_MAX_ITENS = 300;
const LISTA_NOVO_CONCELHO = "__novo__";
const listaAplicadas = {};   // o que está acrescentado em cada <select> neste momento

// ===== Nomes (puros) =====

function listaNormalizar(txt) {
    return String(txt === undefined || txt === null ? "" : txt).normalize("NFC").replace(/\s+/g, " ").trim();
}

// Para detetar repetidos: sem acentos, sem maiúsculas ("Pêgo" = "pego" = "PEGO")
function listaChave(txt) {
    return listaNormalizar(txt).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Só letras, números, espaços, hífen, ponto, parênteses e barra. Sem apóstrofo nem &, < ou >:
// esses caracteres são alterados quando se importa um backup e deixavam o nome diferente.
function listaValidarNome(txt) {
    let nome = listaNormalizar(txt);
    if (nome.length < 2) return { ok: false, erro: "O nome tem de ter pelo menos 2 caracteres." };
    if (nome.length > LISTA_MAX_NOME) return { ok: false, erro: `O nome pode ter no máximo ${LISTA_MAX_NOME} caracteres.` };
    if (!/^[\p{L}\p{N} .\-()\/ºª]+$/u.test(nome)) return { ok: false, erro: "Só podes usar letras, números, espaços, hífen, ponto, parênteses e barra." };
    if (!/\p{L}/u.test(nome)) return { ok: false, erro: "O nome tem de ter pelo menos uma letra." };
    return { ok: true, nome };
}

function listaExiste(nomes, nome) {
    let k = listaChave(nome);
    return nomes.some(n => listaChave(n) === k);
}

// ===== O que vem de origem =====

function listaLocaisDeOrigem() {
    return concelhosLocais.flatMap(c => c.locais);
}

function listaConcelhosDeOrigem() {
    return concelhosLocais.map(c => c.concelho);
}

// Espécies ou iscos que vêm no HTML (as opções do <select> menos as acrescentadas)
function listaOrigemSelect(idSelect) {
    let s = document.getElementById(idSelect);
    if (!s || !s.options) return [];
    let acrescentadas = listaAplicadas[idSelect] || [];
    return Array.from(s.options).map(o => o.value).filter(v => v !== "" && !acrescentadas.includes(v));
}

function listaTodosOsNomes(tipo) {
    let l = obterListas();
    if (tipo === "locais") return listaLocaisDeOrigem().concat(l.locais.map(x => x.nome));
    if (tipo === "especies") return listaOrigemSelect("tipoPeixe").concat(l.especies);
    return listaOrigemSelect("tipoIsco").concat(l.iscos);
}

function listaNomesDeConcelhos() {
    return listaConcelhosLocais().map(c => c.concelho);
}

// ===== Aplicar nos <select> do registo =====

function aplicarListaNoSelect(idSelect, acrescentados) {
    let s = document.getElementById(idSelect);
    if (!s || !s.options) return;
    let atual = s.value;
    let antigos = listaAplicadas[idSelect] || [];
    let opcoes = Array.from(s.options).map(o => ({ value: o.value, texto: o.textContent }));
    let marcador = opcoes.find(o => o.value === "") || { value: "", texto: "" };
    let origem = opcoes.filter(o => o.value !== "" && !antigos.includes(o.value));

    s.innerHTML = `<option value="">${escaparHTML(marcador.texto)}</option>`;
    origem.concat(acrescentados.map(n => ({ value: n, texto: n }))).forEach(o => {
        let e = document.createElement("option");
        e.value = o.value;
        e.textContent = o.texto;
        s.appendChild(e);
    });
    listaAplicadas[idSelect] = acrescentados.slice();
    s.value = atual;   // mantém a escolha, se ainda existir
}

function aplicarListasNosSelects() {
    let l = obterListas();
    aplicarListaNoSelect("tipoPeixe", l.especies.slice().sort((a, b) => a.localeCompare(b, "pt")));
    aplicarListaNoSelect("tipoIsco", l.iscos.slice().sort((a, b) => a.localeCompare(b, "pt")));
}

// Atualiza também o concelho e o local do registo, SEM perder o que já escolheste
function listaAtualizarRegisto() {
    aplicarListasNosSelects();
    let sc = document.getElementById("concelho"), sl = document.getElementById("local");
    if (!sc || !sl || typeof carregarDados !== "function") return;
    let concelhoAtual = sc.value, localAtual = sl.value;
    carregarDados();
    sc.value = concelhoAtual;
    atualizarLocaisOrdenados();
    sl.value = localAtual;
}

// ===== Acrescentar =====

function listaMensagem(tipo, texto) {
    if (typeof exibirMensagem === "function") exibirMensagem(tipo, texto);
}

function listaAposAlterar() {
    listaAtualizarRegisto();
    listaPreencherConcelhos();   // um concelho novo tem de aparecer já no seletor deste ecrã
    listaDesenhar();
}

function adicionarLocalLista() {
    let selecionado = document.getElementById("listaConcelho").value;
    let concelho;
    if (selecionado === LISTA_NOVO_CONCELHO) {
        let c = listaValidarNome(document.getElementById("listaConcelhoNovo").value);
        if (!c.ok) { listaMensagem("error", "Concelho novo: " + c.erro); return; }
        if (listaExiste(listaNomesDeConcelhos(), c.nome)) { listaMensagem("error", "Esse concelho já existe: escolhe-o na lista."); return; }
        concelho = c.nome;
    } else {
        concelho = selecionado;
    }
    if (!concelho) { listaMensagem("error", "Escolhe o concelho ou zona, ou cria um novo."); return; }

    let v = listaValidarNome(document.getElementById("listaLocalNovo").value);
    if (!v.ok) { listaMensagem("error", "Local: " + v.erro); return; }
    if (listaExiste(listaTodosOsNomes("locais"), v.nome)) { listaMensagem("error", "Já existe um local com esse nome."); return; }

    let listas = obterListas();
    if (listas.locais.length >= LISTA_MAX_ITENS) { listaMensagem("error", "Já tens muitos locais acrescentados."); return; }
    listas.locais.push({ concelho, nome: v.nome });
    if (!guardarListas(listas)) return;

    document.getElementById("listaLocalNovo").value = "";
    document.getElementById("listaConcelhoNovo").value = "";
    listaMensagem("success", `Local «${v.nome}» adicionado em «${concelho}».`);
    listaAposAlterar();
    if (selecionado === LISTA_NOVO_CONCELHO) {
        document.getElementById("listaConcelho").value = concelho;
        listaAoMudarConcelho();
    }
}

function listaAdicionarSimples(chave, idInput, rotulo, genero) {
    let Rotulo = rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
    let v = listaValidarNome(document.getElementById(idInput).value);
    if (!v.ok) { listaMensagem("error", Rotulo + ": " + v.erro); return; }
    if (listaExiste(listaTodosOsNomes(chave), v.nome)) { listaMensagem("error", `Já existe ${genero === "m" ? "um" : "uma"} ${rotulo} com esse nome.`); return; }
    let listas = obterListas();
    if (listas[chave].length >= LISTA_MAX_ITENS) { listaMensagem("error", "Já tens muitos itens acrescentados."); return; }
    listas[chave].push(v.nome);
    if (!guardarListas(listas)) return;
    document.getElementById(idInput).value = "";
    listaMensagem("success", `${Rotulo} «${v.nome}» adicionad${genero === "m" ? "o" : "a"}.`);
    listaAposAlterar();
}

function adicionarEspecieLista() { listaAdicionarSimples("especies", "listaEspecieNova", "espécie", "f"); }
function adicionarIscoLista() { listaAdicionarSimples("iscos", "listaIscoNovo", "isco", "m"); }

// ===== Apagar (só o que acrescentaste e ainda não foi usado) =====

function listaUsos(tipo, nome) {
    let c = obterCapturas(), g = obterGrades();
    if (tipo === "locais") return c.filter(x => x.local === nome).length + g.filter(x => x.local === nome).length;
    if (tipo === "especies") return c.filter(x => x.tipoPeixe === nome).length;
    return c.filter(x => x.tipoIsco === nome).length + g.filter(x => x.tipoIsco === nome).length;
}

function listaRemover(tipo, nome, concelho) {
    let usos = listaUsos(tipo, nome);
    if (usos > 0) {
        listaMensagem("error", `«${nome}» está em ${usos} registo(s) e por isso não pode ser apagado.`);
        return;
    }
    if (!confirm(`Apagar «${nome}» da lista?`)) return;

    let listas = obterListas();
    let antes = listas[tipo].length;
    listas[tipo] = tipo === "locais"
        ? listas.locais.filter(l => !(l.nome === nome && l.concelho === concelho))
        : listas[tipo].filter(n => n !== nome);
    if (listas[tipo].length === antes) { listaMensagem("error", "Não encontrei esse item."); return; }
    if (!guardarListas(listas)) return;

    // Um local apagado não deve deixar a sua posição órfã no mapa
    if (tipo === "locais" && typeof obterCoordsLocais === "function") {
        let coords = obterCoordsLocais();
        if (coords[nome]) { delete coords[nome]; guardarCoordsLocais(coords); }
    }
    listaMensagem("success", `«${nome}» apagado.`);
    listaAposAlterar();
}

// ===== Ecrã =====

function listaPreencherConcelhos() {
    let s = document.getElementById("listaConcelho");
    if (!s) return;
    let atual = s.value;
    s.innerHTML = '<option value="">Escolhe o concelho ou zona</option>';
    listaConcelhosLocais().forEach(c => {
        let o = document.createElement("option");
        o.value = c.concelho;
        o.textContent = c.concelho;
        s.appendChild(o);
    });
    let novo = document.createElement("option");
    novo.value = LISTA_NOVO_CONCELHO;
    novo.textContent = "➕ Concelho ou zona novo…";
    s.appendChild(novo);
    s.value = atual;
    listaAoMudarConcelho();
}

function listaAoMudarConcelho() {
    let s = document.getElementById("listaConcelho"), linha = document.getElementById("listaConcelhoNovoLinha");
    if (linha && s) linha.style.display = s.value === LISTA_NOVO_CONCELHO ? "block" : "none";
}

function listaDesenhar() {
    let el = document.getElementById("listaPersonalizada");
    if (!el) return;
    let l = obterListas();
    let botao = (tipo, nome, concelho) =>
        `<button type="button" class="botao-pequeno" data-tipo="${escaparHTML(tipo)}" data-nome="${escaparHTML(nome)}" data-concelho="${escaparHTML(concelho || "")}" aria-label="Apagar ${escaparHTML(nome)}">✕</button>`;
    let linhas =
        l.locais.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt")).map(x =>
            `<tr><td class="rel-esq">Local</td><td class="rel-esq">${escaparHTML(x.nome)}<br><small>${escaparHTML(x.concelho)}</small></td><td>${botao("locais", x.nome, x.concelho)}</td></tr>`).join("") +
        l.especies.slice().sort((a, b) => a.localeCompare(b, "pt")).map(n =>
            `<tr><td class="rel-esq">Espécie</td><td class="rel-esq">${escaparHTML(n)}</td><td>${botao("especies", n)}</td></tr>`).join("") +
        l.iscos.slice().sort((a, b) => a.localeCompare(b, "pt")).map(n =>
            `<tr><td class="rel-esq">Isco</td><td class="rel-esq">${escaparHTML(n)}</td><td>${botao("iscos", n)}</td></tr>`).join("");
    el.innerHTML = linhas
        ? `<table class="rel-tabela rel-t-listas"><thead><tr><th>Tipo</th><th>Nome</th><th></th></tr></thead><tbody>${linhas}</tbody></table>`
        : '<p class="inicio-vazio">Ainda não acrescentaste nada.</p>';
}

function aoMostrarListas() {
    listaPreencherConcelhos();
    listaDesenhar();
}

// ===== Backup: só entra o que for válido =====

function listaFiltrarImportadas(bruto) {
    let limpas = listasVazias();
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return limpas;

    let concelhosOrigem = listaConcelhosDeOrigem();
    let locaisOrigem = listaLocaisDeOrigem();
    let vistos = [];
    (Array.isArray(bruto.locais) ? bruto.locais : []).slice(0, LISTA_MAX_ITENS).forEach(x => {
        if (!x || typeof x.concelho !== "string" || typeof x.nome !== "string") return;
        let n = listaValidarNome(x.nome);
        if (!n.ok || listaExiste(locaisOrigem.concat(vistos), n.nome)) return;
        let ehDeOrigem = concelhosOrigem.includes(x.concelho);
        if (!ehDeOrigem && !listaValidarNome(x.concelho).ok) return;
        vistos.push(n.nome);
        limpas.locais.push({ concelho: ehDeOrigem ? x.concelho : listaNormalizar(x.concelho), nome: n.nome });
    });
    [["especies", "tipoPeixe"], ["iscos", "tipoIsco"]].forEach(([chave, idSelect]) => {
        let origem = listaOrigemSelect(idSelect), vistas = [];
        (Array.isArray(bruto[chave]) ? bruto[chave] : []).slice(0, LISTA_MAX_ITENS).forEach(nome => {
            if (typeof nome !== "string") return;
            let n = listaValidarNome(nome);
            if (!n.ok || listaExiste(origem.concat(vistas), n.nome)) return;
            vistas.push(n.nome);
            limpas[chave].push(n.nome);
        });
    });
    return limpas;
}

function listaTotal(l) {
    return l.locais.length + l.especies.length + l.iscos.length;
}

// Junta sem repetir. Devolve { listas, adicionados }.
function listaJuntar(atuais, novas) {
    let r = { locais: atuais.locais.slice(), especies: atuais.especies.slice(), iscos: atuais.iscos.slice() };
    let adicionados = 0;
    novas.locais.forEach(x => {
        if (!listaExiste(listaLocaisDeOrigem().concat(r.locais.map(l => l.nome)), x.nome)) { r.locais.push(x); adicionados++; }
    });
    [["especies", "tipoPeixe"], ["iscos", "tipoIsco"]].forEach(([chave, idSelect]) => novas[chave].forEach(n => {
        if (!listaExiste(r[chave].concat(listaOrigemSelect(idSelect)), n)) { r[chave].push(n); adicionados++; }
    }));
    return { listas: r, adicionados };
}

// Usado ao importar: guarda e aplica as listas ANTES de validar posições e grades,
// porque estas podem referir locais ou iscos que só existem nas listas do backup.
// Devolve quantos itens ficaram acrescentados, ou -1 se não conseguiu gravar.
function listaImportar(listasValidas, modo) {
    let resultado = modo === "substituir"
        ? { listas: listasValidas, adicionados: listaTotal(listasValidas) }
        : listaJuntar(obterListas(), listasValidas);
    if (!guardarListas(resultado.listas)) return -1;
    listaAtualizarRegisto();
    return resultado.adicionados;
}

document.addEventListener("DOMContentLoaded", () => {
    aplicarListasNosSelects();
    let el = document.getElementById("listaPersonalizada");
    if (el) {
        el.addEventListener("click", e => {
            let b = e.target && e.target.closest ? e.target.closest("button[data-tipo]") : null;
            if (b && b.dataset) listaRemover(b.dataset.tipo, b.dataset.nome, b.dataset.concelho);
        });
    }
});
