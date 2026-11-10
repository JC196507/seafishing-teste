const concelhosLocais = [
 	{
        concelho: "Figueira da Foz",
        locais: ["Alto do Viso", "Buarcos", "Cabedelo", "Cabo Mondego", "Costa Lavos", "Costinha", "Cova Gala", "Hospital", "Leirosa", "Murtinheira", "Pedra da Nau", "Quiaios"]
    },
	{
        concelho: "Grândola",
        locais: ["Aberta Nova", "Carvalhal", "Comporta", "Galé", "Melides", "Pêgo", "Pinheirinho", "Raposa", "Santo André"]
    },
	{
        concelho: "Ílhavo, Vagos, Mira e Cantanhede",
        locais: ["Almadoiros", "Areão", "Praia Barra", "Costa Nova", "Duna Alta", "Gafanha Boa Hora", "Labrego", "Mira", "Palheirão", "Poço da Cruz", "Tocha", "Vagueira"]
    },
	{
        concelho: "Ovar, Murtosa e Aveiro",
        locais: ["Bico Espanhola", "Califa", "Carreira Tiro", "Furadouro Norte", "Furadouro Sul", "Maceda", "Maceda barro", "Marilia", "Marretas", "Molho Norte","Orbitur", "Ramada", "Ria", "Rubirosa", "Rubirosa norte", "S.Jacinto", "Tricana", "Viveiros"]
    },
	{                                                                                                                                                                                                                                                                                          
        concelho: "Porto e Matosinhos",
        locais: ["Agudela", "Aldeia Nova", "Aterro", "Boa Nova", "Cabo Mundo", "Corgo", "Facho", "Foz", "Fuzelhas", "Homem do Leme", "Marizé", "Marreco", "Molhe"]
    },
	{
        concelho: "Vila do Conde e Póvoa",
        locais: ["Aguçadoura", "Atlântica", "Aver-o-Mar", "Caxinas", "Estela", "Labruje", "Leixão", "Mar e Sol", "Mindelo", "Pedras Negras", "Moreiró", "Praia Barcos", "Prainha", "Quião", "Senhor dos Navegantes", "Vila Chã"]
    },
	{
        concelho: "Vila Nova de Gaia e Espinho",
        locais: ["Aguda", "Barroso", "Bloqueira-Vld", "Canide", "Francelos", "Granja", "Miramar", "Paramos", "Piriri", "Rio Douro", "Silvalde", "Valadares", "Vibrações"]
    },
  ];

// Concelhos e locais a usar na app: os de origem + os que acrescentaste (ver listas.js).
// Os de origem ficam primeiro, na ordem de sempre; os teus vêm a seguir, por ordem alfabética.
function listaConcelhosLocais() {
    let custom = (typeof obterListas === "function") ? obterListas().locais : [];
    let resultado = concelhosLocais.map(c => ({ concelho: c.concelho, locais: c.locais.slice() }));
    custom.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt")).forEach(item => {
        let c = resultado.find(x => x.concelho === item.concelho);
        if (!c) { c = { concelho: item.concelho, locais: [] }; resultado.push(c); }
        if (!c.locais.includes(item.nome)) c.locais.push(item.nome);
    });
    return resultado;
}
