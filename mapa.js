// mapa.js
// Mapa dos locais de pesca (Leaflet + OpenStreetMap, gratuito e sem conta).
// As posições são marcadas por ti (toque no mapa ou GPS) e ficam guardadas por
// nome de local, através de dados.js. Nenhuma coordenada é inventada.

let mapaLeaflet = null;
let mapaCamada = null;
let mapaMarcadores = {};
let mapaLocalEmMarcacao = null;

function mapaDisponivel() {
    return typeof L !== "undefined";
}

// ===== Funções puras (calculam, não mexem na página) =====

function mapaFormatarKg(gramas) {
    return (gramas / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 2 }) + " kg";
}

// { "Califa": { n, pesoTotal, pesoMedio, maior: {peso, tipoPeixe}|null, especieFreq }, ... }
function mapaCalcularStats(capturas) {
    let porLocal = {};
    capturas.forEach(c => {
        if (!c.local) return;
        let s = porLocal[c.local];
        if (!s) s = porLocal[c.local] = { n: 0, pesoTotal: 0, maior: null, especies: {} };
        let peso = Number(c.peso) || 0;
        s.n++;
        s.pesoTotal += peso;
        if (!s.maior || peso > s.maior.peso) s.maior = { peso, tipoPeixe: c.tipoPeixe };
        if (c.tipoPeixe) s.especies[c.tipoPeixe] = (s.especies[c.tipoPeixe] || 0) + 1;
    });
    Object.values(porLocal).forEach(s => {
        s.pesoMedio = s.n ? s.pesoTotal / s.n : 0;
        let freq = Object.entries(s.especies).sort((a, b) => b[1] - a[1]);
        s.especieFreq = freq.length ? freq[0][0] : null;
        delete s.especies;
    });
    return porLocal;
}

// t entre 0 e 1: azul claro -> azul escuro
function mapaCorEscala(t) {
    t = Math.max(0, Math.min(1, t));
    let de = [156, 201, 242], para = [6, 52, 92];
    let c = de.map((v, i) => Math.round(v + (para[i] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function mapaRaio(n) {
    if (!n) return 6;
    return Math.min(18, Math.round(7 + Math.sqrt(n) * 3));
}

function mapaValorMetrica(stats, metrica) {
    if (!stats) return 0;
    if (metrica === "peso") return stats.pesoTotal;
    if (metrica === "medio") return stats.pesoMedio;
    return stats.n;
}

function mapaTodosLocais(stats) {
    let nomes = new Set(todosOsNomesDeLocais());
    Object.keys(stats).forEach(n => nomes.add(n)); // locais antigos que já não estão na lista
    return [...nomes];
}

// ===== Leitura dos controlos =====

function mapaCapturasFiltradas() {
    let sel = document.getElementById("mapaAno");
    let ano = sel ? sel.value : "";
    let todas = obterCapturas();
    return ano ? todas.filter(c => c.data && c.data.startsWith(ano)) : todas;
}

function mapaLocalSelecionado() {
    let sel = document.getElementById("mapaLocalSelect");
    return sel && sel.value ? sel.value : null;
}

function mapaMensagem(texto, tipo) {
    let el = document.getElementById("mapaEstado");
    if (!el) return;
    el.textContent = texto || "";
    el.style.display = texto ? "block" : "none";
    el.classList.toggle("estado-backup-aviso", tipo === "aviso");
}

// ===== Desenho =====

function mapaPreencherAnos() {
    let sel = document.getElementById("mapaAno");
    if (!sel) return;
    let atual = sel.value;
    let anos = [...new Set(obterCapturas().map(c => c.data ? c.data.slice(0, 4) : null).filter(Boolean))].sort().reverse();
    sel.innerHTML = '<option value="">Todos os anos</option>' + anos.map(a => `<option value="${escaparHTML(a)}">${escaparHTML(a)}</option>`).join("");
    if (anos.includes(atual)) sel.value = atual;
}

function mapaPreencherSelect(stats, coords) {
    let sel = document.getElementById("mapaLocalSelect");
    if (!sel) return;
    let atual = sel.value;
    let nomes = mapaTodosLocais(stats).sort((a, b) => a.localeCompare(b, "pt"));
    let tem = n => coordenadaValida(coords[n]);
    let opt = n => `<option value="${escaparHTML(n)}">${escaparHTML(n)}</option>`;

    let semPos = nomes.filter(n => stats[n] && !tem(n));
    let comPos = nomes.filter(n => tem(n));
    let outros = nomes.filter(n => !tem(n) && !stats[n]);

    let html = '<option value="">Escolhe um local</option>';
    if (semPos.length) html += `<optgroup label="Com capturas, por marcar (${semPos.length})">${semPos.map(opt).join("")}</optgroup>`;
    if (comPos.length) html += `<optgroup label="Já marcados (${comPos.length})">${comPos.map(opt).join("")}</optgroup>`;
    if (outros.length) html += `<optgroup label="Sem capturas">${outros.map(opt).join("")}</optgroup>`;
    sel.innerHTML = html;
    if (atual && nomes.includes(atual)) sel.value = atual;
}

function mapaDesenharTabela(stats, coords) {
    let corpo = document.getElementById("mapaTabelaCorpo");
    let resumo = document.getElementById("mapaResumo");
    let locaisComCapturas = Object.keys(stats).sort((a, b) => stats[b].n - stats[a].n || a.localeCompare(b, "pt"));
    let marcados = locaisComCapturas.filter(n => coordenadaValida(coords[n])).length;

    if (resumo) {
        resumo.textContent = locaisComCapturas.length
            ? `${locaisComCapturas.length} locais com capturas · ${marcados} já marcados no mapa.`
            : "Ainda não há capturas neste período.";
    }
    if (!corpo) return;
    corpo.innerHTML = locaisComCapturas.map(n => {
        let s = stats[n];
        let pos = coordenadaValida(coords[n]) ? "no mapa" : "por marcar";
        return `<tr data-local="${escaparHTML(n)}"><td>${escaparHTML(n)}</td><td>${s.n}</td><td>${mapaFormatarKg(s.pesoTotal)}</td><td>${pos}</td></tr>`;
    }).join("");
}

function mapaHtmlPopup(local, s) {
    let nome = `<strong>${escaparHTML(local)}</strong><br>`;
    if (!s) return nome + "Sem capturas neste período.";
    return nome +
        `${s.n} captura(s)<br>` +
        `Peso total: ${mapaFormatarKg(s.pesoTotal)}<br>` +
        `Peso médio: ${mapaFormatarKg(s.pesoMedio)}<br>` +
        `Maior: ${escaparHTML(s.maior.tipoPeixe || "?")}, ${mapaFormatarKg(s.maior.peso)}<br>` +
        (s.especieFreq ? `Mais frequente: ${escaparHTML(s.especieFreq)}` : "");
}

function mapaDesenharMarcadores(stats, coords, ajustar) {
    if (!mapaLeaflet || !mapaCamada) return;
    mapaCamada.clearLayers();
    mapaMarcadores = {};

    let metricaSel = document.getElementById("mapaMetrica");
    let metrica = metricaSel && metricaSel.value ? metricaSel.value : "n";
    let marcados = Object.keys(coords).filter(n => coordenadaValida(coords[n]));

    let valores = marcados.filter(n => stats[n]).map(n => mapaValorMetrica(stats[n], metrica));
    let min = valores.length ? Math.min(...valores) : 0;
    let max = valores.length ? Math.max(...valores) : 0;

    marcados.forEach(n => {
        let s = stats[n] || null;
        let t = s ? (max === min ? 1 : (mapaValorMetrica(s, metrica) - min) / (max - min)) : 0;
        let marcador = L.circleMarker([coords[n].lat, coords[n].lng], {
            radius: mapaRaio(s ? s.n : 0),
            color: "#ffffff",
            weight: 2,
            fillColor: s ? mapaCorEscala(t) : "#8A7B68",
            fillOpacity: 0.9
        });
        marcador.bindPopup(mapaHtmlPopup(n, s));
        marcador.on("click", () => {
            let sel = document.getElementById("mapaLocalSelect");
            if (sel) sel.value = n;
        });
        marcador.addTo(mapaCamada);
        mapaMarcadores[n] = marcador;
    });

    if (ajustar && marcados.length) {
        let pontos = marcados.map(n => [coords[n].lat, coords[n].lng]);
        mapaLeaflet.fitBounds(pontos, { padding: [30, 30], maxZoom: 14 });
    }
}

function mapaAtualizar(ajustar) {
    let stats = mapaCalcularStats(mapaCapturasFiltradas());
    let coords = obterCoordsLocais();
    mapaPreencherSelect(stats, coords);
    mapaDesenharTabela(stats, coords);
    mapaDesenharMarcadores(stats, coords, ajustar);
}

// ===== Ciclo de vida =====

function mapaInicializar() {
    if (mapaLeaflet) return true;
    let aviso = document.getElementById("mapaAviso");
    if (!mapaDisponivel()) {
        if (aviso) {
            aviso.textContent = "O mapa precisa de ligação à internet (os mapas vêm do OpenStreetMap). Liga-te e volta a abrir este separador. A tabela em baixo funciona sempre.";
            aviso.style.display = "block";
        }
        return false;
    }
    try {
        mapaLeaflet = L.map("mapaContainer", { zoomControl: true }).setView([40.2, -8.6], 7);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
        }).addTo(mapaLeaflet);
        mapaCamada = L.layerGroup().addTo(mapaLeaflet);
        mapaLeaflet.on("click", mapaAoClicarNoMapa);
        if (aviso) aviso.style.display = "none";
        return true;
    } catch (erro) {
        console.error("Erro ao criar o mapa:", erro);
        mapaLeaflet = null;
        if (aviso) {
            aviso.textContent = "Não foi possível mostrar o mapa neste momento.";
            aviso.style.display = "block";
        }
        return false;
    }
}

// Chamado pelo mostrarSecao() sempre que abres o separador
function aoMostrarMapa() {
    let acabouDeCriar = !mapaLeaflet;
    mapaInicializar();
    mapaPreencherAnos();
    mapaAtualizar(acabouDeCriar);
    if (mapaLeaflet) setTimeout(() => mapaLeaflet.invalidateSize(), 80);
}

// ===== Marcar posições =====

function mapaDefinirPosicao(local, lat, lng) {
    let nova = { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
    if (!coordenadaValida(nova)) {
        mapaMensagem("Posição inválida.", "aviso");
        return false;
    }
    let coords = obterCoordsLocais();
    coords[local] = nova;
    if (!guardarCoordsLocais(coords)) return false;
    mapaMensagem(`Posição de "${local}" guardada.`);
    mapaAtualizar(false);
    if (mapaLeaflet) {
        mapaLeaflet.setView([nova.lat, nova.lng], Math.max(mapaLeaflet.getZoom(), 13));
        if (mapaMarcadores[local]) mapaMarcadores[local].openPopup();
    }
    return true;
}

function mapaPedirConfirmacaoSeJaMarcado(local) {
    if (coordenadaValida(obterCoordsLocais()[local])) {
        return confirm(`"${local}" já tem posição. Queres substituí-la?`);
    }
    return true;
}

function mapaSairDoModoMarcar() {
    mapaLocalEmMarcacao = null;
    let c = document.getElementById("mapaContainer");
    if (c) c.classList.remove("mapa-marcando");
}

function mapaModoMarcar() {
    let local = mapaLocalSelecionado();
    if (!local) { mapaMensagem("Escolhe primeiro o local na lista.", "aviso"); return; }
    if (!mapaLeaflet) { mapaMensagem("O mapa não está disponível. Podes usar o botão do GPS.", "aviso"); return; }
    if (!mapaPedirConfirmacaoSeJaMarcado(local)) return;
    mapaLocalEmMarcacao = local;
    let c = document.getElementById("mapaContainer");
    if (c) c.classList.add("mapa-marcando");
    mapaMensagem(`Toca no mapa no ponto onde fica "${local}".`, "aviso");
}

function mapaAoClicarNoMapa(e) {
    if (!mapaLocalEmMarcacao) return;
    let local = mapaLocalEmMarcacao;
    mapaSairDoModoMarcar();
    mapaDefinirPosicao(local, e.latlng.lat, e.latlng.lng);
}

function mapaUsarGPS() {
    let local = mapaLocalSelecionado();
    if (!local) { mapaMensagem("Escolhe primeiro o local na lista.", "aviso"); return; }
    if (!navigator.geolocation) { mapaMensagem("Este telemóvel não tem localização disponível.", "aviso"); return; }
    if (!mapaPedirConfirmacaoSeJaMarcado(local)) return;
    mapaMensagem("A obter a tua localização…", "aviso");
    navigator.geolocation.getCurrentPosition(
        pos => {
            if (mapaDefinirPosicao(local, pos.coords.latitude, pos.coords.longitude)) {
                let prec = Math.round(pos.coords.accuracy);
                mapaMensagem(`Posição de "${local}" guardada (precisão ~${prec} m).`);
            }
        },
        err => {
            let msgs = {
                1: "Sem permissão para usar a localização. Autoriza-a nas definições do telemóvel.",
                2: "Não foi possível obter a localização. Experimenta ao ar livre.",
                3: "A localização demorou demasiado. Tenta outra vez."
            };
            mapaMensagem(msgs[err.code] || "Erro ao obter a localização.", "aviso");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function mapaRemoverPosicao() {
    let local = mapaLocalSelecionado();
    if (!local) { mapaMensagem("Escolhe primeiro o local na lista.", "aviso"); return; }
    let coords = obterCoordsLocais();
    if (!coordenadaValida(coords[local])) { mapaMensagem(`"${local}" ainda não tem posição.`, "aviso"); return; }
    if (!confirm(`Remover a posição de "${local}" do mapa?`)) return;
    delete coords[local];
    if (!guardarCoordsLocais(coords)) return;
    mapaMensagem(`Posição de "${local}" removida.`);
    mapaAtualizar(false);
}

function mapaSelecionarLocal(nome) {
    let sel = document.getElementById("mapaLocalSelect");
    if (sel) sel.value = nome;
    let c = obterCoordsLocais()[nome];
    if (mapaLeaflet && coordenadaValida(c)) {
        mapaLeaflet.setView([c.lat, c.lng], Math.max(mapaLeaflet.getZoom(), 13));
        if (mapaMarcadores[nome]) mapaMarcadores[nome].openPopup();
        let cont = document.getElementById("mapaContainer");
        if (cont && cont.scrollIntoView) cont.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        mapaMensagem(`"${nome}" ainda não tem posição: usa "Tocar no mapa" ou o GPS.`, "aviso");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    let corpo = document.getElementById("mapaTabelaCorpo");
    if (corpo) {
        corpo.addEventListener("click", e => {
            let linha = e.target.closest ? e.target.closest("tr") : null;
            if (linha && linha.dataset && linha.dataset.local) mapaSelecionarLocal(linha.dataset.local);
        });
    }
});
