document.addEventListener("DOMContentLoaded", () => {
    // A marca vermelha de «campo em falta» desaparece assim que mexes no campo
    const ecraRegisto = document.getElementById('registo');
    if (ecraRegisto) {
        ['input', 'change'].forEach(ev => ecraRegisto.addEventListener(ev, e => {
            if (e.target && e.target.classList) e.target.classList.remove('campo-em-falta');
        }));
    }
    carregarDados();
    preencherAnos();
    if (typeof preencherAnosComparacao === "function") preencherAnosComparacao();
    limparFormularioRegistro(); // Adicionado para limpar o formulário no carregamento

    document.getElementById("concelho").addEventListener("change", function() {
        atualizarLocaisOrdenados();
    });
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(() => console.log("Service Worker registado!"))
        .catch(error => console.error("Erro no Service Worker:", error));
}

function carregarDados() {
    let concelhoSelect = document.getElementById("concelho");
    let localSelect = document.getElementById("local");

    concelhoSelect.innerHTML = '<option value="">Seleccione um concelho</option>';
    localSelect.innerHTML = '<option value="">Seleccione um local</option>';

    listaConcelhosLocais().forEach(concelho => {
        let option = document.createElement("option");
        option.value = concelho.concelho;
        option.textContent = concelho.concelho;
        concelhoSelect.appendChild(option);
    });
}

function construirTabelaCapturas() {
    const container = document.getElementById("containerCapturas");
    container.innerHTML = `
        <table id="tabelaCapturas">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Tipo de Peixe</th>
                    <th>Peso (g)</th>
                    <th>Tamanho (cm)</th>
                    <th>Local</th>
                    <th>Tipo de Pesca</th>
                    <th>Maré</th>
                    <th>Lua</th>
                    <th>Período</th>
                    <th>Isco</th>
                    <th>Remover</th>
					<th>Alterar</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;
}

function atualizarLocaisOrdenados() {
    let concelhoSelect = document.getElementById("concelho");
    let localSelect = document.getElementById("local");
    let concelhoSelecionado = concelhoSelect.value;

    localSelect.innerHTML = '<option value="">Seleccione um local</option>';

    if (concelhoSelecionado) {
        let concelhoEncontrado = listaConcelhosLocais().find(c => c.concelho === concelhoSelecionado);
        if (concelhoEncontrado) {
            concelhoEncontrado.locais.forEach(local => {
                let option = document.createElement("option");
                option.value = local;
                option.textContent = local;
                localSelect.appendChild(option);
            });
        }
    }
}

// ===== Validação do registo: diz exatamente o que falta ou está errado =====
const ROTULOS_CAMPOS = {
    tipoPeixe: 'Espécie', peso: 'Peso', tamanho: 'Tamanho', dataCaptura: 'Data', concelho: 'Concelho',
    local: 'Local', tipoPesca: 'Técnica de pesca', tipoIsco: 'Isco', mare: 'Maré', lua: 'Lua', periodoDia: 'Período do dia'
};
const ORDEM_CAMPOS_CAPTURA = ['tipoPeixe', 'peso', 'tamanho', 'dataCaptura', 'concelho', 'local', 'tipoPesca', 'tipoIsco', 'mare', 'lua', 'periodoDia'];
const ORDEM_CAMPOS_GRADE = ['dataCaptura', 'concelho', 'local', 'tipoPesca', 'tipoIsco', 'mare', 'lua', 'periodoDia'];
const IDS_DAS_CONDICOES = ['dataCaptura', 'concelho', 'local', 'tipoPesca', 'tipoIsco', 'mare', 'lua', 'periodoDia'];

// Data de hoje no relógio do telemóvel (AAAA-MM-DD). Compara-se como texto: ao contrário de
// new Date('AAAA-MM-DD') (que é meia-noite UTC), não recusa «hoje» entre as 00:00 e as 01:00 no verão.
function hojeLocalISO() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function problemasDoRegisto(ids) {
    const faltam = [], erros = [];
    const valor = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    ids.forEach(id => { const v = valor(id); if (v === '' || v === null || v === undefined) faltam.push(id); });
    const preenchido = id => ids.includes(id) && !faltam.includes(id);
    if (preenchido('peso')) {
        const p = parseInt(valor('peso'));
        if (isNaN(p) || p <= 100 || p > 100000) erros.push({ id: 'peso', texto: 'o peso tem de estar entre 101 e 100 000 gramas' });
    }
    if (preenchido('tamanho')) {
        const t = parseInt(valor('tamanho'));
        if (isNaN(t) || t <= 10 || t > 300) erros.push({ id: 'tamanho', texto: 'o tamanho tem de estar entre 11 e 300 cm' });
    }
    if (preenchido('dataCaptura')) {
        const d = valor('dataCaptura');
        if (isNaN(new Date(d).getTime())) erros.push({ id: 'dataCaptura', texto: 'a data não é válida' });
        else if (d > hojeLocalISO()) erros.push({ id: 'dataCaptura', texto: 'a data não pode ser no futuro' });
    }
    return { faltam, erros };
}

function listaEmTexto(itens) {
    if (itens.length <= 1) return itens.join('');
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
}

function mensagemDeProblemas(p) {
    const partes = [];
    if (p.faltam.length) partes.push('Falta preencher: ' + listaEmTexto(p.faltam.map(id => ROTULOS_CAMPOS[id] || id)) + '.');
    if (p.erros.length) partes.push('Verifica: ' + listaEmTexto(p.erros.map(e => e.texto)) + '.');
    return partes.join(' ');
}

function limparMarcasCampos() {
    ORDEM_CAMPOS_CAPTURA.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.classList) el.classList.remove('campo-em-falta');
    });
}

// Mostra a mensagem, destaca os campos, abre as condições se for preciso e leva-te ao primeiro
function mostrarProblemas(p, ordem) {
    limparMarcasCampos();   // tira as marcas de tentativas anteriores: só ficam os problemas de agora
    exibirMensagem('error', mensagemDeProblemas(p));
    const ids = p.faltam.concat(p.erros.map(e => e.id));
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.classList) el.classList.add('campo-em-falta');
    });
    if (ids.some(id => IDS_DAS_CONDICOES.includes(id)) && typeof abrirCondicoes === 'function') abrirCondicoes();
    const primeiro = ordem.find(id => ids.includes(id));
    const el = primeiro ? document.getElementById(primeiro) : null;
    if (el) {
        if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el.focus) el.focus({ preventScroll: true });
    }
}

function gravarCaptura() {
    // O período do dia (e a lua) sugeridos acompanham a hora de agora enquanto não os mudares à mão
    if (typeof aplicarSugestoesRegisto === 'function') aplicarSugestoesRegisto();
    let data = document.getElementById("dataCaptura").value;
    let peso = parseInt(document.getElementById("peso").value);
    let tamanho = parseInt(document.getElementById("tamanho").value);
    let concelho = document.getElementById("concelho").value;
    let localSelect = document.getElementById("local");
    let local = localSelect.value;
    let tipoIsco = document.getElementById("tipoIsco").value;

    // Novos campos
    let tipoPeixe = document.getElementById("tipoPeixe").value;
    let tipoPesca = document.getElementById("tipoPesca").value;
    let mare = document.getElementById("mare").value;
    let lua = document.getElementById("lua").value;
    let periodoDia = document.getElementById("periodoDia").value;

    const problemas = problemasDoRegisto(ORDEM_CAMPOS_CAPTURA);
    if (problemas.faltam.length || problemas.erros.length) {
        mostrarProblemas(problemas, ORDEM_CAMPOS_CAPTURA);
        return;
    }

    let capturas = obterCapturas();
    let novaCaptura = { data, peso, tamanho, local, tipoIsco, tipoPeixe, tipoPesca, mare, lua, periodoDia };
    const eraEdicao = Boolean(idEdicaoAtual);

    if (idEdicaoAtual) {
        // Estamos a guardar uma edição: substitui o registo original em vez de o duplicar
        let index = capturas.findIndex(c => chaveCaptura(c) === idEdicaoAtual);
        if (index !== -1) {
            novaCaptura.id = capturas[index].id || gerarIdCaptura();
            capturas[index] = novaCaptura;
        } else {
            // Não encontrámos o registo original (raro); grava como novo para não perder os dados
            novaCaptura.id = gerarIdCaptura();
            capturas.push(novaCaptura);
        }
        idEdicaoAtual = null;
        document.getElementById('botaoGravar').innerHTML = '<i class="fas fa-save"></i> Gravar';
    } else {
        novaCaptura.id = gerarIdCaptura();
        capturas.push(novaCaptura);
    }

    if (!guardarCapturas(capturas)) return;

    exibirMensagem('success', 'Registo gravado com sucesso!');
    limparMarcasCampos();
    if (eraEdicao) {
        limparFormularioRegistro();
        atualizarLocaisOrdenados();
        if (typeof aposGravarEdicao === 'function') aposGravarEdicao();
    } else {
        // Registo rápido: mantém local e condições, limpa só o que muda a cada peixe
        limparCamposDaCaptura();
        if (typeof aposGravarRapido === 'function') aposGravarRapido();
    }
    preencherAnos();
}

// Identifica uma captura de forma estável mesmo em registos antigos sem "id"
let idEdicaoAtual = null;

function gerarIdCaptura() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function chaveCaptura(c) {
    return c.id || [c.data, c.peso, c.tamanho, c.local, c.tipoIsco, c.tipoPeixe, c.tipoPesca, c.mare, c.lua, c.periodoDia].join("|");
}

function exportarDados() {
    let conteudo = JSON.stringify({
        formato: "pesca-ludica-backup",
        versao: 4,
        exportadoEm: new Date().toISOString(),
        capturas: obterCapturas(),
        locaisCoords: obterCoordsLocais(),
        grades: obterGrades(),
        listas: obterListas()
    });
    let blob = new Blob([conteudo], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    let dataHoje = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pesca-ludica-backup-${dataHoje}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    registarBackup();
    exibirMensagem('success', 'Backup exportado com sucesso! Guarda o ficheiro num sítio seguro.');
}

function todosOsNomesDeLocais() {
    return listaConcelhosLocais().flatMap(c => c.locais);
}

function escaparHTML(texto) {
    if (typeof texto !== 'string') return texto;
    return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizarCaptura(c) {
    let camposTexto = ['data', 'local', 'tipoIsco', 'tipoPeixe', 'tipoPesca', 'mare', 'lua', 'periodoDia'];
    let limpa = { ...c };
    camposTexto.forEach(campo => { limpa[campo] = escaparHTML(limpa[campo]); });
    limpa.peso = Number(limpa.peso) || 0;
    limpa.tamanho = Number(limpa.tamanho) || 0;
    return limpa;
}

function importarDados(event) {
    let ficheiro = event.target.files[0];
    if (!ficheiro) return;

    let leitor = new FileReader();
    leitor.onload = function (e) {
        try {
            let bruto = JSON.parse(e.target.result);
            let modoRadio = document.querySelector('input[name="modoImportacao"]:checked');
            let modo = modoRadio ? modoRadio.value : "juntar";
            let listasAcrescentadas = 0;
            let dadosImportados;
            let coordsImportadas = null; // só existe em backups do formato novo
            let gradesImportadas = null;  // só existe em backups com grades
            if (Array.isArray(bruto)) {
                dadosImportados = bruto; // formato antigo: só capturas
            } else if (bruto && Array.isArray(bruto.capturas)) {
                dadosImportados = bruto.capturas;
                // As listas entram PRIMEIRO: as posições e as grades do backup podem referir locais ou iscos
                // que só existem nas listas do backup.
                if (bruto.listas && typeof bruto.listas === 'object' && !Array.isArray(bruto.listas) && typeof listaFiltrarImportadas === 'function') {
                    listasAcrescentadas = listaImportar(listaFiltrarImportadas(bruto.listas), modo);
                    if (listasAcrescentadas < 0) return;   // não conseguiu gravar
                }
                coordsImportadas = filtrarCoordsImportadas(bruto.locaisCoords, todosOsNomesDeLocais());
                if (Array.isArray(bruto.grades) && typeof filtrarGradesImportadas === 'function') {
                    gradesImportadas = filtrarGradesImportadas(bruto.grades, todosOsNomesDeLocais());
                }
            } else {
                throw new Error("Formato inválido");
            }
            dadosImportados = dadosImportados.map(sanitizarCaptura);

            if (modo === "substituir") {
                dadosImportados.forEach(c => { if (!c.id) c.id = gerarIdCaptura(); });
                if (!guardarCapturas(dadosImportados)) return;
                exibirMensagem('success', `${dadosImportados.length} capturas importadas (substituíram os dados anteriores).`);
            } else {
                let capturasAtuais = obterCapturas();
                let chavesExistentes = new Set(capturasAtuais.map(c => chaveCaptura(c)));
                let novas = dadosImportados.filter(c => !chavesExistentes.has(chaveCaptura(c)));
                novas.forEach(c => { if (!c.id) c.id = gerarIdCaptura(); });
                let combinadas = capturasAtuais.concat(novas);
                if (!guardarCapturas(combinadas)) return;
                let repetidas = dadosImportados.length - novas.length;
                exibirMensagem('success', `${novas.length} novas capturas importadas${repetidas ? ` (${repetidas} já existiam e foram ignoradas)` : ''}.`);
            }

            if (coordsImportadas) {
                let atuais = obterCoordsLocais();
                let combinadasCoords = modo === "substituir" ? { ...coordsImportadas } : { ...coordsImportadas, ...atuais };
                if (guardarCoordsLocais(combinadasCoords)) {
                    let n = Object.keys(combinadasCoords).length;
                    if (n) exibirMensagem('success', `Posições dos locais no mapa: ${n}.`);
                }
            }

            if (gradesImportadas) {
                if (modo === "substituir") {
                    if (guardarGrades(gradesImportadas)) exibirMensagem('success', `${gradesImportadas.length} grade(s) importada(s).`);
                } else {
                    let juntas = juntarGrades(obterGrades(), gradesImportadas);
                    if (juntas.adicionadas && guardarGrades(juntas.finais)) exibirMensagem('success', `${juntas.adicionadas} grade(s) nova(s) importada(s).`);
                }
            }

            if (listasAcrescentadas > 0) exibirMensagem('success', `Listas: ${listasAcrescentadas} item(ns) acrescentado(s).`);

            preencherAnos();
            setTimeout(atualizarLocaisOrdenados, 0);
            atualizarEstadoBackup();
        } catch (err) {
            console.error('Erro ao importar o backup:', err);
            exibirMensagem('error', 'Ficheiro inválido. Confirma que é um backup exportado por esta app.');
        }
        event.target.value = "";
    };
    leitor.readAsText(ficheiro);
}

// Limpa só o que muda a cada peixe (espécie, peso, tamanho)
function limparCamposDaCaptura() {
    document.getElementById('tipoPeixe').selectedIndex = 0;
    document.getElementById('peso').value = '';
    document.getElementById('tamanho').value = '';
}

// Sai do modo de edição sem alterar nem apagar o registo original
function cancelarEdicao() {
    idEdicaoAtual = null;
    document.getElementById('botaoGravar').innerHTML = '<i class="fas fa-save"></i> Gravar';
}

function limparFormularioRegistro() {
    document.getElementById('dataCaptura').value = '';
    document.getElementById('peso').value = '';
    document.getElementById('tamanho').value = '';
    document.getElementById('concelho').selectedIndex = 0;
    document.getElementById('local').selectedIndex = 0;
    document.getElementById('tipoIsco').selectedIndex = 0;
    document.getElementById('tipoPeixe').selectedIndex = 0;
    document.getElementById('tipoPesca').selectedIndex = 0;
    document.getElementById('mare').selectedIndex = 0;
    document.getElementById('lua').selectedIndex = 0;
    document.getElementById('periodoDia').selectedIndex = 0;
}

function consultarCapturas() {
	construirTabelaCapturas();
    let ano = document.getElementById("anoConsulta").value;
    let capturas = obterCapturas();
    let filtradas = capturas.filter(c => c.data.startsWith(ano));
    filtradas.sort((a, b) => new Date(a.data) - new Date(b.data));

    let tabela = document.getElementById("tabelaCapturas").querySelector("tbody");
    tabela.innerHTML = "";

    filtradas.forEach(captura => {
        let linha = tabela.insertRow();
        let data = new Date(captura.data);
        let dataFormatada = data.toLocaleDateString("pt-pt");

        linha.insertCell(0).textContent = dataFormatada;
        linha.insertCell(1).textContent = captura.tipoPeixe; // Novo campo
        linha.insertCell(2).textContent = captura.peso.toLocaleString("pt-BR");
        linha.insertCell(3).textContent = captura.tamanho;
        linha.insertCell(4).textContent = captura.local;
        linha.insertCell(5).textContent = captura.tipoPesca; // Novo campo
        linha.insertCell(6).textContent = captura.mare; // Novo campo
        linha.insertCell(7).textContent = captura.lua; // Novo campo
        linha.insertCell(8).textContent = captura.periodoDia; // Novo campo
        linha.insertCell(9).textContent = captura.tipoIsco;

        let btnRemover = document.createElement("button");
        btnRemover.innerHTML = '<i class="fa fa-trash"></i>';
        btnRemover.style.padding = "5px 10px";
        btnRemover.style.fontSize = "16px";
        btnRemover.style.width = "35px";
        btnRemover.style.height = "35px";
        btnRemover.style.border = "none";
        btnRemover.style.backgroundColor = "#ff4d4d";
        btnRemover.style.color = "#ffffff";
        btnRemover.style.borderRadius = "50%";
        btnRemover.style.cursor = "pointer";
        btnRemover.style.display = "block";
        btnRemover.style.margin = "0 auto";
        btnRemover.onclick = () => removerCaptura(captura);
        linha.insertCell(10).appendChild(btnRemover); // A coluna de remover agora está no índice 10
    
	let btnEditar = document.createElement("button");
	btnEditar.innerHTML = '<i class="fas fa-edit"></i>';
	btnEditar.style.padding = "5px 10px";
	btnEditar.style.fontSize = "16px";
	btnEditar.style.width = "35px";
	btnEditar.style.height = "35px";
	btnEditar.style.border = "none";
	btnEditar.style.backgroundColor = "#4CAF50";
	btnEditar.style.color = "#ffffff";
	btnEditar.style.borderRadius = "50%";
	btnEditar.style.cursor = "pointer";
	btnEditar.style.display = "block";
	btnEditar.style.margin = "0 auto";
	btnEditar.onclick = () => editarCaptura(captura); // Passa a captura para edição
	linha.insertCell(11).appendChild(btnEditar); // Nova coluna para o botão Editar
		});
document.getElementById("totaisAno").textContent = `Total de capturas: ${filtradas.length}, Peso total: ${filtradas.reduce((acc, c) => acc + c.peso, 0).toLocaleString("pt-BR")}g`;
}

function removerCaptura(captura, isEdicao = false) {
    if (isEdicao || confirm("Tem certeza que deseja remover esta captura?")) {
        let capturas = obterCapturas();
        let chave = chaveCaptura(captura);
        let index = capturas.findIndex(c => chaveCaptura(c) === chave);

        if (index !== -1) {
            capturas.splice(index, 1);
            if (!guardarCapturas(capturas)) return;
            if (!isEdicao) {
                consultarCapturas();
                exibirMensagem("success", "Captura removida com sucesso!");
            }
        } else if (!isEdicao) {
            exibirMensagem("error", "Erro ao remover a captura.");
        }
    }
}

function editarCaptura(captura) {

    // Vai descobrir a que concelho pertence este local, para pré-preencher os dois
    // campos correctamente (antes limpava sempre o concelho, e o local ficava por preencher)
    let concelhoEncontrado = listaConcelhosLocais().find(c => c.locais.includes(captura.local));

    document.getElementById("dataCaptura").value = captura.data;
    document.getElementById("peso").value = captura.peso;
    document.getElementById("tamanho").value = captura.tamanho;
    document.getElementById("concelho").value = concelhoEncontrado ? concelhoEncontrado.concelho : "";
    atualizarLocaisOrdenados();
    document.getElementById("local").value = captura.local;
    document.getElementById("tipoIsco").value = captura.tipoIsco;
    document.getElementById("tipoPeixe").value = captura.tipoPeixe;
    document.getElementById("tipoPesca").value = captura.tipoPesca;
    document.getElementById("mare").value = captura.mare;
    document.getElementById("lua").value = captura.lua;
    document.getElementById("periodoDia").value = captura.periodoDia;

    // Marca esta captura como "em edição" — só é substituída quando o utilizador
    // clicar em Gravar. Se sair sem gravar, o registo original mantém-se intacto.
    idEdicaoAtual = chaveCaptura(captura);
    let botaoGravar = document.getElementById('botaoGravar');
    if (botaoGravar) botaoGravar.innerHTML = '<i class="fas fa-save"></i> Atualizar Registo';

    // Muda para o separador "Registo" para facilitar a edição
    mostrarSecao("registo");
}

function limparTabelaCapturas() {
    const container = document.getElementById("containerCapturas");
    container.innerHTML = ""; // Remove toda a tabela
    document.getElementById("totaisAno").textContent = ""; // Limpa o texto dos totais
}

function preencherAnos() {
    let capturas = obterCapturas();
    let anos = [...new Set(capturas.map(c => new Date(c.data).getFullYear()))].sort((a, b) => b - a);
    let anoSelect = document.getElementById("anoConsulta");
    anoSelect.innerHTML = ""; // Limpa o select antes de preencher

    anos.forEach(ano => {
        let option = document.createElement("option");
        option.value = ano;
        option.textContent = ano;
        anoSelect.appendChild(option);
    });

    if (typeof preencherAnosComparacao === "function") preencherAnosComparacao();
}

// Cada tipo de mensagem tem o seu temporizador: um aviso novo não é escondido pelo do anterior.
const temporizadoresMensagem = {};

function exibirMensagem(tipo, mensagem) {
    const id = `message${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
    const messageElement = document.getElementById(id);
    messageElement.textContent = mensagem;
    messageElement.style.display = 'block';
    if (typeof clearTimeout === 'function') clearTimeout(temporizadoresMensagem[id]);
    // Os erros ficam mais tempo, para dar para ler o que falta
    temporizadoresMensagem[id] = setTimeout(() => {
        messageElement.style.display = 'none';
    }, tipo === 'error' ? 7000 : 3000);
}

// ===== Navegação entre ecrãs =====
// O ecrã inicial é a base. Cada ecrã aberto fica empilhado no histórico do
// browser, por isso o botão "Voltar" do telemóvel regressa ao ecrã anterior
// (e do inicial sai da app, como numa app normal).
let secaoAtual = 'inicio';
let profundidadeNavegacao = 0;

function aplicarSecao(idSecao) {
  // Esconde todas as secções de conteúdo
  document.querySelectorAll('.tab-content').forEach(conteudo => {
    conteudo.classList.remove('active');
  });

  // Mostra a secção selecionada
  const secaoMostrar = document.getElementById(idSecao);
  if (secaoMostrar) {
    secaoMostrar.classList.add('active');
  }
  secaoAtual = idSecao;
  if (document.body && document.body.classList) {
    document.body.classList.toggle('ecra-relatorio', idSecao === 'relatorio');
  }

  // A barra "Início" só aparece fora do ecrã inicial
  const barra = document.getElementById('barraVoltar');
  if (barra) barra.style.display = idSecao === 'inicio' ? 'none' : 'flex';

  if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);

  // O mapa só tem tamanho certo quando o ecrã está visível
  if (idSecao === 'mapa' && typeof aoMostrarMapa === 'function') {
    aoMostrarMapa();
  }
  if (idSecao === 'registo' && typeof aoMostrarRegisto === 'function') {
    aoMostrarRegisto();
  }
  if (idSecao === 'listas' && typeof aoMostrarListas === 'function') {
    aoMostrarListas();
  }
  if (idSecao === 'dados' && typeof atualizarDiagnostico === 'function') {
    atualizarDiagnostico();
  }
  if (idSecao === 'inicio' && typeof inicioAtualizar === 'function') {
    inicioAtualizar();
  }
}

function mostrarSecao(idSecao) {
  if (idSecao === 'inicio') {
    voltarInicio();
    return;
  }
  if (idSecao === secaoAtual) return;
  profundidadeNavegacao++;
  try {
    history.pushState({ secao: idSecao, n: profundidadeNavegacao }, '');
  } catch (e) { /* sem histórico: a navegação continua a funcionar, só não há "Voltar" */ }
  aplicarSecao(idSecao);
}

function voltarInicio() {
  if (profundidadeNavegacao > 0 && typeof history.go === 'function') {
    history.go(-profundidadeNavegacao); // o popstate trata de mostrar o início
    // Rede de segurança, caso o browser não dispare o evento
    setTimeout(() => {
      if (secaoAtual !== 'inicio') {
        profundidadeNavegacao = 0;
        aplicarSecao('inicio');
      }
    }, 400);
  } else {
    profundidadeNavegacao = 0;
    if (secaoAtual !== 'inicio') aplicarSecao('inicio');
  }
}

window.addEventListener('popstate', (e) => {
  const estado = e.state || { secao: 'inicio', n: 0 };
  profundidadeNavegacao = estado.n || 0;
  aplicarSecao(estado.secao || 'inicio');
});

window.onload = () => {
  try {
    history.replaceState({ secao: 'inicio', n: 0 }, '');
  } catch (e) { /* ignora */ }
  profundidadeNavegacao = 0;
  aplicarSecao('inicio');
};