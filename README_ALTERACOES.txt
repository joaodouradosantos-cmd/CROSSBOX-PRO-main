CROSSBOX PRO - versão com Benchmarks e correção de carregamento do calendário

Alterações principais:
1) No WOD, o campo Formato passa a incluir:
   - Randy
   - Jackie
   - Murph
   - Fran
   - Isabel
   - 400m Corrida
   - Milha
   - 5k Corrida

2) Em Desempenho foi adicionada a tabela:
   - Benchmarks – evolução
   Mostra melhor tempo, último registo e evolução.

3) O calendário passou a importar calendario.js com versão (?v=10), para evitar cache antiga.

4) O service worker passou para a cache:
   crossbox-cache-v10-benchmarks-calendarfix

5) app.js foi deixado como placeholder seguro para evitar ecrã branco por ficheiro incompleto.

Nota:
Para aplicar no GitHub, substituir os ficheiros existentes pelos ficheiros deste ZIP.
Depois, abrir a app com limpeza de cache/reinstalação da PWA.
