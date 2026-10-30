// inicio.js
// Ecrã inicial: resumo do ano e última captura, calculado a partir dos dados
// já guardados (através de dados.js). Não grava nada.

function inicioFormatarKg(gramas) {
    return (gramas / 1000).toLocaleString("pt-PT", { maximumFractionDigits: 2 }) + " kg";
}

// "2026-10-12" -> "12/10/2026" (sem usar Date, para não haver problemas de fuso horário)
function inicioFormatarData(data) {
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (data || "");
}

// Função pura: só calcula, não mexe na página.
function inicioCalcularResumo(capturas, ano) {
    let doAno = capturas.filter(c => c.data && c.data.startsWith(String(ano)));
    let maiorAno = null;
    doAno.forEach(c => {
        let peso = Number(c.peso) || 0;
        if (!maiorAno || peso > maiorAno.peso) maiorAno = { peso, tipoPeixe: c.tipoPeixe, local: c.local };
    });
    // Última = data mais recente; em caso de empate, a registada mais tarde
    let ultima = null;
    capturas.forEach(c => {
        if (c.data && (!ultima || c.data >= ultima.data)) ultima = c;
    });
    return {
        total: capturas.length,
        ano,
        nAno: doAno.length,
        pesoAno: doAno.reduce((soma, c) => soma + (Number(c.peso) || 0), 0),
        maiorAno,
        ultima
    };
}

function inicioHtmlResumo(r) {
    if (r.total === 0) {
        return '<p class="inicio-vazio">Ainda não tens capturas registadas.<br>Toca em «Registar captura» para guardar a primeira.</p>';
    }

    let html = "";
    if (r.nAno > 0) {
        html += `<p class="inicio-titulo">Em ${escaparHTML(String(r.ano))}</p>` +
            '<div class="inicio-stats">' +
            `<div class="inicio-stat"><strong>${r.nAno}</strong><span>capturas</span></div>` +
            `<div class="inicio-stat"><strong>${inicioFormatarKg(r.pesoAno)}</strong><span>peso total</span></div>` +
            `<div class="inicio-stat"><strong>${inicioFormatarKg(r.maiorAno.peso)}</strong><span>maior: ${escaparHTML(r.maiorAno.tipoPeixe || "?")}</span></div>` +
            "</div>";
    } else {
        html += `<p class="inicio-vazio">Ainda sem capturas em ${escaparHTML(String(r.ano))}. Tens ${r.total} no total.</p>`;
    }

    if (r.ultima) {
        let partes = [inicioFormatarData(r.ultima.data), r.ultima.tipoPeixe, inicioFormatarKg(Number(r.ultima.peso) || 0), r.ultima.local]
            .filter(Boolean).map(p => escaparHTML(String(p)));
        html += `<p class="inicio-ultima"><strong>Última captura:</strong> ${partes.join(" · ")}</p>`;
    }
    return html;
}

function inicioAtualizar() {
    let el = document.getElementById("inicioResumo");
    if (!el) return;
    el.innerHTML = inicioHtmlResumo(inicioCalcularResumo(obterCapturas(), new Date().getFullYear()));
    if (typeof atualizarEstadoBackup === "function") atualizarEstadoBackup();
}
