document.addEventListener("DOMContentLoaded", () => {
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
        .catch(error => console.log("Erro no Service Worker:", error));
}

function carregarDados() {
    let concelhoSelect = document.getElementById("concelho");
    let localSelect = document.getElementById("local");

    concelhoSelect.innerHTML = '<option value="">Seleccione um concelho</option>';
    localSelect.innerHTML = '<option value="">Seleccione um local</option>';

    concelhosLocais.forEach(concelho => {
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
        let concelhoEncontrado = concelhosLocais.find(c => c.concelho === concelhoSelecionado);
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

function gravarCaptura() {
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

    if (!data || isNaN(peso) || peso <= 100 || peso > 100000 || isNaN(tamanho) || tamanho <= 10 || tamanho > 300 || !concelho || !local || !tipoIsco || !tipoPeixe || !tipoPesca || !mare || !lua || !periodoDia || new Date(data) > new Date()) {
        exibirMensagem('error', 'Preencha todos os campos correctamente e use data válida!');
        return;
    }

    let capturas = obterCapturas();
    let novaCaptura = { data, peso, tamanho, local, tipoIsco, tipoPeixe, tipoPesca, mare, lua, periodoDia };

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
        document.querySelector('.gravar button').innerHTML = '<i class="fas fa-save"></i> Gravar';
    } else {
        novaCaptura.id = gerarIdCaptura();
        capturas.push(novaCaptura);
    }

    if (!guardarCapturas(capturas)) return;

    setTimeout(atualizarLocaisOrdenados, 0);
    exibirMensagem('success', 'Registo gravado com sucesso!');
    limparFormularioRegistro();
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
        versao: 2,
        exportadoEm: new Date().toISOString(),
        capturas: obterCapturas(),
        locaisCoords: obterCoordsLocais()
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
    return concelhosLocais.flatMap(c => c.locais);
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
            let dadosImportados;
            let coordsImportadas = null; // só existe em backups do formato novo
            if (Array.isArray(bruto)) {
                dadosImportados = bruto; // formato antigo: só capturas
            } else if (bruto && Array.isArray(bruto.capturas)) {
                dadosImportados = bruto.capturas;
                coordsImportadas = filtrarCoordsImportadas(bruto.locaisCoords, todosOsNomesDeLocais());
            } else {
                throw new Error("Formato inválido");
            }
            dadosImportados = dadosImportados.map(sanitizarCaptura);

            let modoRadio = document.querySelector('input[name="modoImportacao"]:checked');
            let modo = modoRadio ? modoRadio.value : "juntar";

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

            preencherAnos();
            setTimeout(atualizarLocaisOrdenados, 0);
            atualizarEstadoBackup();
        } catch (err) {
            exibirMensagem('error', 'Ficheiro inválido. Confirma que é um backup exportado por esta app.');
        }
        event.target.value = "";
    };
    leitor.readAsText(ficheiro);
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
    let concelhoEncontrado = concelhosLocais.find(c => c.locais.includes(captura.local));

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
    let botaoGravar = document.querySelector('.gravar button');
    if (botaoGravar) botaoGravar.innerHTML = '<i class="fas fa-save"></i> Atualizar Registo';

    // Muda para o separador "Registo" para facilitar a edição
    mostrarSecao("registo");
}

function limparTabelaCapturas() {
    const container = document.getElementById("containerCapturas");
    container.innerHTML = ""; // Remove toda a tabela
    document.getElementById("totaisAno").textContent = ""; // Limpa o texto dos totais
}

function limparAnalise() {
    document.getElementById("resumoLocais").innerHTML = ""; // Limpa a tabela de resumo

    if (window.myChart) {
        window.myChart.destroy();
        window.myChart = null;
    }
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

function exibirMensagem(tipo, mensagem) {
    const messageElement = document.getElementById(`message${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    messageElement.textContent = mensagem;
    messageElement.style.display = 'block';
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 3000); // A mensagem desaparece após 3 segundos
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

  // A barra "Início" só aparece fora do ecrã inicial
  const barra = document.getElementById('barraVoltar');
  if (barra) barra.style.display = idSecao === 'inicio' ? 'none' : 'flex';

  if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);

  // O mapa só tem tamanho certo quando o ecrã está visível
  if (idSecao === 'mapa' && typeof aoMostrarMapa === 'function') {
    aoMostrarMapa();
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