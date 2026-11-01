// dados.js
// Camada de acesso aos dados. TODO o resto da app lê e grava capturas através
// destas funções, nunca directamente no localStorage. Assim, trocar o
// armazenamento (ex.: para IndexedDB) passa a mexer apenas neste ficheiro.

const APP_VERSAO = "2.6";
const CHAVE_CAPTURAS = "capturas";
const CHAVE_ULTIMO_BACKUP = "ultimoBackup";
const CHAVE_COORDS = "locaisCoords";

function obterCapturas() {
    let bruto = null;
    try {
        bruto = localStorage.getItem(CHAVE_CAPTURAS);
        if (!bruto) return [];
        let dados = JSON.parse(bruto);
        return Array.isArray(dados) ? dados : [];
    } catch (erro) {
        // Dados ilegíveis: guarda uma cópia do texto original ANTES de devolver
        // vazio, para que uma gravação seguinte não os apague para sempre.
        console.error("Capturas ilegíveis no armazenamento:", erro);
        try {
            if (bruto) localStorage.setItem(CHAVE_CAPTURAS + "_corrompido_" + Date.now(), bruto);
        } catch (e) { /* sem espaço para a cópia: nada a fazer */ }
        return [];
    }
}

// Devolve true se gravou, false se falhou (ex.: armazenamento cheio).
function guardarCapturas(capturas) {
    try {
        localStorage.setItem(CHAVE_CAPTURAS, JSON.stringify(capturas));
        return true;
    } catch (erro) {
        console.error("Falha ao gravar capturas:", erro);
        if (typeof exibirMensagem === "function") {
            exibirMensagem("error", "Não foi possível gravar os dados (armazenamento cheio?). Faz um backup já!");
        }
        return false;
    }
}

// ===== Posições dos locais no mapa =====
// Guardadas por nome do local: { "Califa": { lat: 40.9, lng: -8.65 }, ... }
function coordenadaValida(c) {
    return !!c && typeof c.lat === "number" && typeof c.lng === "number" &&
        Number.isFinite(c.lat) && Number.isFinite(c.lng) &&
        Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180;
}

function obterCoordsLocais() {
    let bruto = null;
    try {
        bruto = localStorage.getItem(CHAVE_COORDS);
        if (!bruto) return {};
        let dados = JSON.parse(bruto);
        return dados && typeof dados === "object" && !Array.isArray(dados) ? dados : {};
    } catch (erro) {
        console.error("Posições dos locais ilegíveis:", erro);
        try {
            if (bruto) localStorage.setItem(CHAVE_COORDS + "_corrompido_" + Date.now(), bruto);
        } catch (e) { /* sem espaço: nada a fazer */ }
        return {};
    }
}

function guardarCoordsLocais(coords) {
    try {
        localStorage.setItem(CHAVE_COORDS, JSON.stringify(coords));
        return true;
    } catch (erro) {
        console.error("Falha ao gravar posições:", erro);
        if (typeof exibirMensagem === "function") {
            exibirMensagem("error", "Não foi possível gravar a posição (armazenamento cheio?).");
        }
        return false;
    }
}

// Devolve só as posições válidas e de locais que existem na lista da app
// (usado ao importar backups: nada de nomes ou números inventados).
function filtrarCoordsImportadas(coordsImp, nomesValidos) {
    let limpas = {};
    if (!coordsImp || typeof coordsImp !== "object" || Array.isArray(coordsImp)) return limpas;
    Object.keys(coordsImp).forEach(nome => {
        let c = coordsImp[nome];
        if (nomesValidos.includes(nome) && coordenadaValida(c)) {
            limpas[nome] = { lat: c.lat, lng: c.lng };
        }
    });
    return limpas;
}

// ===== Registo do último backup =====
function registarBackup() {
    try {
        localStorage.setItem(CHAVE_ULTIMO_BACKUP, new Date().toISOString());
    } catch (e) { /* não é crítico */ }
    atualizarEstadoBackup();
}

function obterUltimoBackup() {
    try {
        let valor = localStorage.getItem(CHAVE_ULTIMO_BACKUP);
        return valor ? new Date(valor) : null;
    } catch (e) {
        return null;
    }
}

function atualizarEstadoBackup() {
    // O mesmo aviso aparece no separador Dados e no ecrã inicial
    let elementos = ["estadoBackup", "inicioBackup"]
        .map(id => document.getElementById(id))
        .filter(Boolean);
    if (!elementos.length) return;

    let total = obterCapturas().length;
    let ultimo = obterUltimoBackup();
    let aviso = false;
    let texto;

    if (!ultimo || isNaN(ultimo.getTime())) {
        texto = total > 0
            ? `Ainda não fizeste nenhum backup. Tens ${total} captura(s) guardadas só neste telemóvel.`
            : "Ainda não tens capturas registadas.";
        aviso = total > 0;
    } else {
        let dias = Math.floor((Date.now() - ultimo.getTime()) / 86400000);
        let quando = dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
        texto = `Último backup: ${ultimo.toLocaleDateString("pt-PT")} (${quando}).`;
        aviso = dias > 30;
        if (aviso) texto += " Já passou mais de um mês — convém fazer outro.";
    }

    elementos.forEach(el => {
        el.textContent = texto;
        el.classList.toggle("estado-backup-aviso", aviso);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarEstadoBackup();
    let v = document.getElementById("versaoApp");
    if (v) v.textContent = APP_VERSAO;
});
