// diagnostico.js
// Registo de erros e relatório de diagnóstico. Tem de ser o PRIMEIRO script da página:
// assim apanha também o que correr mal enquanto os outros ficheiros carregam
// (um ficheiro que não chega, uma versão misturada, um erro de código).
// Guarda só informação técnica (hora, tipo, mensagem). Nunca guarda dados das tuas capturas.

const DIAG_CHAVE = "registoErros";
const DIAG_MAX = 50;
let diagAGravar = false;   // evita que registar um erro provoque outro registo

function diagLer() {
    try {
        let v = JSON.parse(localStorage.getItem(DIAG_CHAVE));
        return Array.isArray(v) ? v : [];
    } catch (e) {
        return [];
    }
}

function diagGravar(lista) {
    try { localStorage.setItem(DIAG_CHAVE, JSON.stringify(lista)); } catch (e) { /* sem espaço: não dá para registar */ }
}

function diagCurto(texto, max) {
    texto = String(texto === undefined || texto === null ? "" : texto);
    return texto.length > max ? texto.slice(0, max - 1) + "…" : texto;
}

function diagTexto(x) {
    if (x instanceof Error) return x.name + ": " + x.message;
    if (typeof x === "string") return x;
    try { return JSON.stringify(x); } catch (e) { return String(x); }
}

function diagEsc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// tipo: "erro" (código), "recurso" (ficheiro que não carregou), "promessa", "aviso" (erro tratado pela app)
function registarErro(tipo, mensagem) {
    if (diagAGravar) return;
    diagAGravar = true;
    try {
        let lista = diagLer();
        let msg = diagCurto(mensagem, 300);
        let ultimo = lista[lista.length - 1];
        if (ultimo && ultimo.tipo === tipo && ultimo.msg === msg) {
            ultimo.n = (ultimo.n || 1) + 1;     // o mesmo erro seguido: conta em vez de repetir
            ultimo.t = new Date().toISOString();
        } else {
            lista.push({ t: new Date().toISOString(), tipo, msg, n: 1 });
        }
        while (lista.length > DIAG_MAX) lista.shift();
        diagGravar(lista);
    } catch (e) { /* o registo nunca pode causar problemas */ } finally {
        diagAGravar = false;
    }
}

function obterRegistoErros() {
    return diagLer();
}

function limparRegistoErros() {
    diagGravar([]);
    atualizarDiagnostico();
    if (typeof exibirMensagem === "function") exibirMensagem("success", "Registo de erros limpo.");
}

// ===== Captura automática =====

window.addEventListener("error", ev => {
    let alvo = ev.target;
    if (alvo && alvo !== window && (alvo.src || alvo.href)) {
        registarErro("recurso", "Falha ao carregar " + (alvo.src || alvo.href));
        return;
    }
    let onde = ev.filename ? ` (${String(ev.filename).split("/").pop()}:${ev.lineno}:${ev.colno})` : "";
    registarErro("erro", (ev.message || "Erro desconhecido") + onde);
}, true);

window.addEventListener("unhandledrejection", ev => {
    registarErro("promessa", diagTexto(ev.reason));
});

// Os erros que a própria app trata (e escreve na consola) também ficam registados
(function () {
    let original = console.error;
    console.error = function () {
        try { registarErro("aviso", Array.prototype.map.call(arguments, diagTexto).join(" ")); } catch (e) { /* ignora */ }
        return original.apply(console, arguments);
    };
})();

// ===== Relatório =====

function diagArmazenamentoKB() {
    let total = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            let k = localStorage.key(i);
            total += k.length + (localStorage.getItem(k) || "").length;
        }
    } catch (e) { return null; }
    return Math.round(total / 1024);
}

function diagContagens() {
    let n = (fn, ...args) => { try { return typeof fn === "function" ? fn(...args).length : "?"; } catch (e) { return "?"; } };
    let posicoes = "?", listas = "?";
    try { if (typeof obterCoordsLocais === "function") posicoes = Object.keys(obterCoordsLocais()).length; } catch (e) { /* ignora */ }
    try { if (typeof obterListas === "function") { let l = obterListas(); listas = l.locais.length + l.especies.length + l.iscos.length; } } catch (e) { /* ignora */ }
    return { capturas: n(typeof obterCapturas === "function" ? obterCapturas : null), grades: n(typeof obterGrades === "function" ? obterGrades : null), posicoes, listas };
}

function diagFormatarData(iso) {
    try { return new Date(iso).toLocaleString("pt-PT"); } catch (e) { return iso; }
}

function textoDiagnostico() {
    let c = diagContagens();
    let kb = diagArmazenamentoKB();
    let instalada = false;
    try { instalada = !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches); } catch (e) { /* ignora */ }
    let linhas = [
        "Pesca Lúdica - diagnóstico",
        "Versão: " + (typeof APP_VERSAO !== "undefined" ? APP_VERSAO : "?"),
        "Data: " + diagFormatarData(new Date().toISOString()),
        "Modo: " + (instalada ? "app instalada" : "browser"),
        "Browser: " + (typeof navigator !== "undefined" ? navigator.userAgent : "?"),
        `Dados: ${c.capturas} capturas, ${c.grades} grades, ${c.posicoes} posições no mapa, ${c.listas} itens nas listas`,
        "Armazenamento usado: " + (kb === null ? "?" : kb + " KB (limite habitual cerca de 5000 KB)"),
        ""
    ];
    let erros = obterRegistoErros();
    if (!erros.length) {
        linhas.push("Sem erros registados.");
    } else {
        linhas.push("Últimos erros (do mais recente para o mais antigo):");
        erros.slice().reverse().slice(0, 20).forEach(e => {
            linhas.push(`- ${diagFormatarData(e.t)} [${e.tipo}] ${e.msg}${e.n > 1 ? ` (x${e.n})` : ""}`);
        });
    }
    return linhas.join("\n");
}

// ===== Ecrã (separador Dados) =====

function atualizarDiagnostico() {
    let resumo = document.getElementById("diagResumo");
    let lista = document.getElementById("diagErros");
    if (resumo) {
        let c = diagContagens(), kb = diagArmazenamentoKB();
        resumo.textContent = `Versão ${typeof APP_VERSAO !== "undefined" ? APP_VERSAO : "?"} · ${c.capturas} capturas · ${c.grades} grades · ${kb === null ? "?" : kb} KB usados`;
    }
    if (!lista) return;
    let erros = obterRegistoErros().slice().reverse().slice(0, 10);
    lista.innerHTML = erros.length
        ? '<table class="rel-tabela rel-t-diag"><thead><tr><th>Quando</th><th>Tipo</th><th>Mensagem</th></tr></thead><tbody>' +
          erros.map(e => `<tr><td>${diagEsc(diagFormatarData(e.t))}</td><td>${diagEsc(e.tipo)}</td><td class="rel-esq">${diagEsc(e.msg)}${e.n > 1 ? ` <small>(x${e.n})</small>` : ""}</td></tr>`).join("") +
          "</tbody></table>"
        : '<p class="inicio-vazio">Sem erros registados.</p>';
}

// Copia o relatório; se o browser não deixar, mostra o texto para copiares à mão
function copiarDiagnostico() {
    let texto = textoDiagnostico();
    let aviso = ok => {
        if (typeof exibirMensagem === "function") {
            exibirMensagem(ok ? "success" : "error", ok ? "Diagnóstico copiado." : "Não consegui copiar. O texto ficou à vista em baixo para o copiares.");
        }
    };
    let mostrarTexto = () => {
        let caixa = document.getElementById("diagTexto");
        if (caixa) { caixa.value = texto; caixa.style.display = "block"; if (caixa.select) caixa.select(); }
    };
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(() => aviso(true), () => { mostrarTexto(); aviso(false); });
            return;
        }
    } catch (e) { /* cai para o plano B */ }
    mostrarTexto();
    aviso(false);
}

function partilharDiagnostico() {
    let texto = textoDiagnostico();
    try {
        if (navigator.share) {
            navigator.share({ title: "Pesca Lúdica - diagnóstico", text: texto }).catch(() => { /* cancelado */ });
            return;
        }
    } catch (e) { /* cai para a cópia */ }
    copiarDiagnostico();
}
