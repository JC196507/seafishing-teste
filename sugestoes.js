// sugestoes.js
// Registo rápido: sugere a fase da lua e o período do dia (calculados offline a
// partir da data/hora e da posição) e mantém as condições da saída entre capturas.
// São SUGESTÕES: ficam pré-preenchidas e podes mudá-las. Nada é gravado aqui.

const SINODICO = 29.530588853;                 // duração média de uma lunação, em dias
const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14); // uma lua nova de referência (UTC)
const POSICAO_PADRAO = { lat: 40.6, lng: -8.7 };   // costa de Aveiro, se o local não tiver posição no mapa

// ===== Funções puras (só calculam) =====

function idadeDaLua(ms) {
    let idade = ((ms - LUA_NOVA_REF) / 86400000) % SINODICO;
    return idade < 0 ? idade + SINODICO : idade;
}

// Quatro fases, cada uma centrada na sua fase principal (±1/8 do ciclo).
// Usa a lunação média, por isso junto às fronteiras pode errar cerca de meio dia.
function faseDaLua(ms) {
    let idade = idadeDaLua(ms);
    let q = SINODICO / 8;
    if (idade < q || idade >= 7 * q) return "Nova";
    if (idade < 3 * q) return "Crescente";
    if (idade < 5 * q) return "Cheia";
    return "Minguante";
}

// Nascer, meio-dia solar e pôr do sol (em ms UTC) para o dia UTC de 'ms'.
// Equação do nascer do sol (precisão de alguns minutos). Devolve null se o sol
// não nasce ou não se põe nesse dia (latitudes polares).
function solNascerPor(ms, lat, lng) {
    const rad = Math.PI / 180;
    let n = Math.floor(ms / 86400000) - 10957;   // dias desde 2000-01-01 12:00 UTC
    let jEstrela = n - lng / 360;
    let M = (357.5291 + 0.98560028 * jEstrela) % 360;
    let C = 1.9148 * Math.sin(M * rad) + 0.0200 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    let lambda = (M + C + 180 + 102.9372) % 360;
    let jTransito = 2451545 + jEstrela + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
    let sinDelta = Math.sin(lambda * rad) * Math.sin(23.4397 * rad);
    let cosDelta = Math.cos(Math.asin(sinDelta));
    let cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * sinDelta) / (Math.cos(lat * rad) * cosDelta);
    if (cosW > 1 || cosW < -1) return null;
    let w = Math.acos(cosW) / rad;
    let paraMs = j => (j - 2440587.5) * 86400000;
    return { nascer: paraMs(jTransito - w / 360), meioDia: paraMs(jTransito), por: paraMs(jTransito + w / 360) };
}

// Amanhecer/Escurecer: 1 h antes até 1 h depois do nascer/pôr do sol.
function periodoDoDia(ms, lat, lng) {
    let s = solNascerPor(ms, lat, lng);
    if (!s) return null;
    const H = 3600000;
    if (ms >= s.nascer - H && ms < s.nascer + H) return "Amanhecer";
    if (ms >= s.nascer + H && ms < s.meioDia) return "Manha";
    if (ms >= s.meioDia && ms < s.por - H) return "Tarde";
    if (ms >= s.por - H && ms < s.por + H) return "Escurecer";
    return "Noite";
}

function hojeISO(d) {
    d = d || new Date();
    let p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dataISOaoMeioDia(iso) {
    let [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d, 12, 0, 0);
}

// ===== Ligação ao formulário =====

const CAMPOS_CONDICOES = ["dataCaptura", "concelho", "local", "tipoPesca", "tipoIsco", "mare", "lua", "periodoDia"];
let sugestaoAnterior = { data: null, lua: null, periodoDia: null };

function posicaoParaSugestao() {
    let local = document.getElementById("local").value;
    let c = (typeof obterCoordsLocais === "function" && local) ? obterCoordsLocais()[local] : null;
    return (typeof coordenadaValida === "function" && coordenadaValida(c)) ? { lat: c.lat, lng: c.lng } : POSICAO_PADRAO;
}

// Preenche data, lua e período SÓ quando estão vazios ou ainda têm a última sugestão
// (se mudares um campo à mão, deixa de lhe mexer).
function aplicarSugestoesRegisto() {
    if (typeof idEdicaoAtual !== "undefined" && idEdicaoAtual) return; // a editar: não mexe

    let campoData = document.getElementById("dataCaptura");
    let campoLua = document.getElementById("lua");
    let campoPeriodo = document.getElementById("periodoDia");
    let hoje = hojeISO();

    if (!campoData.value || campoData.value === sugestaoAnterior.data) {
        campoData.value = hoje;
        sugestaoAnterior.data = hoje;
    }
    let dataEscolhida = campoData.value;
    if (!dataEscolhida) { atualizarResumoCondicoes(); return; }

    let lua = faseDaLua(dataISOaoMeioDia(dataEscolhida).getTime());
    if (!campoLua.value || campoLua.value === sugestaoAnterior.lua) {
        campoLua.value = lua;
        sugestaoAnterior.lua = lua;
    }

    if (dataEscolhida === hoje) {
        let pos = posicaoParaSugestao();
        let periodo = periodoDoDia(Date.now(), pos.lat, pos.lng);
        if (periodo && (!campoPeriodo.value || campoPeriodo.value === sugestaoAnterior.periodoDia)) {
            campoPeriodo.value = periodo;
            sugestaoAnterior.periodoDia = periodo;
        }
    } else if (campoPeriodo.value && campoPeriodo.value === sugestaoAnterior.periodoDia) {
        // Data passada: a hora de agora não serve; obriga a escolher conscientemente
        campoPeriodo.value = "";
        sugestaoAnterior.periodoDia = null;
    }
    atualizarResumoCondicoes();
}

function textoSelecionado(id) {
    let campo = document.getElementById(id);
    if (!campo || !campo.value) return "";
    let opcao = campo.options && campo.options[campo.selectedIndex];
    return opcao ? opcao.textContent : campo.value;
}

// Atualiza a linha-resumo das condições; devolve true se estiverem todas preenchidas.
function atualizarResumoCondicoes() {
    let completo = CAMPOS_CONDICOES.every(id => {
        let campo = document.getElementById(id);
        return campo && campo.value;
    });
    let resumo = document.getElementById("condicoesResumo");
    if (resumo) {
        resumo.textContent = completo
            ? ["local", "tipoPesca", "tipoIsco", "mare", "lua", "periodoDia"].map(textoSelecionado).join(" · ")
            : "Por preencher";
    }
    return completo;
}

function abrirCondicoes() {
    let d = document.getElementById("condicoesSaida");
    if (d) d.open = true;
}

// Chamado ao abrir o ecrã de registo
function aoMostrarRegisto() {
    aplicarSugestoesRegisto();
    let completo = atualizarResumoCondicoes();
    let editar = typeof idEdicaoAtual !== "undefined" && idEdicaoAtual;
    if (!completo || editar) abrirCondicoes();
}

// Chamado depois de gravar uma NOVA captura: mantém as condições, recolhe-as para o
// próximo registo ser só peixe + peso + tamanho, e volta ao topo para ver a mensagem.
function aposGravarRapido() {
    aplicarSugestoesRegisto();   // o período pode ter mudado desde o registo anterior
    let d = document.getElementById("condicoesSaida");
    if (d && atualizarResumoCondicoes()) d.open = false;
    if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
}

// Depois de gravar uma EDIÇÃO: formulário limpo e condições abertas
function aposGravarEdicao() {
    sugestaoAnterior = { data: null, lua: null, periodoDia: null };
    aplicarSugestoesRegisto();
    abrirCondicoes();
    if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
}

// Botão "Nova saída": limpa tudo (também serve para cancelar uma edição)
function novaSaida() {
    if (typeof cancelarEdicao === "function") cancelarEdicao();
    limparFormularioRegistro();
    atualizarLocaisOrdenados();
    sugestaoAnterior = { data: null, lua: null, periodoDia: null };
    aplicarSugestoesRegisto();
    abrirCondicoes();
}

document.addEventListener("DOMContentLoaded", () => {
    let data = document.getElementById("dataCaptura");
    if (data) data.addEventListener("change", aplicarSugestoesRegisto);
    let condicoes = document.getElementById("condicoesSaida");
    if (condicoes) condicoes.addEventListener("change", atualizarResumoCondicoes);
});
