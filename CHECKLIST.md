# Checklist antes de publicar (Pesca Lúdica)

1. Subir `CACHE_NAME` em `service-worker.js` (ex.: v13 -> v14) sempre que mudar qualquer ficheiro.
2. Subir `APP_VERSAO` em `dados.js` se houver novidades visíveis.
3. Se criar um ficheiro novo, juntá-lo à lista `urlsToCache` do `service-worker.js`.
4. Confirmar que a pasta `ícone/` está no sítio certo.
5. Depois de publicar: testar numa janela anónima e reinstalar a app no telemóvel.
6. Antes de mexer em dados: fazer Exportar Dados (separador Dados).
7. O mapa usa Leaflet/OpenStreetMap a partir da internet (não fica em cache offline); se mudares a versão do Leaflet, fixa sempre uma versão exacta.
8. Ficheiros apagados do projeto têm de ser apagados também do GitHub (ex.: utils.js e style.css na V2.9): se ficarem lá não estragam, mas confundem.
9. diagnostico.js tem de ser sempre o PRIMEIRO script do index.html (apanha os erros dos outros).
10. Locais, espécies e iscos acrescentados na app vivem em 'listasPersonalizadas' (dados.js) e entram nos backups (formato 4).
