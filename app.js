 
const STORAGE_PROFILE = "crossfit_profile";
const STORAGE_RM = "crossfit_1rm";
const STORAGE_RM_HISTORY = "crossfit_1rm_history";
const STORAGE_TREINO = "crossfit_treinos";
const STORAGE_WOD_RESULT = "crossfit_wod_result";
const STORAGE_BACKUP_META = "crossfit_backup_meta";

/* NOVOS ARMAZENAMENTOS */
const STORAGE_RESERVAS = "crossfit_reservas";
const STORAGE_PRESENCAS = "crossfit_presencas";
const STORAGE_RANKINGS = "crossfit_rankings";

/* ENDPOINT DO BACKEND PARA OCR DO QUADRO */
const OCR_ENDPOINT = "https://o-teu-backend.exemplo/ocr-wod"; // troca pela tua URL real

/* ===== PERFIL ===== */
let profile = JSON.parse(localStorage.getItem(STORAGE_PROFILE) || "{}");

const nomeEl = document.getElementById("nome");
const nivelEl = document.getElementById("nivel");
const sexoEl = document.getElementById("sexo");
const idadeEl = document.getElementById("idade");
const alturaEl = document.getElementById("altura");
const pesoEl = document.getElementById("peso");
const objetivoEl = document.getElementById("objetivo");
const perfilForm = document.getElementById("perfilForm");
const subtitleEl = document.getElementById("appSubtitle");
const subtitleLine1El = document.getElementById("appSubtitleLine1");
const subtitleLine2El = document.getElementById("appSubtitleLine2");

function updateProfileInfo() {
  if (perfilForm) perfilForm.style.display = "none";
}

function updateSubtitle() {
  if (!subtitleLine1El || !subtitleLine2El) return;

  if (profile && profile.nome && profile.nome.trim() !== "") {
    // primeira linha SEM "de"
    subtitleLine1El.textContent = "Registo de treinos";
    subtitleLine2El.textContent = profile.nome.trim();
  } else {
    subtitleLine1El.textContent = "Registo de treinos";
    subtitleLine2El.textContent = "Toca para configurar o teu perfil";
  }
}

function loadProfile() {
  if (!sexoEl) return;
  if (profile.nome && nomeEl) nomeEl.value = profile.nome;
  if (profile.nivel && nivelEl) nivelEl.value = profile.nivel;
  if (profile.sexo) sexoEl.value = profile.sexo;
  if (profile.idade) idadeEl.value = profile.idade;
  if (profile.altura) alturaEl.value = profile.altura;
  if (profile.peso) pesoEl.value = profile.peso;
  if (profile.objetivo && objetivoEl) objetivoEl.value = profile.objetivo;
  updateProfileInfo();
  updateSubtitle();
}

const saveProfileBtn = document.getElementById("saveProfile");
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", () => {
    profile = {
  nome: nomeEl && nomeEl.value ? nomeEl.value.trim() : "",
  nivel: nivelEl ? (nivelEl.value || "") : "",
  sexo: sexoEl.value || "",
  idade: idadeEl.value ? parseInt(idadeEl.value, 10) : "",
  altura: alturaEl.value ? parseInt(alturaEl.value, 10) : "",
  peso: pesoEl.value ? parseFloat(pesoEl.value) : "",
  objetivo: objetivoEl ? (objetivoEl.value || "") : ""
};

    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
    updateProfileInfo();
    updateSubtitle();
    registerBackupMeta("Perfil atualizado");
    alert("Perfil atualizado.");
    renderPerformance();
  });
}

/* clicar no título abre/fecha o formulário de perfil */
if (subtitleEl && perfilForm) {
  subtitleEl.addEventListener("click", () => {
    const visible = perfilForm.style.display === "block";
    perfilForm.style.display = visible ? "none" : "block";
  });
}

/* ===== EXERCÍCIOS ===== */
const MOVES = [
  /* BARRA – FORÇA BASE E HALTEROFILISMO */
  "Chest Press",
  "Back Squat",
  "Front Squat",
  "Overhead Squat",
  "Sots Press",
  "Deadlift",
  "Sumo Deadlift",
  "Romanian Deadlift (RDL)",
  "Snatch Deadlift",

  "Power Clean",
  "Hang Clean",
  "Squat Clean",
  "Clean & Jerk",

  "Power Snatch",
  "Hang Power Snatch",
  "Squat Snatch",

  "Strict Press",
  "Push Press",
  "Push Jerk",
  "Split Jerk",
  "Thruster",

  "Barbell Row",
  "Bent Over Row",
  "Good Morning",
  "Lunges com barra",
  "Hip Thrust com barra",

  /* HALTERES / DUMBBELL */
  "Dumbbell Press",
  "Dumbbell Bench Press",
  "Dumbbell Snatch",
  "Dumbbell Clean",
  "Dumbbell Clean & Jerk",
  "Dumbbell Thruster",
  "Dumbbell Row",
  "Dumbbell Lunges",

  /* KETTLEBELL / OUTROS CARREGAMENTOS */
  "Kettlebell Swing",
  "Kettlebell Clean",
  "Kettlebell Snatch",
  "Goblet Squat",
  "Kettlebell Lunges",

  /* ACESSÓRIOS PESADOS / STRONGMAN – 1RM EM CARGA TRANSPORTADA */
  "Hip Thrust",
  "Glute Bridge",
  "Reverse Hyperextension",
  "Shrug",
  "Farmer Carry",
  "Sandbag Carry",
  "Yoke Carry",
  "Bear Complex"
];

const MOVES_PT = {};

/* GUIA – LISTA TIPO JSON (inclui todos os exercícios disponíveis na app) */
const EXER_INFO = [
  /* BARRA / HALTERES – FORÇA BASE */
  {
    en: "Chest Press",
    pt: "Supino com barra",
    descricao: "Empurrar a barra para longe do peito, deitado no banco, controlando a descida e a subida."
  },
  {
    en: "Back Squat",
    pt: "Agachamento com barra nas costas",
    descricao: "Agachamento com a barra apoiada nas costas, descendo até pelo menos à paralela com o tronco firme."
  },
  {
    en: "Front Squat",
    pt: "Agachamento frontal",
    descricao: "Agachamento com a barra apoiada na parte da frente dos ombros, exigindo tronco mais vertical e core forte."
  },
  {
    en: "Overhead Squat",
    pt: "Agachamento acima da cabeça",
    descricao: "Agachamento com a barra acima da cabeça, braços estendidos e muita estabilidade de ombros e core."
  },
  {
    en: "Sots Press",
    pt: "Sots press",
    descricao: "A partir da posição de agachamento frontal, com a barra em rack, realizar um press acima da cabeça mantendo-se em baixo, exigindo muita estabilidade de ombros e core."
  },
  {
    en: "Deadlift",
    pt: "Peso morto",
    descricao: "Levar a barra do chão até à anca com costas neutras, empurrando o chão com as pernas e contraindo glúteos no topo."
  },
  {
    en: "Sumo Deadlift",
    pt: "Peso morto sumo",
    descricao: "Variação com pés mais afastados e mãos a agarrar a barra entre as pernas, reduzindo a amplitude da anca."
  },
  {
    en: "Romanian Deadlift (RDL)",
    pt: "Peso morto romeno",
    descricao: "Peso morto com menos flexão de joelhos, focado em posteriores da coxa e glúteos, mantendo a barra perto do corpo."
  },

  {
    en: "Power Clean",
    pt: "Power clean",
    descricao: "Levar a barra do chão até aos ombros de forma explosiva, recebendo-a acima da paralela."
  },
  {
    en: "Squat Clean",
    pt: "Squat clean",
    descricao: "Clean com receção em agachamento completo antes de regressar à posição de pé."
  },
  {
    en: "Clean & Jerk",
    pt: "Clean & jerk",
    descricao: "Levar a barra do chão aos ombros (clean) e dos ombros até acima da cabeça (jerk) em dois movimentos distintos."
  },

  {
    en: "Power Snatch",
    pt: "Power snatch",
    descricao: "Arranco com receção acima da paralela, num único movimento do chão até overhead."
  },
  {
    en: "Squat Snatch",
    pt: "Squat snatch",
    descricao: "Arranco com receção em agachamento profundo, seguido de extensão até ficar totalmente de pé."
  },
  {
    en: "Snatch Deadlift",
    pt: "Peso morto snatch",
    descricao: "Peso morto com pega larga, replicando a primeira fase do arranco e mantendo a barra encostada ao corpo."
  },
  {
    en: "Hang Power Snatch",
    pt: "Arranco power do hang",
    descricao: "Arranco iniciado a partir do hang, acima dos joelhos, recebendo a barra acima da paralela."
  },
  {
    en: "Hang Clean",
    pt: "Clean do hang",
    descricao: "Clean iniciado com a barra acima dos joelhos, recebendo no rack frontal com extensão explosiva da anca."
  },

  {
    en: "Strict Press",
    pt: "Press militar estrito",
    descricao: "Press de ombros sem ajuda das pernas, usando apenas a força de ombros e braços."
  },
  {
    en: "Push Press",
    pt: "Push press",
    descricao: "Press de ombros com pequeno impulso das pernas, terminando com a barra acima da cabeça."
  },
  {
    en: "Push Jerk",
    pt: "Push jerk",
    descricao: "Impulso de pernas e encaixe da barra acima da cabeça, recebendo em semi-agachamento antes de estender."
  },
  {
    en: "Split Jerk",
    pt: "Split jerk",
    descricao: "Jerk em passada, recebendo a barra overhead com uma perna à frente e outra atrás para maior estabilidade."
  },

  {
    en: "Thruster",
    pt: "Thruster",
    descricao: "Agachamento frontal seguido diretamente de press acima da cabeça num único movimento fluido."
  },
  {
    en: "Barbell Row",
    pt: "Remada com barra",
    descricao: "Com o tronco inclinado à frente, puxar a barra em direção ao abdómen mantendo as costas neutras."
  },
  {
    en: "Bent Over Row",
    pt: "Remada inclinada",
    descricao: "Remada com maior inclinação do tronco, focando dorsais e parte média das costas."
  },
  {
    en: "Good Morning",
    pt: "Good morning",
    descricao: "Com a barra nas costas, inclinar o tronco à frente com ligeira flexão de joelhos e voltar à posição inicial."
  },
  {
    en: "Lunges com barra",
    pt: "Passadas com barra",
    descricao: "Passadas à frente ou atrás com a barra apoiada nos ombros, mantendo o tronco direito."
  },
  {
    en: "Hip Thrust com barra",
    pt: "Hip thrust com barra",
    descricao: "Elevar a anca com as costas apoiadas num banco e a barra sobre a bacia, focando glúteos."
  },

  /* HALTERES E KETTLEBELLS */
  {
    en: "Dumbbell Press",
    pt: "Press com halteres",
    descricao: "Press de ombros com halteres, de pé ou sentado, subindo os halteres acima da cabeça."
  },
  {
    en: "Dumbbell Bench Press",
    pt: "Supino com halteres",
    descricao: "Deitado no banco, empurrar dois halteres para cima a partir do peito, controlando a descida."
  },
  {
    en: "Dumbbell Snatch",
    pt: "Snatch com halteres",
    descricao: "Levar o haltere do chão até acima da cabeça num movimento explosivo e contínuo."
  },
  {
    en: "Dumbbell Clean",
    pt: "Clean com halteres",
    descricao: "Levar o haltere do chão ou das pernas até ao ombro, com extensão de anca."
  },
  {
    en: "Dumbbell Clean & Jerk",
    pt: "Clean & jerk com halteres",
    descricao: "Clean com haltere até ao ombro seguido de impulso até overhead."
  },
  {
    en: "Dumbbell Thruster",
    pt: "Thruster com halteres",
    descricao: "Agachamento seguido de press com halteres acima da cabeça num só movimento."
  },
  {
    en: "Dumbbell Row",
    pt: "Remada com halteres",
    descricao: "Remada unilateral ou bilateral puxando o haltere em direção ao tronco."
  },
  {
    en: "Dumbbell Lunges",
    pt: "Passadas com halteres",
    descricao: "Passadas segurando um haltere em cada mão junto ao corpo."
  },
  {
    en: "Walking Lunge",
    pt: "Passadas a andar",
    descricao: "Passadas alternadas deslocando-se para a frente, com ou sem carga, mantendo o tronco direito e o joelho traseiro próximo do chão."
  },

  {
    en: "Kettlebell Swing",
    pt: "Swing com kettlebell",
    descricao: "Balanço da kettlebell usando sobretudo o impulso da anca, não dos braços."
  },
  {
    en: "Kettlebell Clean",
    pt: "Clean com kettlebell",
    descricao: "Levar a kettlebell do fundo até à posição de rack junto ao peito."
  },
  {
    en: "Kettlebell Snatch",
    pt: "Snatch com kettlebell",
    descricao: "Arranco unilateral, do chão ou do baloiço até acima da cabeça."
  },
  {
    en: "Goblet Squat",
    pt: "Agachamento goblet",
    descricao: "Agachamento segurando a kettlebell ou haltere junto ao peito."
  },
  {
    en: "Kettlebell Lunges",
    pt: "Passadas com kettlebell",
    descricao: "Passadas segurando a kettlebell ao lado do corpo ou em posição de rack."
  },

  /* GINÁSTICA / CALISTENIA – BÁSICOS */
  {
    en: "Pull-Up",
    pt: "Puxada na barra",
    descricao: "Suspenso na barra, puxar até o queixo ultrapassar a barra com pegada em pronação."
  },
  {
    en: "Chin-Up",
    pt: "Puxada em supinação",
    descricao: "Puxada na barra com palmas das mãos viradas para ti, focando mais bíceps."
  },
  {
    en: "Strict Chin-Up",
    pt: "Chin-up estrito",
    descricao: "Versão controlada sem kipping, subindo até o queixo ultrapassar a barra apenas com força muscular."
  },
  {
    en: "Scapular Pull-Up",
    pt: "Puxada escapular",
    descricao: "Suspenso na barra, mover apenas as escápulas, aproximando ligeiramente o peito da barra sem dobrar os cotovelos."
  },

  {
    en: "Chest-to-Bar Pull-Up",
    pt: "Puxada ao peito",
    descricao: "Puxada na barra até o peito tocar na barra, exigindo maior amplitude."
  },
  {
    en: "Kipping Pull-Up",
    pt: "Pull-up com kipping",
    descricao: "Puxada na barra usando balanço hollow/arch para ganhar impulso e aumentar repetições."
  },
  {
    en: "Bar Muscle-Up",
    pt: "Muscle-up na barra",
    descricao: "Transição explosiva que combina puxada e dip para passar o tronco acima da barra."
  },
  {
    en: "Ring Muscle-Up",
    pt: "Muscle-up nas argolas",
    descricao: "Transição nas argolas, mais instável e exigente do que na barra."
  },
  {
    en: "Muscle-Up",
    pt: "Muscle-up",
    descricao: "Termo genérico para o movimento que combina puxada e dip, em barra ou argolas."
  },

  {
    en: "Ring Row",
    pt: "Remada nas argolas",
    descricao: "Com o corpo inclinado sob as argolas, puxar o peito em direção às argolas mantendo o corpo alinhado."
  },
  {
    en: "Ring Dip",
    pt: "Dip nas argolas",
    descricao: "Suportado nas argolas, descer até cerca de 90º de flexão de cotovelos e voltar à extensão completa."
  },
  {
    en: "Ring Support Hold",
    pt: "Suporte nas argolas",
    descricao: "Manter a posição de braços estendidos nas argolas com corpo alinhado e ombros ativos."
  },

  {
    en: "Toes-to-Bar (T2B)",
    pt: "Toes-to-bar",
    descricao: "Suspenso na barra, tocar com os pés na barra usando kip hollow/arch."
  },
  {
    en: "Knees-to-Elbows (K2E)",
    pt: "Knees-to-elbows",
    descricao: "Suspenso na barra, elevar os joelhos até tocarem nos cotovelos."
  },
  {
    en: "Hanging Knee Raise",
    pt: "Elevação de joelhos na barra",
    descricao: "Versão mais simples, elevando os joelhos em direção ao peito."
  },

  {
    en: "Sit-Up",
    pt: "Abdominal sit-up",
    descricao: "Deitado de costas, subir o tronco até ficar sentado, podendo usar AbMat."
  },
  {
    en: "Floor Leg Raise",
    pt: "Elevação de pernas no chão",
    descricao: "Deitado de costas, elevar as pernas estendidas mantendo a lombar encostada ao chão."
  },
  {
    en: "V-Up",
    pt: "V-up",
    descricao: "Elevar simultaneamente tronco e pernas tocando com as mãos nos pés, formando um 'V'."
  },

  {
    en: "GHD Sit-Up",
    pt: "Abdominal em GHD",
    descricao: "Abdominal na máquina GHD com grande amplitude de movimento."
  },
  {
    en: "Back Extension (GHD)",
    pt: "Extensão lombar em GHD",
    descricao: "Extensão de tronco na máquina GHD, focando lombar e glúteos."
  },

  {
    en: "Pistol Squat",
    pt: "Agachamento pistol",
    descricao: "Agachamento numa só perna, mantendo a outra estendida à frente."
  },

  /* HANDSTAND / INVERSÕES */
  {
    en: "Handstand Hold",
    pt: "Pino estático",
    descricao: "Manter a posição de pino, junto à parede ou livre, com ombros ativos e core firme."
  },
  {
    en: "Nose-to-Wall Handstand Hold",
    pt: "Pino nariz à parede",
    descricao: "Pino com barriga voltada para a parede e nariz quase a tocar, alinhando corpo e ombros."
  },
  {
    en: "Handstand Walk",
    pt: "Caminhada em pino",
    descricao: "Deslocar-se em pino utilizando as mãos, exigindo equilíbrio e controlo corporal."
  },
  {
    en: "Handstand Shoulder Tap",
    pt: "Toques de ombro em pino",
    descricao: "Em pino, alternar toques de mão no ombro oposto, aumentando a estabilidade unilateral."
  },
  {
    en: "Handstand Push-Up (HSPU)",
    pt: "Pino com flexão",
    descricao: "Flexão de braços em pino, com ou sem kipping, até a cabeça tocar no chão ou alvo."
  },
  {
    en: "Strict Handstand Push-Up",
    pt: "Pino com flexão estrita",
    descricao: "HSPU sem kipping, controlando toda a amplitude apenas com força dos ombros."
  },
  {
    en: "Wall Walk",
    pt: "Subida à parede",
    descricao: "A partir do chão, caminhar com os pés pela parede e as mãos para perto da parede até ao pino, e voltar a descer."
  },
  {
    en: "Handstand Walk Practice",
    pt: "Prática de caminhada em pino",
    descricao: "Trabalho técnico de pequenas deslocações em pino para ganhar confiança e controlo."
  },

  /* CORE / HOLLOW–ARCH / PLANKS (SKILLS DE GINÁSTICA) */
  {
    en: "Hollow Hold",
    pt: "Hollow hold",
    descricao: "Deitado de costas, manter omoplatas e pernas elevadas, costas coladas ao chão e core contraído."
  },
  {
    en: "Hollow Rock",
    pt: "Hollow rock",
    descricao: "Na posição de hollow hold, balançar para a frente e para trás mantendo a forma rígida."
  },
  {
    en: "Arch Hold",
    pt: "Arch hold",
    descricao: "Deitado de barriga para baixo, elevar peito e pernas, criando posição de arco com braços à frente."
  },
  {
    en: "Arch Rock",
    pt: "Arch rock",
    descricao: "Na posição de arch hold, balançar para a frente e para trás mantendo o corpo em tensão."
  },
  {
    en: "Kip Swing",
    pt: "Kip swing",
    descricao: "Balanço hollow/arch na barra de tração, base para kipping pull-ups e toes-to-bar."
  },

  {
    en: "Plank",
    pt: "Prancha",
    descricao: "Posição de prancha, com antebraços ou mãos no chão, corpo alinhado e core contraído."
  },
  {
    en: "Plank Hold",
    pt: "Prancha isométrica",
    descricao: "Manter posição de prancha com corpo alinhado dos ombros aos tornozelos, contraindo core e glúteos."
  },
  {
    en: "Plank Pike",
    pt: "Prancha em pike",
    descricao: "A partir da prancha, elevar a anca formando um 'V' invertido e regressar ao alinhamento."
  },
  {
    en: "Plank Jump",
    pt: "Salto a partir da prancha",
    descricao: "Em prancha, saltar com ambos os pés na direção das mãos e voltar atrás, mantendo o core firme."
  },

  {
    en: "Tuck Roll",
    pt: "Rolo em tuck",
    descricao: "Com joelhos ao peito, rolar para trás e para a frente mantendo o corpo compacto, útil para coordenação."
  },

  /* SKILLS EM BARRA / RINGS – PROGRESSÕES */
  {
    en: "Band Pull-Down",
    pt: "Puxada com banda elástica",
    descricao: "Com a banda fixa acima da cabeça, puxar em direção ao peito, simulando um lat pull-down."
  },
  {
    en: "Band Transition",
    pt: "Transição com banda",
    descricao: "Drill com banda para treinar a passagem de puxada para dip na técnica de muscle-up."
  },
  {
    en: "Pull-Over",
    pt: "Pull-over na barra",
    descricao: "Movimento em que o corpo passa de suspensão para apoio em cima da barra num só gesto."
  },

  /* PVC / MOBILIDADE / TÉCNICA */
  {
    en: "PVC Overhead Squat",
    pt: "Agachamento overhead com PVC",
    descricao: "Agachamento acima da cabeça usando tubo de PVC, focado em técnica e mobilidade sem carga."
  },
  {
    en: "PVC Pass Through",
    pt: "Passagem com tubo PVC",
    descricao: "Levar o tubo de PVC da frente para trás e vice-versa, com braços estendidos, para mobilidade de ombros."
  },
  {
    en: "Dynamic Squat Stretch",
    pt: "Alongamento dinâmico de agachamento",
    descricao: "Trabalho de mobilidade em agachamento profundo, alternando posições para libertar anca e tornozelos."
  },

  /* ABDOMINAIS / L-SIT E VARIAÇÕES */
  {
    en: "L-Sit Hold",
    pt: "L-sit",
    descricao: "Em apoio de mãos ou argolas, manter pernas estendidas à frente formando um 'L' com o tronco."
  },

  /* METCON / CONDICIONAMENTO */
  {
    en: "Burpee",
    pt: "Burpee",
    descricao: "Do pé para a posição de prancha, flexão opcional e salto final com extensão completa."
  },
  {
    en: "Burpee Box Jump-Over",
    pt: "Burpee box jump-over",
    descricao: "Burpee seguido de salto por cima da caixa, podendo sair pelo outro lado."
  },
  {
    en: "Burpee Box Jump",
    pt: "Burpee box jump",
    descricao: "Burpee seguido de salto para cima da caixa, terminando em extensão completa em cima da caixa."
  },
  {
    en: "Burpee Pull-Up",
    pt: "Burpee com pull-up",
    descricao: "Burpee seguido de salto para a barra e realização de uma tração."
  },
  {
    en: "Box Jump",
    pt: "Salto para caixa",
    descricao: "Salto com os dois pés para cima da caixa, terminando em extensão completa."
  },
  {
    en: "Box Jump Over",
    pt: "Salto por cima da caixa",
    descricao: "Salto para cima e para o outro lado da caixa, sem necessidade de extensão completa em cima."
  },
  {
    en: "Wall Ball",
    pt: "Lançamento à parede",
    descricao: "Agachamento com bola medicinal seguido de lançamento a um alvo na parede."
  },

  {
    en: "Row",
    pt: "Remo",
    descricao: "Remo em máquina, semelhante a Rowing, trabalhando pernas, core e puxada com os braços."
  },
  {
    en: "Rowing",
    pt: "Remo",
    descricao: "Remo em máquina, trabalhando pernas, core e puxada com os braços."
  },
  {
    en: "Ski Erg",
    pt: "Ski erg",
    descricao: "Simulador de esqui, puxando as manetes de cima para baixo em movimento contínuo."
  },
  {
    en: "Assault Bike",
    pt: "Bicicleta de resistência",
    descricao: "Bicicleta com resistência de ar, trabalhando simultaneamente braços e pernas."
  },
  {
    en: "Running",
    pt: "Corrida",
    descricao: "Corrida simples, em tapete ou no exterior, em ritmo contínuo ou intervalado."
  },
  {
    en: "Sprint",
    pt: "Sprint",
    descricao: "Corrida explosiva de curta distância em alta intensidade."
  },

  {
    en: "Double Under",
    pt: "Saltos duplos na corda",
    descricao: "Saltos em que a corda passa duas vezes por baixo dos pés em cada salto."
  },
  {
    en: "Single Under",
    pt: "Saltos simples na corda",
    descricao: "Saltos em que a corda passa uma vez por baixo dos pés em cada salto."
  },

  {
    en: "Sled Push",
    pt: "Empurrar trenó",
    descricao: "Empurrar trenó com carga ao longo de uma distância definida."
  },
  {
    en: "Sled Pull",
    pt: "Puxar trenó",
    descricao: "Puxar trenó com carga usando arnês ou corda, para trás ou para a frente."
  },
  {
    en: "Farmer Carry",
    pt: "Caminhada com cargas",
    descricao: "Caminhar segurando cargas pesadas (halteres ou kettlebells) ao lado do corpo."
  },

  /* COMPLEXOS / STRONGMAN */
  {
    en: "Bear Complex",
    pt: "Bear complex",
    descricao: "Sequência contínua: power clean, front squat, push press, back squat e novo push press."
  },
  {
    en: "Devil Press",
    pt: "Devil press",
    descricao: "Burpee com halteres seguido de swing até overhead num movimento fluido."
  },
  {
    en: "Man Maker",
    pt: "Man maker",
    descricao: "Combinação de remada, burpee, clean e thruster com halteres."
  },
  {
    en: "Sandbag Carry",
    pt: "Caminhada com saco",
    descricao: "Transportar um saco pesado ao peito, ombro ou costas ao longo de uma distância."
  },
  {
    en: "Yoke Carry",
    pt: "Caminhada com yoke",
    descricao: "Caminhar com uma estrutura pesada (yoke) apoiada nos ombros, trabalhando força total."
  },
  {
    en: "Rope Climb",
    pt: "Subida à corda",
    descricao: "Subir a corda usando técnica de pernas ou apenas braços, tocando um alvo no topo."
  },

  /* ACESSÓRIOS / MOBILIDADE EXTRA */
  {
    en: "Hip Thrust",
    pt: "Elevação de anca",
    descricao: "Elevar a anca com costas apoiadas num banco, com ou sem carga, focando glúteos."
  },
  {
    en: "Glute Bridge",
    pt: "Ponte de glúteos",
    descricao: "Elevar a anca a partir de posição deitado no chão, mantendo ombros apoiados."
  },
  {
    en: "Reverse Hyperextension",
    pt: "Hiperextensão reversa",
    descricao: "Elevar as pernas atrás do corpo na máquina Reverse Hyper, trabalhando glúteos e lombar."
  },
  {
    en: "Shrug",
    pt: "Encolhimento de ombros",
    descricao: "Elevar os ombros em direção às orelhas segurando barra ou halteres, focando trapézios."
  },

  /* BODYWEIGHT / WARM-UP EXTRA */
  {
    en: "Air Squat",
    pt: "Agachamento livre",
    descricao: "Agachamento apenas com o peso corporal, pés à largura dos ombros, descendo até a anca ficar abaixo da linha dos joelhos e subindo com extensão completa."
  },
  {
    en: "Jumping Jack",
    pt: "Saltos de abertura",
    descricao: "Saltos em que braços e pernas abrem e fecham em simultâneo, usados sobretudo em aquecimento geral."
  },
  {
    en: "Down Dog / Up Dog",
    pt: "Transição cão a olhar para baixo / cobra",
    descricao: "Sequência de mobilidade entre a posição de cão a olhar para baixo e a posição de cobra, alongando ombros, cadeia posterior e coluna."
  },
  {
    en: "Dead Hang",
    pt: "Pendurado estático na barra",
    descricao: "Manter-se pendurado na barra com braços estendidos e ombros ativos, sem balançar, reforçando pega e estabilidade escapular."
  },
  {
    en: "Wall Sit",
    pt: "Sentar na parede",
    descricao: "Isometria de pernas com costas apoiadas na parede e joelhos a 90 graus, mantendo a posição durante o tempo prescrito."
  },
  {
    en: "DB Devil Press",
    pt: "Devil press com halteres",
    descricao: "Burpee com halteres seguido de swing até overhead num só movimento contínuo, exercício muito exigente de corpo inteiro."
  },
  {
    en: "KB Swing (Russian)",
    pt: "Swing russo com kettlebell",
    descricao: "Swing da kettlebell até à altura dos ombros, focado na extensão explosiva da anca e na cadeia posterior."
  },
  {
    en: "KB Swing (American)",
    pt: "Swing americano com kettlebell",
    descricao: "Swing da kettlebell até acima da cabeça, exigindo maior amplitude de movimento e controlo de ombros."
  }
];

/* Movimentos considerados técnicos (para % e para sugerir tipo "técnica/força") */
const TECHNICAL_MOVES = [
  // Força / barra – básicos e de %
  "Back Squat",
  "Front Squat",
  "Overhead Squat",
  "Deadlift",
  "Sumo Deadlift",
  "Romanian Deadlift (RDL)",
  "Chest Press",
  "Strict Press",
  "Push Press",
  "Push Jerk",
  "Split Jerk",
  "Thruster",
  "Good Morning",
  "Barbell Row",
  "Bent Over Row",
  "Hip Thrust com barra",
  "Lunges com barra",

  // Levantamento olímpico
  "Power Clean",
  "Squat Clean",
  "Hang Clean",
  "Hang Power Clean",
  "Clean & Jerk",
  "Power Snatch",
  "Squat Snatch",
  "Snatch Deadlift",
  "Hang Power Snatch",
  "Sots Press",

  // Halteres / KB com técnica
  "Dumbbell Snatch",
  "Dumbbell Clean",
  "Dumbbell Clean & Jerk",
  "Dumbbell Thruster",
  "Dumbbell Bench Press",
  "Dumbbell Press",
  "Dumbbell Row",
  "Dumbbell Lunges",
  "Kettlebell Swing",
  "Kettlebell Clean",
  "Kettlebell Snatch",
  "Goblet Squat",
  "Kettlebell Lunges",
  "KB Swing (Russian)",
  "KB Swing (American)",

  // Ginástica técnica / skills
  "Pull-Up",
  "Chin-Up",
  "Strict Chin-Up",
  "Scapular Pull-Up",
  "Chest-to-Bar Pull-Up",
  "Kipping Pull-Up",
  "Bar Muscle-Up",
  "Ring Muscle-Up",
  "Muscle-Up",
  "Ring Dip",
  "Ring Support Hold",
  "Ring Row",
  "Toes-to-Bar (T2B)",
  "Knees-to-Elbows (K2E)",
  "Hanging Knee Raise",
  "Pistol Squat",
  "L-Sit Hold",

  // Handstand / inversões
  "Handstand Hold",
  "Nose-to-Wall Handstand Hold",
  "Handstand Walk",
  "Handstand Shoulder Tap",
  "Handstand Push-Up (HSPU)",
  "Strict Handstand Push-Up",
  "Wall Walk",
  "Handstand Walk Practice",

  // Core / shapes ginásticos
  "Hollow Hold",
  "Hollow Rock",
  "Arch Hold",
  "Arch Rock",
  "Kip Swing",

  // Técnicos de barra/argolas com banda
  "Band Pull-Down",
  "Band Transition",
  "Pull-Over",

  // PVC / mobilidade técnica
  "PVC Overhead Squat",
  "PVC Pass Through",
  "Dynamic Squat Stretch"
];

/* Movimentos de metcon / condicionamento (para sugerir tipo "metcon") */
const METCON_MOVES = [
  // Metcon clássicos de peso corporal
  "Burpee",
  "Burpee Box Jump-Over",
  "Burpee Box Jump",
  "Burpee Pull-Up",
  "Air Squat",
  "Jumping Jack",
  "Sit-Up",
  "Floor Leg Raise",
  "V-Up",
  "Plank",
  "Plank Hold",
  "Plank Pike",
  "Plank Jump",
  "Tuck Roll",
  "Wall Sit",

  // Caixa / wall ball
  "Box Jump",
  "Box Jump Over",
  "Wall Ball",

  // Halteres / KB em contexto de condicionamento
  "Dumbbell Snatch",
  "Dumbbell Thruster",
  "Dumbbell Lunges",
  "Walking Lunge",
  "DB Devil Press",
  "Devil Press",
  "Man Maker",
  "Kettlebell Swing",
  "Kettlebell Lunges",
  "KB Swing (Russian)",
  "KB Swing (American)",
  "Goblet Squat",

  // Cardio máquinas e corrida
  "Running",
  "Sprint",
  "Rowing",
  "Row",
  "Ski Erg",
  "Assault Bike",

  // Corda
  "Double Under",
  "Single Under",

  // Carries / trenó / strongman de condicionamento
  "Farmer Carry",
  "Sandbag Carry",
  "Yoke Carry",
  "Sled Push",
  "Sled Pull",

  // Subida à corda – em WOD é quase sempre metcon
  "Rope Climb"
];

/* Inferir tipo automaticamente para o WOD */
function inferTipo(ex) {
  if (!ex) return "";

  if (TECHNICAL_MOVES.includes(ex)) {
    return "técnica";
  }

  if (METCON_MOVES.includes(ex)) {
    return "metcon";
  }

  // resto tratado como força
  return "força";
}

/* Lista completa de exercícios em inglês (para WOD, Objetivo, Guia) */
const ALL_EXERCISES = Array.from(new Set(EXER_INFO.map(ex => ex.en))).sort();

/* Completar MOVES_PT com todos os exercícios do guia */
EXER_INFO.forEach(ex => {
  MOVES_PT[ex.en] = ex.pt;
});

const PERC = [
  0.25, 0.30, 0.35, 0.40, 0.50, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95
];

let dataRm = JSON.parse(localStorage.getItem(STORAGE_RM) || "{}");
let rmHistory = JSON.parse(localStorage.getItem(STORAGE_RM_HISTORY) || "{}");

const sel = document.getElementById("exercise");
const rm = document.getElementById("oneRm");
const bodyTable = document.getElementById("tableBody");
/* Ferramenta rápida 1RM */
const quickExerciseEl = document.getElementById("quickExercise");
const quickPercentEl = document.getElementById("quickPercent");
const quickPesoEl = document.getElementById("quickPeso");
const quickPesoInputEl = document.getElementById("quickPesoInput");
const quickPercResultEl = document.getElementById("quickPercResult");

/* WOD */
let treinos = JSON.parse(localStorage.getItem(STORAGE_TREINO) || "[]");
  if (!Array.isArray(treinos)) {
  treinos = [];
  localStorage.setItem(STORAGE_TREINO, JSON.stringify(treinos));
}

const treinoDataEl = document.getElementById("treinoData");
const treinoExEl = document.getElementById("treinoExercicio");
const treinoExSearchEl = document.getElementById("treinoExercicioSearch");
const treinoParteEl = document.getElementById("treinoParte");
const treinoFormatoEl = document.getElementById("treinoFormato");
const treinoRondasEl = document.getElementById("treinoRondas");
const treinoRepsEl = document.getElementById("treinoReps");
const treinoPesoEl = document.getElementById("treinoPeso");
const treinoTempoEl = document.getElementById("treinoTempo");
const treinoDistEl = document.getElementById("treinoDist");
const treinoPercentEl = document.getElementById("treinoPercent");
const treinoPercentInfoEl = document.getElementById("treinoPercentInfo");
const treinoAddBtn = document.getElementById("treinoAdd");
const treinoBody = document.getElementById("treinoBody");
const treinoResumoEl = document.getElementById("treinoResumo");
const treinoSugestaoEl = document.getElementById("treinoSugestao");
const weeklyHistoryEl = document.getElementById("weeklyHistory");
const printHistoryBtn = document.getElementById("printHistoryBtn");
const dailyHistoryBody = document.getElementById("dailyHistoryBody");
const treinoScrollEl = document.getElementById("treinoScroll");
/* Resultado global do WOD + OCR do quadro */
let wodResultados = JSON.parse(localStorage.getItem(STORAGE_WOD_RESULT) || "{}");
const treinoResultadoEl = document.getElementById("treinoResultado");
const wodPhotoBtn = document.getElementById("wodPhotoBtn");
const wodPhotoInput = document.getElementById("wodPhotoInput");
const wodPhotoStatusEl = document.getElementById("wodPhotoStatus");
const wodOcrPreviewEl = document.getElementById("wodOcrPreview");
const wodOcrApplyBtn = document.getElementById("wodOcrApplyBtn");
if (treinoDataEl && document.getElementById("wodQuadroCard")) {
  renderQuadroWodDia(treinoDataEl.value);
}

  

/* Chips de resumo do dia */
const treinoStatsRow = document.getElementById("treinoStats");
const statCargaEl = document.getElementById("statCarga");
const statExerciciosEl = document.getElementById("statExercicios");
const statTempoEl = document.getElementById("statTempo");
const statVolumeEl = document.getElementById("statVolume");
const statTempoChipEl = document.getElementById("statTempoChip");

/* OBJETIVO */
const calcExEl = document.getElementById("calcExercicio");
const calcRepsEl = document.getElementById("calcReps");
const calcObjEl = document.getElementById("calcObjetivo");
const calcTargetKgEl = document.getElementById("calcTargetKg");
const calcWeeksEl = document.getElementById("calcWeeks");
const calcResEl = document.getElementById("calcResultado");
const calcBtn = document.getElementById("calcBtn");

/* Gráficos */
const graphExerciseEl = document.getElementById("graphExercise");
const rmChartCanvas = document.getElementById("rmChart");
let rmChart = null;

/* Guia exercícios */
const guiaBody = document.getElementById("guiaBody");
const guiaSearch = document.getElementById("guiaSearch");

/* Performance (rankings) */
const perfWodBody = document.getElementById("perfWodBody");
const perf1rmBody = document.getElementById("perf1rmBody");
const perfMetconBody = document.getElementById("perfMetconBody");

/* Backup */
const exportBackupBtn = document.getElementById("exportBackupBtn");
const importBackupBtn = document.getElementById("importBackupBtn");
const backupFileInput = document.getElementById("backupFileInput");
const backupInfoEl = document.getElementById("backupInfo");

/* Reservas & presenças */
const reservasBtn = document.getElementById("reservasBtn");
const reservasSection = document.getElementById("sec-reservas");
const reservaDataEl = document.getElementById("reservaData");
const reservaHoraEl = document.getElementById("reservaHora");
const reservaTipoEl = document.getElementById("reservaTipo");
const reservaNotaEl = document.getElementById("reservaNota");
const reservaAddBtn = document.getElementById("reservaAddBtn");
const reservasBody = document.getElementById("reservasBody");
const reservasResumoEl = document.getElementById("reservasResumo");

let reservas = JSON.parse(localStorage.getItem(STORAGE_RESERVAS) || "[]");
let presencas = JSON.parse(localStorage.getItem(STORAGE_PRESENCAS) || "[]");
let rankingsMensais = JSON.parse(localStorage.getItem(STORAGE_RANKINGS) || "[]");

function formatKg(v) {
  return v.toFixed(1).replace(".", ",") + " kg";
}

function formatKm(v) {
  return v.toFixed(2).replace(".", ",") + " km";
}

/* Selects – 1RM só com MOVES (peso); WOD com ALL_EXERCISES */
function updateTreinoExercicioOptions(filter) {
  if (!treinoExEl) return;
  const f = (filter || "").toLowerCase();
  treinoExEl.innerHTML = "";
  ALL_EXERCISES.forEach(m => {
    const label = MOVES_PT[m] ? `${m} – ${MOVES_PT[m]}` : m;
    if (f && !label.toLowerCase().includes(f)) return;
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = label;
    treinoExEl.appendChild(opt);
  });
}

function initSelects() {
  if (sel) {
    sel.innerHTML = "";
    MOVES.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      const label = MOVES_PT[m] ? `${m} – ${MOVES_PT[m]}` : m;
      opt.textContent = label;
      sel.appendChild(opt);
    });
  }

  updateTreinoExercicioOptions("");
}

if (treinoExSearchEl) {
  treinoExSearchEl.addEventListener("input", () => {
    updateTreinoExercicioOptions(treinoExSearchEl.value || "");
  });
}

/* OBJETIVO – lista completa de exercícios; cálculo só funciona se tiver 1RM */
function refreshCalcExOptions() {
  if (!calcExEl) return;
  calcExEl.innerHTML = "";

  if (!ALL_EXERCISES.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Sem exercícios disponíveis";
    calcExEl.appendChild(opt);
    calcExEl.disabled = true;
    return;
  }

  calcExEl.disabled = false;
  ALL_EXERCISES.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    calcExEl.appendChild(opt);
  });
}

function refreshGraphExerciseOptions() {
  if (!graphExerciseEl) return;

  // junta todos os nomes que tenham 1RM atual ou histórico
  const allNames = new Set([
    ...Object.keys(dataRm || {}),
    ...Object.keys(rmHistory || {})
  ]);

  const names = Array.from(allNames).sort();

  graphExerciseEl.innerHTML = "";

  if (!names.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Sem dados de 1RM";
    graphExerciseEl.appendChild(opt);
    graphExerciseEl.disabled = true;
    updateRmChart();
    return;
  }

  graphExerciseEl.disabled = false;

  names.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    graphExerciseEl.appendChild(opt);
  });

  // garante que o gráfico corresponde ao exercício selecionado
  updateRmChart();
}
function refreshQuickExerciseOptions() {
  if (!quickExerciseEl) return;

  quickExerciseEl.innerHTML = "";

  // só exercícios com 1RM registado
  const nomes = Object.keys(dataRm || {}).sort();

  if (!nomes.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Sem 1RM registado";
    quickExerciseEl.appendChild(opt);
    quickExerciseEl.disabled = true;

    if (quickPesoEl) quickPesoEl.value = "";
    if (quickPercentEl) quickPercentEl.value = "";
    if (quickPesoInputEl) quickPesoInputEl.value = "";
    if (quickPercResultEl) quickPercResultEl.textContent = "";

    return;
  }

  quickExerciseEl.disabled = false;

  nomes.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    const label = MOVES_PT[name] ? `${name} – ${MOVES_PT[name]}` : name;
    opt.textContent = label;
    quickExerciseEl.appendChild(opt);
  });
}

/* Cálculo: percentagem → peso */
function updateQuickFromPercent() {
  if (!quickExerciseEl || !quickPercentEl || !quickPesoEl) return;

  const ex = quickExerciseEl.value;
  const perc = parseFloat(quickPercentEl.value || "0");
  if (!ex || !dataRm[ex] || !perc || perc <= 0) {
    quickPesoEl.value = "";
    return;
  }

  const base = dataRm[ex];
  const peso = base * (perc / 100);

  // mostra só o número (com vírgula) sem "kg"
  quickPesoEl.value = peso.toFixed(1).replace(".", ",");
}

/* Cálculo inverso: peso → percentagem do 1RM */
function updateQuickFromPeso() {
  if (!quickExerciseEl || !quickPesoInputEl || !quickPercResultEl) return;

  const ex = quickExerciseEl.value;
  const peso = parseFloat(quickPesoInputEl.value || "0");
  if (!ex || !dataRm[ex] || !peso || peso <= 0) {
    quickPercResultEl.textContent = "";
    return;
  }

  const base = dataRm[ex];
  const perc = (peso / base) * 100;
  quickPercResultEl.textContent =
    `Este peso corresponde a cerca de ${perc.toFixed(0)}% do teu 1RM nesse exercício.`;
}

/* Eventos da ferramenta rápida */
if (quickExerciseEl && quickPercentEl) {
  quickExerciseEl.addEventListener("change", () => {
    updateQuickFromPercent();
    updateQuickFromPeso();
  });
  quickPercentEl.addEventListener("input", updateQuickFromPercent);
}

if (quickPesoInputEl) {
  quickPesoInputEl.addEventListener("input", updateQuickFromPeso);
}

function deleteEx(name) {
  if (!name) return;
  if (!confirm(`Apagar o exercício "${name}"?`)) return;
  delete dataRm[name];
  delete rmHistory[name];
  localStorage.setItem(STORAGE_RM, JSON.stringify(dataRm));
  localStorage.setItem(STORAGE_RM_HISTORY, JSON.stringify(rmHistory));
  registerBackupMeta("1RM removido");
  renderRm();
}

function renderRm() {
  bodyTable.innerHTML = "";
  Object.keys(dataRm).sort().forEach(name => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    const label = MOVES_PT[name] ? `${name} – ${MOVES_PT[name]}` : name;
    tdName.textContent = label;
    tr.appendChild(tdName);

    const td1rm = document.createElement("td");
    let oneRmText = formatKg(dataRm[name]);

    if (profile && profile.peso) {
      const rel = dataRm[name] / profile.peso;
      oneRmText += " (" + rel.toFixed(2) + "x peso corporal)";
    }

    const histList = rmHistory[name] || [];
    if (histList.length) {
      const prev = histList[histList.length - 1];
      const prevVal = prev.value;
      const diff = dataRm[name] - prevVal;
      if (Math.abs(diff) >= 0.5) {
        const seta = diff > 0 ? "↑" : "↓";
        const diffAbs = Math.abs(diff).toFixed(1).replace(".", ",");
        oneRmText += ` · ${seta} ${diffAbs} kg vs anterior`;
      }
    }

    td1rm.textContent = oneRmText;
    tr.appendChild(td1rm);

    const tdDelete = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "🗑";
    btn.className = "btn-delete";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteEx(name);
    });
    tdDelete.appendChild(btn);
    tr.appendChild(tdDelete);

    bodyTable.appendChild(tr);
  });

  refreshCalcExOptions();
  refreshGraphExerciseOptions();
  refreshQuickExerciseOptions();
  renderPerformance();
}

document.getElementById("addBtn").addEventListener("click", () => {
  const ex = sel.value;
  const val = parseFloat(rm.value);
  if (!ex || !val || val <= 0) return;

  const old = dataRm[ex];

  if (typeof old === "number" && !isNaN(old) && old !== val) {
    if (!rmHistory[ex]) rmHistory[ex] = [];
    rmHistory[ex].push({
      date: new Date().toISOString().slice(0, 10),
      value: old
    });
  }

  dataRm[ex] = val;
  localStorage.setItem(STORAGE_RM, JSON.stringify(dataRm));
  localStorage.setItem(STORAGE_RM_HISTORY, JSON.stringify(rmHistory));

  rm.value = "";
  registerBackupMeta("1RM atualizado");
  renderRm();
});

/* ===== OBJETIVO (CALCULADORA) ===== */
function getPercentRange(reps, objetivo) {
  let minP, maxP;

  if (objetivo === "forca") {
    if (reps <= 2) { minP = 0.9; maxP = 0.98; }
    else if (reps <= 3) { minP = 0.88; maxP = 0.95; }
    else if (reps <= 5) { minP = 0.80; maxP = 0.90; }
    else { minP = 0.75; maxP = 0.85; }
  } else if (objetivo === "hipertrofia") {
    if (reps <= 5) { minP = 0.75; maxP = 0.85; }
    else if (reps <= 8) { minP = 0.70; maxP = 0.80; }
    else if (reps <= 12) { minP = 0.65; maxP = 0.75; }
    else { minP = 0.55; maxP = 0.70; }
  } else if (objetivo === "tecnica") {
    if (reps <= 5) { minP = 0.50; maxP = 0.65; }
    else if (reps <= 10) { minP = 0.45; maxP = 0.60; }
    else { minP = 0.40; maxP = 0.55; }
  } else {
    if (reps === 1) { minP = 0.9; maxP = 1.0; }
    else if (reps <= 3) { minP = 0.85; maxP = 0.95; }
    else if (reps <= 5) { minP = 0.80; maxP = 0.90; }
    else if (reps <= 8) { minP = 0.70; maxP = 0.80; }
    else if (reps <= 12) { minP = 0.65; maxP = 0.75; }
    else { minP = 0.50; maxP = 0.65; }
  }

  return { minP, maxP };
}

if (calcBtn) {
  calcBtn.addEventListener("click", () => {
    if (!calcExEl || !calcRepsEl || !calcResEl) return;

    const ex = calcExEl.value;
    const reps = parseInt(calcRepsEl.value || "0", 10);
    const obj = calcObjEl ? calcObjEl.value : "";
    const targetKgVal = calcTargetKgEl ? parseFloat(calcTargetKgEl.value || "0") : 0;
    const weeksVal = calcWeeksEl ? parseInt(calcWeeksEl.value || "0", 10) : 0;

    if (!ex) {
      calcResEl.textContent = "Escolhe um exercício.";
      return;
    }
    if (!reps || reps <= 0) {
      calcResEl.textContent = "Indica o número de repetições.";
      return;
    }
    if (!dataRm[ex]) {
      calcResEl.textContent = "Para calcular percentagens de carga, regista primeiro o 1RM desse exercício.";
      return;
    }

    const oneRmVal = dataRm[ex];
    let { minP, maxP } = getPercentRange(reps, obj);

    /* ===== AJUSTE PARA MOVIMENTOS TÉCNICOS ===== */
    const isTechnical = TECHNICAL_MOVES.includes(ex);

    if (isTechnical) {
      if (maxP > 0.85) maxP = 0.85;

      if (obj === "tecnica") {
        if (minP < 0.50) minP = 0.50;
        if (maxP > 0.70) maxP = 0.70;
      } else {
        if (minP < 0.60) minP = 0.60;
        if (maxP > 0.80) maxP = 0.80;
      }

      if (minP > maxP) {
        const mid = (minP + maxP) / 2;
        minP = mid - 0.05;
        maxP = mid + 0.05;
      }
    }

    const minLoad = oneRmVal * minP;
    const maxLoad = oneRmVal * maxP;
    let objetivoTexto = obj === "forca" ? "força" :
                        obj === "hipertrofia" ? "hipertrofia" :
                        obj === "tecnica" ? "técnica / volume leve" :
                        "automático";

    let msg =
      `Para ${reps} repetições em ${ex}, com objetivo ${objetivoTexto}, ` +
      `a carga sugerida é entre ${(minP*100).toFixed(0)}% e ${(maxP*100).toFixed(0)}% do 1RM: ` +
      `${formatKg(minLoad)} – ${formatKg(maxLoad)}. Ajusta para os discos que tens.`;

    if (isTechnical) {
      msg +=
        `\n\nNota: ${ex} é um movimento técnico. Prioriza posição, controlo e estabilidade. ` +
        `Usa séries de 2–3 reps e baixa 5–10% se a técnica começar a quebrar.`;
    }

    /* ===== OBJETIVO DE KG E PRAZO ===== */
    if (targetKgVal && !isNaN(targetKgVal)) {
      if (targetKgVal <= oneRmVal) {
        msg += `\n\nO peso objetivo (${formatKg(targetKgVal)}) está igual ou abaixo do teu 1RM atual. ` +
               `Consolida técnica e volume antes de voltar a subir.`;
      } else if (weeksVal > 0) {
        const incPercent = ((targetKgVal - oneRmVal) / oneRmVal) * 100;
        const incPerWeek = incPercent / weeksVal;

        let dificuldade =
          incPerWeek <= 1 ? "progressão realista" :
          incPerWeek <= 2 ? "progressão exigente" :
          "progressão muito agressiva";

        const nivel = ((profile && profile.nivel) ? profile.nivel : "").toLowerCase();
        let freq = "2–3 sessões semanais";
        let seriesReps = "3–5 séries de 3–6 reps a 75–90%";

        if (nivel === "iniciante") {
          freq = "2–3 sessões focadas no movimento principal";
          seriesReps = "3–4 séries de 5–8 reps a 70–80%";
        } else if (nivel === "intermedio") {
          freq = "2–3 sessões incluindo variações técnicas";
          seriesReps = "4–5 séries de 3–6 reps a 75–85%";
        } else if (nivel === "avancado") {
          freq = "2–3 sessões técnicas + força";
          seriesReps = "3–6 séries de 2–5 reps a 80–90%";
        }

        msg += `\n\nObjetivo: ${formatKg(targetKgVal)} em ${weeksVal} semanas (${dificuldade}). ` +
               `Sugestão: ${freq}, com ${seriesReps}.`;

        if (isTechnical) msg += ` Prioriza sempre a técnica no ${ex}.`;

      } else {
        msg += `\n\nDefine um número de semanas para gerar uma recomendação de progressão semanal.`;
      }
    }

    calcResEl.textContent = msg;
  });
}

/* ===== GRÁFICO 1RM ===== */
function updateRmChart() {
  if (!rmChartCanvas || !graphExerciseEl) return;

  // Fallback: se Chart.js não estiver disponível, desenha um gráfico simples no canvas (offline-safe)
  const hasChartJs = (typeof Chart !== "undefined");

  const ex = graphExerciseEl.value;
  let labels = [];
  let values = [];

  if (ex && (rmHistory[ex] || dataRm[ex])) {
    const hist = (rmHistory[ex] || []).slice().sort((a, b) => {
      return (a.date || "").localeCompare(b.date || "");
    });

    hist.forEach((entry, idx) => {
      labels.push(entry.date || "h" + (idx + 1));
      values.push(entry.value);
    });

    if (dataRm[ex]) {
      labels.push("Atual");
      values.push(dataRm[ex]);
    }
  }

  // Canvas context
  const ctx = rmChartCanvas.getContext("2d");
  if (!ctx) return;

  // Se não houver Chart.js, desenhar manualmente e sair
  if (!hasChartJs) {
    // limpar canvas
    ctx.clearRect(0, 0, rmChartCanvas.width, rmChartCanvas.height);

    const W = rmChartCanvas.clientWidth || rmChartCanvas.width || 320;
    const H = rmChartCanvas.clientHeight || rmChartCanvas.height || 160;

    // garantir tamanho mesmo quando o canvas estava escondido ao abrir a secção
    rmChartCanvas.width = W;
    rmChartCanvas.height = H;

    // se não há dados, escrever "Sem dados"
    if (!labels.length || !values.length) {
      ctx.font = "14px Arial";
      ctx.fillText("Sem dados", 12, 24);
      return;
    }

    const padL = 34, padR = 12, padT = 12, padB = 28;
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = (maxV - minV) || 1;

    // eixos
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // linha
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padL + (i * (W - padL - padR)) / Math.max(1, (values.length - 1));
      const y = (H - padB) - ((v - minV) * (H - padT - padB)) / span;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // labels Y (min/max)
    ctx.font = "10px Arial";
    ctx.fillText(String(maxV), 4, padT + 8);
    ctx.fillText(String(minV), 4, H - padB);

    // labels X (primeiro/último)
    ctx.fillText(String(labels[0]), padL, H - 10);
    ctx.fillText(String(labels[labels.length - 1]), Math.max(padL, W - padR - 60), H - 10);

    return;
  }

  if (rmChart) {
    rmChart.destroy();
    rmChart = null;
  }

  if (!labels.length) {
    rmChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Sem dados"],
        datasets: [{
          label: "1RM (kg)",
          data: [0],
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
    return;
  }

  const datasetLabel = MOVES_PT[ex]
    ? `${ex} – ${MOVES_PT[ex]} – 1RM (kg)`
    : ex + " – 1RM (kg)";

  rmChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: datasetLabel,
        data: values,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: {
          title: { display: true, text: "Registos" }
        },
        y: {
          title: { display: true, text: "Peso (kg)" },
          beginAtZero: false
        }
      }
    }
  });
}

if (graphExerciseEl) {
  graphExerciseEl.addEventListener("change", updateRmChart);
}

/* ===== WOD ===== */
function saveTreinos() {
  localStorage.setItem(STORAGE_TREINO, JSON.stringify(treinos));
}

function calcCarga(entry) {
  const peso = entry.peso || 0;
  const reps = entry.reps || 0;
  const rondas = entry.rondas || 1;
  return peso * reps * rondas;
}

function addTreinoEntry() {
  const hoje = new Date().toISOString().slice(0, 10);
  const date = (treinoDataEl && treinoDataEl.value) ? treinoDataEl.value : hoje;

  // novos campos do WOD (já sem estrutura)
  const parte = treinoParteEl ? (treinoParteEl.value || "") : "";
  const formato = treinoFormatoEl ? (treinoFormatoEl.value || "") : "";

  const ex = treinoExEl.value;

// tipo base pela lista (força/técnica/metcon)
let tipo = inferTipo(ex);

// se o formato é típico de metcon, forçar "metcon"
const formatosMetcon = [
  "For Time",
  "AMRAP",
  "EMOM",
  "Chipper",
  "Intervalos 2′ on / 2′ off",
  "A cada X′ × Y"
];

if (formato && formatosMetcon.includes(formato)) {
  tipo = "metcon";
}

  const rondas = parseInt(treinoRondasEl.value || "1", 10);
  const reps = parseInt(treinoRepsEl.value || "0", 10);
  const peso = parseFloat(treinoPesoEl.value || "0");
  const tempo = treinoTempoEl.value.trim();
  const distKmVal = parseFloat(treinoDistEl.value || "0");

  // validações básicas do WOD
  if (!ex || !reps || reps <= 0) return;

  const carga = calcCarga({ peso, reps, rondas });
  let perc1rm = null;
  if (dataRm[ex] && dataRm[ex] > 0 && peso > 0) {
    perc1rm = peso / dataRm[ex];
  }

  const entry = {
    date,
    parte,
    formato,
    ex,
    tipo,
    rondas,
    reps,
    peso,
    tempo,
    carga,
    perc1rm,
    distanciaKm: (!isNaN(distKmVal) && distKmVal > 0) ? distKmVal : 0
  };

  // 1) guardar sempre o WOD primeiro
  treinos.unshift(entry);
  saveTreinos();
  registerBackupMeta("WOD registado");
  renderTreinos();

  try {
  // 2) 1RM a partir do WOD (rep × kg) — funciona mesmo sem 1RM prévio
  // Regras (para evitar falsos positivos):
  // - apenas exercícios de carga (presentes em MOVES)
  // - apenas séries "de força" (1–10 reps)
  // - evita metcon (AMRAP/EMOM/For Time, etc.)
  const current1rm = dataRm[ex];

  if (!peso || peso <= 0) return;
  if (!MOVES.includes(ex)) return;
  if (reps < 1 || reps > 10) return;
  if (tipo === "metcon") return;

  // Estimativa simples de 1RM (Epley): 1RM ≈ peso × (1 + reps/30)
  const est1rm = peso * (1 + reps / 30);

  // arredondar para 0.5 kg
  const est1rmRounded = Math.round(est1rm * 2) / 2;

  const label = MOVES_PT[ex] ? `${ex} – ${MOVES_PT[ex]}` : ex;

  // Caso A: ainda não existe 1RM registado → sugerir criar o primeiro
  if (!current1rm || current1rm <= 0) {
    const msg = `1RM (estimado) a partir do WOD\n\nExercício: ${label}\nSérie registada: ${reps} repetições com ${formatKg(peso)}\n\n1RM estimado: ${formatKg(est1rmRounded)}\n\nNão tens 1RM registado para este exercício.\nQueres guardar este valor como o teu 1RM atual?`;

    const aceitar = confirm(msg);
    if (!aceitar) return;

    dataRm[ex] = est1rmRounded;
    localStorage.setItem(STORAGE_RM, JSON.stringify(dataRm));

    // iniciar histórico vazio (mantém consistência)
    if (!rmHistory[ex]) rmHistory[ex] = [];
    localStorage.setItem(STORAGE_RM_HISTORY, JSON.stringify(rmHistory));

    // atualizar %1RM do registo que acabámos de criar
    const idx = treinos.indexOf(entry);
    if (idx !== -1) {
      treinos[idx].perc1rm = peso > 0 ? (peso / est1rmRounded) : null;
      saveTreinos();
    }

    registerBackupMeta("1RM criado a partir do WOD");
    renderRm();
    renderTreinos();

    alert(`1RM registado para ${label}: ${formatKg(est1rmRounded)} (estimado a partir do WOD).`);
    return;
  }

  // Caso B: já existe 1RM → sugerir atualização apenas se houver subida credível
  const approxPerc = peso / current1rm;
  if (approxPerc < 0.6) return; // séries muito leves não contam

  const diff = est1rmRounded - current1rm;

  // só sugerir se for uma subida "real" (>= 1 kg e pelo menos +2%)
  if (diff < 1 || est1rmRounded < current1rm * 1.02) return;

  const msg = `Modo assistido de 1RM\n\nExercício: ${label}\nSérie registada: ${reps} repetições com ${formatKg(peso)}\n\n1RM atual registado: ${formatKg(current1rm)}\n1RM estimado a partir desta série: ${formatKg(est1rmRounded)}\n\nEsta série parece indicar que o teu 1RM subiu.\nQueres atualizar o 1RM para este novo valor?`;

  const aceitar = confirm(msg);
  if (!aceitar) return;

  if (!rmHistory[ex]) rmHistory[ex] = [];
  rmHistory[ex].push({
    date: new Date().toISOString().slice(0, 10),
    value: current1rm
  });

  dataRm[ex] = est1rmRounded;
  localStorage.setItem(STORAGE_RM, JSON.stringify(dataRm));
  localStorage.setItem(STORAGE_RM_HISTORY, JSON.stringify(rmHistory));

  const idx = treinos.indexOf(entry);
  if (idx !== -1) {
    treinos[idx].perc1rm = peso > 0 ? (peso / est1rmRounded) : null;
    saveTreinos();
  }

  registerBackupMeta("1RM atualizado (modo assistido)");
  renderRm();
  renderTreinos();

  alert(`Novo 1RM registado para ${label}: ${formatKg(est1rmRounded)} (estimado a partir do WOD).`);

} catch (e) {
  console.error("Erro no cálculo automático de 1RM a partir do WOD:", e);
}



  function deleteTreinoEntry(index) {
  if (index < 0 || index >= treinos.length) return;
  if (!confirm("Apagar este registo de WOD?")) return;
  treinos.splice(index, 1);
  saveTreinos();
  registerBackupMeta("WOD removido");
  renderTreinos();
}

function editTreinoEntry(index) {
  if (index < 0 || index >= treinos.length) return;

  const e = treinos[index];

  // prompts simples e rápidos (sem UI extra)
  const novoParte = prompt("Parte (A/B/C/D/Outro):", e.parte || "") ?? (e.parte || "");
  const novoFormato = prompt("Formato (For Time/AMRAP/EMOM/...):", e.formato || "") ?? (e.formato || "");

  const novoRondasStr = prompt("Séries/Rondas:", String(e.rondas ?? 1));
  const novoRepsStr = prompt("Repetições:", String(e.reps ?? 0));
  const novoPesoStr = prompt("Peso (kg):", String(e.peso ?? 0));
  const novoTempo = prompt("Tempo (ex: 12:35 ou 20'):", e.tempo || "") ?? (e.tempo || "");
  const novaDistStr = prompt("Distância (km):", String(e.distanciaKm ?? 0));

  const novoRondas = Math.max(1, parseInt(novoRondasStr || "1", 10));
  const novoReps = Math.max(0, parseInt(novoRepsStr || "0", 10));
  const novoPeso = Math.max(0, parseFloat((novoPesoStr || "0").replace(",", ".")));
  const novaDist = Math.max(0, parseFloat((novaDistStr || "0").replace(",", ".")));

  // atualizar
  e.parte = novoParte;
  e.formato = novoFormato;
  e.rondas = novoRondas;
  e.reps = novoReps;
  e.peso = novoPeso;
  e.tempo = novoTempo;
  e.distanciaKm = novaDist;

  // recalcular tipo/carga/%1RM
  // (tipo ajustado pelo formato, como no add)
  let tipo = inferTipo(e.ex);
  const formatosMetcon = ["For Time","AMRAP","EMOM","Chipper","Intervalos 2′ on / 2′ off","A cada X′ × Y"];
  if (e.formato && formatosMetcon.includes(e.formato)) tipo = "metcon";
  e.tipo = tipo;

  e.carga = calcCarga({ peso: e.peso, reps: e.reps, rondas: e.rondas });

  if (dataRm[e.ex] && dataRm[e.ex] > 0 && e.peso > 0) {
    e.perc1rm = e.peso / dataRm[e.ex];
  } else {
    e.perc1rm = null;
  }

  saveTreinos();
  registerBackupMeta("WOD editado");
  renderTreinos();
}


function renderDailyHistory() {
  if (!dailyHistoryBody) return;
  dailyHistoryBody.innerHTML = "";

  if (!treinos.length) return;

  // criar array com índice para conseguir apagar mesmo estando ordenado
  const sorted = treinos
    .map((t, i) => ({ ...t, idx: i }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  sorted.forEach(t => {
    const tr = document.createElement("tr");
    // long-press 2s para editar (mobile e desktop)
let pressTimer = null;

const startPress = () => {
  pressTimer = setTimeout(() => {
    // abrir editor deste registo
    const idx = treinos.indexOf(e);
    if (idx !== -1) editTreinoEntry(idx);
  }, 2000);
};

const cancelPress = () => {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
};

tr.addEventListener("touchstart", startPress, { passive: true });
tr.addEventListener("touchend", cancelPress);
tr.addEventListener("touchmove", cancelPress);

tr.addEventListener("mousedown", startPress);
tr.addEventListener("mouseup", cancelPress);
tr.addEventListener("mouseleave", cancelPress);

    const tdDate = document.createElement("td");
    tdDate.textContent = t.date || "";
    tr.appendChild(tdDate);

    const tdParte = document.createElement("td");
    tdParte.textContent = t.parte || "";
    tr.appendChild(tdParte);

    const tdFormato = document.createElement("td");
    tdFormato.textContent = t.formato || "";
    tr.appendChild(tdFormato);

    const tdEx = document.createElement("td");
    const label = MOVES_PT[t.ex] ? `${t.ex} – ${MOVES_PT[t.ex]}` : t.ex;
    tdEx.textContent = label || "";
    tr.appendChild(tdEx);

    const tdTipo = document.createElement("td");
    tdTipo.textContent = t.tipo || "";
    tr.appendChild(tdTipo);

    const tdR = document.createElement("td");
    tdR.textContent = t.rondas || "";
    tr.appendChild(tdR);

    const tdReps = document.createElement("td");
    tdReps.textContent = t.reps || "";
    tr.appendChild(tdReps);

    const tdPeso = document.createElement("td");
    tdPeso.textContent = t.peso ? formatKg(t.peso) : "";
    tr.appendChild(tdPeso);

    const tdPerc = document.createElement("td");
    tdPerc.textContent = t.perc1rm ? (t.perc1rm * 100).toFixed(0) + "%" : "";
    tr.appendChild(tdPerc);

    const tdTempo = document.createElement("td");
    tdTempo.textContent = t.tempo || "";
    tr.appendChild(tdTempo);

    const tdDist = document.createElement("td");
    tdDist.textContent = t.distanciaKm ? formatKm(t.distanciaKm) : "";
    tr.appendChild(tdDist);

    const tdCarga = document.createElement("td");
    tdCarga.textContent = t.carga ? formatKg(t.carga) : "";
    tr.appendChild(tdCarga);

    // botão do lixo
    const tdDel = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "🗑";
    btn.className = "btn-delete";
    btn.addEventListener("click", () => deleteTreinoEntry(t.idx));
    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    dailyHistoryBody.appendChild(tr);
  });
 
}
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
  
function exportHistoricoPdf() {
  try {
    if (!Array.isArray(treinos) || treinos.length === 0) {
      alert("Sem treinos registados.");
      return;
    }

    const listaFull = treinos
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const geradoEm = new Date().toLocaleString("pt-PT");

    // Construir HTML apenas do conteúdo (vamos imprimir na mesma página, sem pop-ups/iframes)
    let bodyHtml = `
      <h1 style="margin:0 0 10px 0;font-size:18px;">Histórico WOD</h1>
      <p style="color:#555;font-size:11px;margin:0 0 14px 0;">Gerado em ${escapeHtml(geradoEm)}</p>
    `;

    bodyHtml += `
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Data</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Parte</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Formato</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Exercício</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Tipo</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Rondas</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Reps</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Peso</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">% 1RM</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Tempo</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Distância (km)</th>
            <th style="border:1px solid #bbb;padding:6px;background:#f2f2f2;text-align:left;">Carga (kg)</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const t of listaFull) {
      if (!t || typeof t !== "object") continue;

      const peso  = (t.peso!=null && t.peso!=="" && !isNaN(Number(t.peso))) ? Number(t.peso) : "";
      const reps  = (t.reps!=null && t.reps!=="" && !isNaN(Number(t.reps))) ? Number(t.reps) : "";
      const rond  = (t.rondas!=null && t.rondas!=="" && !isNaN(Number(t.rondas))) ? Number(t.rondas) : "";
      const perc  = (t.perc1rm!=null && t.perc1rm!=="" && !isNaN(Number(t.perc1rm))) ? Number(t.perc1rm) : "";
      const dist  = (t.distanciaKm!=null && t.distanciaKm!=="" && !isNaN(Number(t.distanciaKm))) ? Number(t.distanciaKm) : "";
      const carga = (t.carga!=null && t.carga!=="" && !isNaN(Number(t.carga))) ? Number(t.carga) : "";

      bodyHtml += `
        <tr>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;">${escapeHtml(t.date || "")}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;">${escapeHtml(t.parte || "")}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;">${escapeHtml(t.formato || "")}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;">${escapeHtml(t.exercicio || "")}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;">${escapeHtml(t.tipo || "")}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;text-align:center;">${rond===""?"":rond}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;text-align:center;">${reps===""?"":reps}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;text-align:center;">${peso===""?"":peso}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;text-align:center;">${perc===""?"":perc}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;">${escapeHtml(t.tempo || "")}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;text-align:center;">${dist===""?"":dist}</td>
          <td style="border:1px solid #bbb;padding:6px;vertical-align:top;text-align:center;">${carga===""?"":carga}</td>
        </tr>
      `;
    }

    bodyHtml += `
        </tbody>
      </table>
    `;

    // Impressão "same-page": cria uma área de impressão temporária e chama window.print().
    const existingArea = document.getElementById("printArea");
    if (existingArea) existingArea.remove();
    const existingStyle = document.getElementById("printStyle");
    if (existingStyle) existingStyle.remove();

    const style = document.createElement("style");
    style.id = "printStyle";
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #printArea, #printArea * { visibility: visible !important; }
        #printArea {
          position: fixed !important;
          left: 0; top: 0;
          width: 100%;
          padding: 18px;
          background: #fff !important;
          color: #111 !important;
          box-sizing: border-box;
        }
      }
      #printArea {
        position: fixed;
        left: 0; top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        padding: 18px;
        background: #fff;
        color: #111;
        z-index: 999999;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);

    const area = document.createElement("div");
    area.id = "printArea";
    area.innerHTML = bodyHtml;
    document.body.appendChild(area);

    const cleanup = () => {
      try { area.remove(); } catch(e) {}
      try { style.remove(); } catch(e) {}
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);

    // alguns dispositivos precisam de um pequeno delay
    setTimeout(() => {
      try { window.print(); } catch (e) { cleanup(); alert("O dispositivo não permitiu imprimir."); }
    }, 250);

  } catch (e) {
    console.error(e);
    alert("Erro ao exportar/imprimir o histórico.");
  }
}

function printTreinosPdf() {
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    const dia = (treinoDataEl && treinoDataEl.value) ? treinoDataEl.value : hoje;

    // WOD do dia
    const listaDia = treinos.filter(t => t.date === dia);
    // Histórico completo (tudo ordenado da data mais recente para a mais antiga)
    const listaFull = treinos.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    let html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>CrossBox - Histórico de treinos</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      color: #111;
      margin: 16px;
    }
    h1, h2, h3 {
      margin: 0 0 6px 0;
    }
    h1 { font-size: 18px; }
    h2 { font-size: 14px; margin-top: 14px; }
    p { margin: 4px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 4px;
      text-align: center;
      white-space: nowrap;
    }
    th {
      background: #e5e5e5;
    }
    .small {
      font-size: 10px;
      color: #444;
    }
    /* Ajuste fino da tabela 1RM (tab 1RM) */
#sec-1rm .card:nth-of-type(2) table {
  table-layout: fixed;
}

#sec-1rm .card:nth-of-type(2) th,
#sec-1rm .card:nth-of-type(2) td {
  white-space: normal;
  text-align: left;
}

#sec-1rm .card:nth-of-type(2) td:first-child {
  font-weight: 600;
}

#sec-1rm .card:nth-of-type(2) td:last-child {
  text-align: center;
  width: 40px;
}
  </style>
</head>
<body>
  <h1>CrossBox – Histórico de treinos</h1>
`;

    if (profile && profile.nome) {
      html += `<p><strong>Atleta:</strong> ${profile.nome}</p>`;
    }

    html += `<p class="small">Gerado em: ${new Date().toLocaleString()}</p>`;

    // Resumo do dia + sugestão + histórico semanal
    html += `<h2>Resumo do dia ${dia}</h2>`;
    if (treinoResumoEl && treinoResumoEl.textContent) {
      html += `<p><strong>Resumo:</strong> ${treinoResumoEl.textContent}</p>`;
    }
    if (treinoSugestaoEl && treinoSugestaoEl.textContent) {
      html += `<p><strong>Sugestão:</strong> ${treinoSugestaoEl.textContent}</p>`;
    }
    if (weeklyHistoryEl && weeklyHistoryEl.innerHTML) {
      html += `<h2>Histórico semanal</h2>`;
      html += `<div class="small">${weeklyHistoryEl.innerHTML}</div>`;
    }

    // Tabela do WOD do dia
    html += `<h2>WOD do dia (${dia})</h2>`;

    if (!listaDia.length) {
      html += `<p>Sem WOD registado para este dia.</p>`;
    } else {
      html += `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Parte</th>
            <th>Formato</th>
            <th>Exercício</th>
            <th>Tipo</th>
            <th>Rondas</th>
            <th>Reps</th>
            <th>Peso</th>
            <th>% 1RM</th>
            <th>Tempo</th>
            <th>Distância (km)</th>
            <th>Carga (kg)</th>
          </tr>
        </thead>
        <tbody>
      `;
      listaDia.forEach(t => {
        const label = MOVES_PT[t.ex] ? `${t.ex} – ${MOVES_PT[t.ex]}` : (t.ex || "");
        const pesoTxt = t.peso ? formatKg(t.peso) : "";
        const percTxt = t.perc1rm ? (t.perc1rm * 100).toFixed(0) + "%" : "";
        const distTxt = t.distanciaKm ? formatKm(t.distanciaKm) : "";
        const cargaTxt = t.carga ? formatKg(t.carga) : "";

        html += `
          <tr>
            <td>${t.date || ""}</td>
            <td>${t.parte || ""}</td>
            <td>${t.formato || ""}</td>
            <td>${label}</td>
            <td>${t.tipo || ""}</td>
            <td>${t.rondas || ""}</td>
            <td>${t.reps || ""}</td>
            <td>${pesoTxt}</td>
            <td>${percTxt}</td>
            <td>${t.tempo || ""}</td>
            <td>${distTxt}</td>
            <td>${cargaTxt}</td>
          </tr>
        `;
      });
      html += `
        </tbody>
      </table>
      `;
    }

    // Histórico diário completo
    html += `<h2>Histórico diário completo</h2>`;

    if (!listaFull.length) {
      html += `<p>Sem registos de WOD.</p>`;
    } else {
      html += `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Parte</th>
            <th>Formato</th>
            <th>Exercício</th>
            <th>Tipo</th>
            <th>Rondas</th>
            <th>Reps</th>
            <th>Peso</th>
            <th>% 1RM</th>
            <th>Tempo</th>
            <th>Distância (km)</th>
            <th>Carga (kg)</th>
          </tr>
        </thead>
        <tbody>
      `;
      listaFull.forEach(t => {
        const label = MOVES_PT[t.ex] ? `${t.ex} – ${MOVES_PT[t.ex]}` : (t.ex || "");
        const pesoTxt = t.peso ? formatKg(t.peso) : "";
        const percTxt = t.perc1rm ? (t.perc1rm * 100).toFixed(0) + "%" : "";
        const distTxt = t.distanciaKm ? formatKm(t.distanciaKm) : "";
        const cargaTxt = t.carga ? formatKg(t.carga) : "";

        html += `
          <tr>
            <td>${t.date || ""}</td>
            <td>${t.parte || ""}</td>
            <td>${t.formato || ""}</td>
            <td>${label}</td>
            <td>${t.tipo || ""}</td>
            <td>${t.rondas || ""}</td>
            <td>${t.reps || ""}</td>
            <td>${pesoTxt}</td>
            <td>${percTxt}</td>
            <td>${t.tempo || ""}</td>
            <td>${distTxt}</td>
            <td>${cargaTxt}</td>
          </tr>
        `;
      });
      html += `
        </tbody>
      </table>
      `;
    }

    html += `
</body>
</html>
`;

    const win = window.open("", "_blank");
    if (!win) {
      alert("O navegador bloqueou a janela de impressão. Permite pop-ups para exportar o PDF.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  } catch (e) {
    console.error("Erro ao gerar PDF:", e);
    alert("Ocorreu um erro ao gerar o PDF do histórico.");
  }
}

function buildSugestao(lista, totalCarga, totalSeries, blocosForca, blocosHipertrofia, blocosLeve, dia) {
  // Caso de treino muito leve ou sem dados suficientes
  if (!lista || !lista.length || totalSeries === 0 || totalCarga === 0) {
    return "Treino muito leve hoje. Se queres progredir, planeia 2–3 blocos principais com alguma carga e um metcon simples.";
  }

  const partes = [];

  // Mensagem base, sempre curta
  partes.push(`Bom trabalho hoje – treino registado em ${dia}.`);

  // Comentário rápido ao tipo de estímulo
  if (blocosForca > 0 && blocosHipertrofia > 0) {
    partes.push("Sessão equilibrada entre força e volume. Mantém esta combinação.");
  } else if (blocosForca > 0) {
    partes.push("Dia focado em força. Garante boa técnica nas séries pesadas.");
  } else if (blocosHipertrofia > 0) {
    partes.push("Boa dose de volume. Controla a fadiga para manter a qualidade das repetições.");
  } else if (blocosLeve > 0) {
    partes.push("Sessão mais leve. Pode ser útil para recuperação ativa.");
  }

  // Ajuste extra com base no objetivo definido no perfil
  const objetivo = profile && profile.objetivo ? profile.objetivo : "";

  switch (objetivo) {
    case "condicionamento":
      partes.push("Para melhorar o condicionamento, aposta em metcons de 10–20 minutos com ritmo estável e poucas paragens.");
      break;
    case "forca_absoluta":
      partes.push("Para ganhar força absoluta, mantém 2–3 blocos semanais de 3–5 repetições pesadas nos básicos.");
      break;
    case "potencia":
      partes.push("Para desenvolver potência, usa cargas médias com movimentos explosivos e séries curtas bem rápidas.");
      break;
    case "resistencia_muscular":
      partes.push("Para resistência muscular, trabalha séries longas e metcons com muitas repetições, sem deixar cair a técnica.");
      break;
    case "recomposicao":
      partes.push("Para recomposição corporal, combina força com metcons moderados e foca-te na consistência semanal.");
      break;
    case "massa_funcional":
      partes.push("Para ganhar massa funcional, usa cargas médias, 6–12 repetições e pausas controladas entre séries.");
      break;
    case "longevidade":
      partes.push("Para longevidade, equilibra dias de carga com sessões mais leves e mobilidade regular.");
      break;
    case "competicao":
      partes.push("Se o foco é competição, presta atenção ao pacing, transições e à qualidade dos movimentos RX.");
      break;
    default:
      // Sem objetivo definido – deixar só a mensagem base + comentário do estímulo
      break;
  }

  // Junta tudo numa “SMS” curta
  return partes.join(" ");
  }
  
function getMonday(dateStr) {
  // dateStr no formato "YYYY-MM-DD"
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return null;

  const day = d.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const diff = (day === 0 ? -6 : 1) - day; // ajusta para segunda-feira

  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;

}
function renderWeeklyHistory() {
  // Ajuste: o ecrã WOD foca-se no registo do dia; histórico semanal fica oculto.
  if (weeklyHistoryEl) {
    weeklyHistoryEl.style.display = "none";
    weeklyHistoryEl.textContent = "";
  }
  return;

if (!treinos.length) {
    weeklyHistoryEl.textContent = "Ainda não há histórico semanal registado.";
    return;
  }

  const semanas = {};
  treinos.forEach(t => {
    if (!t.date) return;
    const mon = getMonday(t.date);
    if (!mon) return;
    const key = mon.toISOString().slice(0,10);
    if (!semanas[key]) semanas[key] = { carga: 0, dist: 0 };
    semanas[key].carga += t.carga || 0;
    if (t.distanciaKm) semanas[key].dist += t.distanciaKm;
  });

  const keys = Object.keys(semanas).sort((a, b) => b.localeCompare(a));

  if (!keys.length) {
    weeklyHistoryEl.textContent = "Ainda não há histórico semanal registado.";
    return;
  }

  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return dd + "/" + mm;
  };

  const lines = keys.slice(0, 4).map(k => {
    const mon = new Date(k);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const txtCarga = formatKg(semanas[k].carga);
    const txtDist = semanas[k].dist > 0 ? " · " + formatKm(semanas[k].dist) : "";
    return fmt(mon) + " – " + fmt(sun) + ": " + txtCarga + txtDist;
  });

  weeklyHistoryEl.innerHTML =
    "Histórico das últimas semanas (carga total e distância):<br>" +
    lines.join("<br>");
}

/* ===== CÁLCULO RÁPIDO NO WOD: % 1RM ↔ PESO ===== */

function updateWodPesoFromPercent() {
  if (!treinoPercentEl || !treinoExEl || !treinoPesoEl) return;

  const ex = treinoExEl.value;
  const perc = parseFloat(treinoPercentEl.value || "0");

  // limpar mensagem
  if (treinoPercentInfoEl) treinoPercentInfoEl.textContent = "";

  // sem exercício, sem 1RM ou sem percentagem válida
  if (!ex || !dataRm[ex] || !perc || perc <= 0) {
    if (!ex || !dataRm[ex]) {
      if (treinoPercentInfoEl && ex) {
        treinoPercentInfoEl.textContent =
          "Para usar a percentagem neste exercício, regista primeiro o 1RM na aba 1RM.";
      }
    }
    return;
  }

  const base = dataRm[ex];      // 1RM
  const peso = base * (perc / 100);

  // preenche diretamente o peso do WOD
  treinoPesoEl.value = peso.toFixed(1);

  if (treinoPercentInfoEl) {
    treinoPercentInfoEl.textContent =
      `Sugestão: ${peso.toFixed(1).replace(".", ",")} kg (${perc.toFixed(0)}% do teu 1RM nesse exercício).`;
  }
}

function updateWodPercentFromPeso() {
  if (!treinoPesoEl || !treinoExEl) return;

  const ex = treinoExEl.value;
  const peso = parseFloat(treinoPesoEl.value || "0");

  if (treinoPercentInfoEl) treinoPercentInfoEl.textContent = "";

  // sem exercício, sem 1RM ou sem peso válido
  if (!ex || !dataRm[ex] || !peso || peso <= 0) {
    if (treinoPercentEl) treinoPercentEl.value = "";
    return;
  }

  const base = dataRm[ex];     // 1RM
  const perc = (peso / base) * 100;

  // atualiza sempre o campo da percentagem
  if (treinoPercentEl) {
    treinoPercentEl.value = perc.toFixed(0);
  }

  if (treinoPercentInfoEl) {
    treinoPercentInfoEl.textContent =
      `Este peso corresponde a cerca de ${perc.toFixed(0)}% do teu 1RM nesse exercício.`;
  }
}

/* Ligações de eventos no WOD */
if (treinoPercentEl) {
  treinoPercentEl.addEventListener("input", updateWodPesoFromPercent);
}

if (treinoPesoEl) {
  treinoPesoEl.addEventListener("input", updateWodPercentFromPeso);
}

if (treinoExEl) {
  treinoExEl.addEventListener("change", () => {
    // quando mudas de exercício, recalcula tudo
    updateWodPesoFromPercent();
    updateWodPercentFromPeso();
  });
}
/* ===== Resultado global do WOD (RX / adaptado / incompleto) ===== */

function saveWodResultados() {
  try {
    localStorage.setItem(STORAGE_WOD_RESULT, JSON.stringify(wodResultados));
  } catch (e) {
    console.error("Erro ao guardar resultado do WOD:", e);
  }
}

function updateResultadoUIForDate(dateStr) {
  if (!treinoResultadoEl) return;
  const d = dateStr || (treinoDataEl && treinoDataEl.value) || "";
  const val = wodResultados[d] || "";
  treinoResultadoEl.value = val;
}

/* ===== FOTO DO QUADRO → OCR → TEXTO ===== */

async function handleWodPhotoFile(file) {
  if (!file || !OCR_ENDPOINT) return;

  if (wodPhotoStatusEl) {
    wodPhotoStatusEl.textContent = "A processar a foto do quadro, aguarda um momento...";
  }

  try {
    const formData = new FormData();
    formData.append("image", file);

    const resp = await fetch(OCR_ENDPOINT, {
      method: "POST",
      body: formData
    });

    if (!resp.ok) {
      throw new Error("Resposta inválida do servidor de OCR.");
    }

    const data = await resp.json();
    const rawText = data && data.text ? String(data.text) : "";

    if (!rawText.trim()) {
      if (wodPhotoStatusEl) {
        wodPhotoStatusEl.textContent =
          "Não foi possível ler texto útil do quadro. Tenta outra foto com melhor luz e contraste.";
      }
      return;
    }

    if (wodOcrPreviewEl) {
      wodOcrPreviewEl.value = rawText.trim();
    }
    if (wodPhotoStatusEl) {
      wodPhotoStatusEl.textContent =
        "Texto do quadro reconhecido. Revê e corrige aqui em baixo antes de converter em registos no WOD.";
    }
  } catch (err) {
    console.error("Erro no OCR do quadro:", err);
    if (wodPhotoStatusEl) {
      wodPhotoStatusEl.textContent =
        "Ocorreu um erro ao enviar a foto para o servidor de OCR. Verifica a ligação à internet e tenta de novo.";
    }
  }
}

/* ===== Parser do texto do quadro → entradas de WOD ===== */

function buildTreinoFromLine(line, date, parteAtual) {
  if (!line) return null;
  const texto = String(line).trim();
  if (!texto) return null;

  const lower = texto.toLowerCase();

  // 1) tentar encontrar exercício pelo nome em EN
  let ex = null;

  if (typeof ALL_EXERCISES !== "undefined" && Array.isArray(ALL_EXERCISES)) {
    for (const nome of ALL_EXERCISES) {
      if (lower.includes(nome.toLowerCase())) {
        ex = nome;
        break;
      }
    }
  }

  // 2) se não encontrar em EN, tenta pela designação PT do EXER_INFO
  if (!ex && typeof EXER_INFO !== "undefined" && Array.isArray(EXER_INFO)) {
    for (const info of EXER_INFO) {
      if (lower.includes(info.pt.toLowerCase())) {
        ex = info.en;
        break;
      }
    }
  }

  if (!ex) {
    return null;
  }

  // séries / reps (5x5, 4 x 10, etc.)
  let rondas = 1;
  let reps = 0;

  const mSeries = texto.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (mSeries) {
    rondas = parseInt(mSeries[1], 10) || 1;
    reps = parseInt(mSeries[2], 10) || 0;
  } else {
    const mReps = texto.match(/(\d+)\s*(reps|repetições|repeticoes|rep)/i);
    if (mReps) {
      reps = parseInt(mReps[1], 10) || 0;
    }
  }

  // percentagem do 1RM ou peso direto
  let peso = 0;
  let perc1rm = null;

  const mPerc = texto.match(/(\d{1,3})\s*%/);
  if (mPerc && dataRm[ex]) {
    const p = parseFloat(mPerc[1]);
    if (!isNaN(p) && p > 0) {
      perc1rm = p / 100;
      peso = dataRm[ex] * perc1rm;
    }
  } else {
    const mPeso = texto.match(/(\d+(?:[\.,]\d+)?)\s*(kg|kgs|quilo|quilos)\b/i);
    if (mPeso) {
      const val = parseFloat(mPeso[1].replace(",", "."));
      if (!isNaN(val)) {
        peso = val;
        if (dataRm[ex] && dataRm[ex] > 0) {
          perc1rm = peso / dataRm[ex];
        }
      }
    }
  }

  // formato (AMRAP, EMOM, For Time...)
  let formato = "";
  const mFormato = texto.match(/\b(AMRAP|EMOM|For Time|Chipper|For\s+time)\b/i);
  if (mFormato) {
    formato = mFormato[1]
      .replace(/\s+/g, " ")
      .replace(/^for time$/i, "For Time");
  }

  // distância
  let distanciaKm = 0;
  const mDist = texto.match(/(\d+(?:[\.,]\d+)?)\s*(km|kilometros|quilometros|m)\b/i);
  if (mDist) {
    const val = parseFloat(mDist[1].replace(",", "."));
    if (!isNaN(val)) {
      const unidade = mDist[2].toLowerCase();
      distanciaKm = unidade === "m" ? val / 1000 : val;
    }
  }

  const tipo = inferTipo(ex);
  const carga = calcCarga({ peso, reps, rondas });

  return {
    date,
    parte: parteAtual || "",
    formato,
    ex,
    tipo,
    rondas,
    reps,
    peso,
    tempo: "",
    carga,
    perc1rm,
    distanciaKm
  };
}

function applyOcrToWod() {
  if (!wodOcrPreviewEl) return;
  const raw = (wodOcrPreviewEl.value || "").trim();
  if (!raw) {
    if (wodPhotoStatusEl) {
      wodPhotoStatusEl.textContent =
        "Não há texto do quadro para converter. Faz primeiro o OCR ou escreve/cola o texto.";
    }
    return;
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const date = (treinoDataEl && treinoDataEl.value) ? treinoDataEl.value : hoje;

  const linhas = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (!linhas.length) {
    if (wodPhotoStatusEl) {
      wodPhotoStatusEl.textContent = "O texto do quadro está vazio depois de limpar as linhas.";
    }
    return;
  }

  let parteAtual = "";
  let criados = 0;

  linhas.forEach(linha => {
    const mParte =
      linha.match(/^parte\s+([A-D])\b/i) ||
      linha.match(/^([A-D])[\)\.\:\-]\s*/i);

    if (mParte) {
      parteAtual = mParte[1].toUpperCase();
      return;
    }

    const entry = buildTreinoFromLine(linha, date, parteAtual);
    if (entry) {
      treinos.unshift(entry);
      criados++;
    }
  });

  if (!criados) {
    if (wodPhotoStatusEl) {
      wodPhotoStatusEl.textContent =
        "O texto do quadro foi lido, mas não foi possível identificar exercícios conhecidos. Ajusta o texto à mão e tenta de novo.";
    }
    return;
  }

  saveTreinos();
  registerBackupMeta("WOD criado a partir de foto do quadro");
  renderTreinos();

  if (wodPhotoStatusEl) {
    wodPhotoStatusEl.textContent =
      "Foram criados " + criados + " blocos no WOD a partir do quadro. Confere e ajusta manualmente se necessário.";
  }
}

function renderTreinos() {
  if (!treinoBody) return;
  treinoBody.innerHTML = "";

  const hoje = new Date().toISOString().slice(0,10);
  const dia = (treinoDataEl && treinoDataEl.value) ? treinoDataEl.value : hoje;
  const lista = treinos.filter(t => t.date === dia);
  updateResultadoUIForDate(dia);

  // Se não houver WOD nesse dia
  if (!lista.length) {
    if (treinoResumoEl) {
      treinoResumoEl.textContent = "Sem WOD registado para " + dia + ".";
    }
    if (treinoSugestaoEl) treinoSugestaoEl.textContent = "";

    // esconder chips
    if (treinoStatsRow) {
      treinoStatsRow.style.display = "none";
    }

    // esconder tabela do WOD do dia
    if (treinoScrollEl) {
      treinoScrollEl.style.display = "none";
    }

    renderWeeklyHistory();
    renderDailyHistory();
    renderPerformance();
    atualizarRankingsMensais();
    return;
  }

  // há WOD neste dia → garantir que a tabela está visível
  if (treinoScrollEl) {
    treinoScrollEl.style.display = "block";
  }

  let totalCarga = 0;
  let totalSeries = 0;
  let totalDistKm = 0;
  let blocosForca = 0;
  let blocosHipertrofia = 0;
  let blocosLeve = 0;

  // Para os chips
  let totalVolumeReps = 0;      // reps × rondas
  let melhorTempoSeg = null;    // melhor tempo do dia em segundos

  lista.forEach(e => {
    const tr = document.createElement("tr");

    // 1) Data
    const tdDate = document.createElement("td");
    tdDate.textContent = e.date || "";
    tr.appendChild(tdDate);

    // 2) Parte
    const tdParte = document.createElement("td");
    tdParte.textContent = e.parte || "";
    tr.appendChild(tdParte);

    // 3) Formato
    const tdFormato = document.createElement("td");
    tdFormato.textContent = e.formato || "";
    tr.appendChild(tdFormato);

    // 4) Exercício (EN – PT)
    const tdEx = document.createElement("td");
    const label = MOVES_PT[e.ex] ? `${e.ex} – ${MOVES_PT[e.ex]}` : e.ex;
    tdEx.textContent = label || "";
    tr.appendChild(tdEx);

    // 5) Tipo (força / técnica / metcon)
    const tdTipo = document.createElement("td");
    tdTipo.textContent = e.tipo || "";
    tr.appendChild(tdTipo);

    // 6) Rondas
    const tdR = document.createElement("td");
    tdR.textContent = e.rondas || "";
    tr.appendChild(tdR);

    // 7) Reps
    const tdReps = document.createElement("td");
    tdReps.textContent = e.reps || "";
    tr.appendChild(tdReps);

    // 8) Peso
    const tdPeso = document.createElement("td");
    tdPeso.textContent = e.peso ? formatKg(e.peso) : "";
    tr.appendChild(tdPeso);

    // 9) % 1RM
    const tdPerc = document.createElement("td");
    if (e.perc1rm) {
      tdPerc.textContent = (e.perc1rm * 100).toFixed(0) + "%";
    } else {
      tdPerc.textContent = "";
    }
    tr.appendChild(tdPerc);

    // 10) Tempo
    const tdTempo = document.createElement("td");
    tdTempo.textContent = e.tempo || "";
    tr.appendChild(tdTempo);

    // 11) Distância
    const tdDist = document.createElement("td");
    tdDist.textContent = e.distanciaKm ? formatKm(e.distanciaKm) : "";
    tr.appendChild(tdDist);

    // 12) Carga
    const tdCarga = document.createElement("td");
    tdCarga.textContent = e.carga ? formatKg(e.carga) : "";
    tr.appendChild(tdCarga);

    // 13) Botão apagar
    const tdDel = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "🗑";
    btn.className = "btn-delete";
    btn.addEventListener("click", () => deleteTreinoEntry(treinos.indexOf(e)));
    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    treinoBody.appendChild(tr);

    // Acumuladores
    totalCarga += e.carga || 0;
    totalSeries += (e.rondas || 0);
    totalDistKm += e.distanciaKm || 0;

    if (e.perc1rm && e.reps) {
      const p = e.perc1rm;
      const r = e.reps;
      if (p >= 0.8 && r <= 5) {
        blocosForca++;
      } else if (p >= 0.65 && p <= 0.8 && r >= 6 && r <= 12) {
        blocosHipertrofia++;
      } else if (p < 0.6 || r >= 15) {
        blocosLeve++;
      }
    }

    totalVolumeReps += (e.reps || 0) * (e.rondas || 0);

    if (e.tipo === "metcon" && e.tempo) {
      const sec = parseTimeToSeconds(e.tempo);
      if (sec != null && (melhorTempoSeg == null || sec < melhorTempoSeg)) {
        melhorTempoSeg = sec;
      }
    }
  });

  // Resumo em texto
  if (treinoResumoEl) {
    let resumo =
      "Resumo do dia " + dia + ": carga total do WOD = " + formatKg(totalCarga);
    if (totalDistKm > 0) {
      resumo += " · distância total = " + formatKm(totalDistKm);
    }
    treinoResumoEl.textContent = resumo;
  }

  const sugestao = buildSugestao(
    lista,
    totalCarga,
    totalSeries,
    blocosForca,
    blocosHipertrofia,
    blocosLeve,
    dia
  );
  if (treinoSugestaoEl) treinoSugestaoEl.textContent = sugestao;

  // Atualizar os chips
  if (treinoStatsRow) {
    treinoStatsRow.style.display = "flex";

    if (statCargaEl) {
      statCargaEl.textContent = formatKg(totalCarga);
    }

    if (statExerciciosEl) {
      statExerciciosEl.textContent = String(lista.length);
    }

    if (statTempoEl && statTempoChipEl) {
      if (melhorTempoSeg != null) {
        statTempoEl.textContent = formatSecondsToTime(melhorTempoSeg);
        statTempoChipEl.style.display = "flex";
      } else {
        statTempoChipEl.style.display = "none";
      }
    }

    if (statVolumeEl) {
      statVolumeEl.textContent = `${totalVolumeReps} reps`;
    }
  }

  renderWeeklyHistory();
  renderDailyHistory();
  renderPerformance();
  atualizarRankingsMensais();
}

if (treinoAddBtn) {
  treinoAddBtn.addEventListener("click", addTreinoEntry);
}

if (treinoDataEl) {
  treinoDataEl.addEventListener("change", () => {
    renderTreinos();
    updateResultadoUIForDate(treinoDataEl.value);
  });
}

/* Resultado global do WOD (RX / adaptado / incompleto) */
if (treinoResultadoEl) {
  treinoResultadoEl.addEventListener("change", () => {
    const dia = (treinoDataEl && treinoDataEl.value) ||
                new Date().toISOString().slice(0, 10);
    const val = treinoResultadoEl.value || "";
    if (val) {
      wodResultados[dia] = val;
    } else {
      delete wodResultados[dia];
    }
    saveWodResultados();
    registerBackupMeta("Resultado do WOD atualizado");
  });
}

/* Foto do quadro → OCR */
if (wodPhotoBtn && wodPhotoInput) {
  wodPhotoBtn.addEventListener("click", () => {
    wodPhotoInput.value = "";
    wodPhotoInput.click();
  });

  wodPhotoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    handleWodPhotoFile(file);
  });
}

if (wodOcrApplyBtn) {
  wodOcrApplyBtn.addEventListener("click", applyOcrToWod);
}

if (printHistoryBtn) {
  printHistoryBtn.addEventListener("click", exportHistoricoPdf);
}

/* ===== BACKUP ===== */
function formatDateTime(dt) {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function registerBackupMeta(evento) {
  try {
    const meta = JSON.parse(localStorage.getItem(STORAGE_BACKUP_META) || "{}");
    meta.lastChange = new Date().toISOString();
    meta.lastEvent = evento || "";
    localStorage.setItem(STORAGE_BACKUP_META, JSON.stringify(meta));
    updateBackupInfo();
  } catch (e) {}
}

function updateBackupInfo() {
  if (!backupInfoEl) return;
  const meta = JSON.parse(localStorage.getItem(STORAGE_BACKUP_META) || "{}");
  const lastBackup = meta.lastBackup ? formatDateTime(meta.lastBackup) : "nunca";
  const lastChange = meta.lastChange ? formatDateTime(meta.lastChange) : "sem registo";
  backupInfoEl.innerHTML =
    `<div class="helper-text">
       Último backup exportado: <strong>${lastBackup}</strong><br>
       Última alteração de dados: <strong>${lastChange}</strong>
     </div>`;
}

function buildBackupObject() {
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    profile: profile || {},
    dataRm: dataRm || {},
    rmHistory: rmHistory || {},
    treinos: treinos || [],
    reservas: reservas || [],
    presencas: presencas || [],
    rankingsMensais: rankingsMensais || []
  };
}

function downloadJson(obj, filename) {
  const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
  const a = document.createElement("a");
  a.setAttribute("href", dataStr);
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

if (exportBackupBtn) {
  exportBackupBtn.addEventListener("click", () => {
    const backup = buildBackupObject();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `crossfit_backup_${yyyy}${mm}${dd}.json`;
    downloadJson(backup, filename);

    try {
      const meta = JSON.parse(localStorage.getItem(STORAGE_BACKUP_META) || "{}");
      meta.lastBackup = new Date().toISOString();
      localStorage.setItem(STORAGE_BACKUP_META, JSON.stringify(meta));
    } catch (e) {}
    updateBackupInfo();
    alert("Backup exportado. Podes agora guardar o ficheiro em Google Drive, iCloud, Ficheiros, etc.");
  });
}

if (importBackupBtn && backupFileInput) {
  importBackupBtn.addEventListener("click", () => {
    backupFileInput.value = "";
    backupFileInput.click();
  });

  backupFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const content = evt.target.result;
        const data = JSON.parse(content);

        if (!data || typeof data !== "object") {
          alert("Ficheiro inválido.");
          return;
        }

        if (!("dataRm" in data) && !("treinos" in data)) {
          alert("Este ficheiro não parece ser um backup válido da app.");
          return;
        }

        profile = data.profile || {};
        dataRm = data.dataRm || {};
        rmHistory = data.rmHistory || {};
        treinos = data.treinos || [];
        reservas = data.reservas || [];
        presencas = data.presencas || [];
        rankingsMensais = data.rankingsMensais || [];

        localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
        localStorage.setItem(STORAGE_RM, JSON.stringify(dataRm));
        localStorage.setItem(STORAGE_RM_HISTORY, JSON.stringify(rmHistory));
        localStorage.setItem(STORAGE_TREINO, JSON.stringify(treinos));
        localStorage.setItem(STORAGE_RESERVAS, JSON.stringify(reservas));
        localStorage.setItem(STORAGE_PRESENCAS, JSON.stringify(presencas));
        localStorage.setItem(STORAGE_RANKINGS, JSON.stringify(rankingsMensais));

        registerBackupMeta("Backup importado");

        loadProfile();
        renderRm();
        refreshCalcExOptions();
        refreshGraphExerciseOptions();
        renderTreinos();
        renderReservas();

        alert("Backup importado com sucesso.");
      } catch (err) {
        console.error(err);
        alert("Erro ao ler o ficheiro de backup.");
      }
    };
    reader.readAsText(file);
  });
}

/* GUIA EXERCÍCIOS – EN + PT na mesma coluna, mais limpo para telemóvel */
function renderGuiaExercicios() {
  if (!guiaBody) return;
  guiaBody.innerHTML = "";

  const filtro = (guiaSearch?.value || "").toLowerCase().trim();

  EXER_INFO.forEach(ex => {
    const texto = (ex.en + " " + ex.pt + " " + ex.descricao).toLowerCase();
    if (filtro && !texto.includes(filtro)) return;

    const tr = document.createElement("tr");

    // Coluna 1 → EN + PT em duas linhas
    const tdNome = document.createElement("td");
    tdNome.innerHTML = `<strong>${ex.en}</strong><br><span>${ex.pt}</span>`;
    tr.appendChild(tdNome);

    // Coluna 2 → descrição
    const tdDesc = document.createElement("td");
    tdDesc.textContent = ex.descricao;
    tr.appendChild(tdDesc);

    guiaBody.appendChild(tr);
  });
}

if (guiaSearch) {
  guiaSearch.addEventListener("input", renderGuiaExercicios);
}

/* ===== PERFORMANCE (WOD / 1RM / METCON) ===== */
function parseTimeToSeconds(str) {
  if (!str) return null;
  const clean = String(str).trim().toLowerCase();
  if (!clean) return null;

  // 1) hh:mm:ss ou mm:ss em qualquer parte do texto
  const colonMatch = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (colonMatch) {
    const hasHours = !!colonMatch[3];
    const h = hasHours ? parseInt(colonMatch[1], 10) : 0;
    const m = hasHours ? parseInt(colonMatch[2], 10) : parseInt(colonMatch[1], 10);
    const s = hasHours ? parseInt(colonMatch[3], 10) : parseInt(colonMatch[2], 10);

    if ([h, m, s].some(n => isNaN(n))) return null;
    if (m < 0 || m >= 60 || s < 0 || s >= 60) return null;

    return h * 3600 + m * 60 + s;
  }

  // 2) Só número → minutos (ex.: "20" = 20 minutos)
  if (/^\d+(\.\d+)?$/.test(clean)) {
    const val = parseFloat(clean);
    return isNaN(val) ? null : Math.round(val * 60);
  }

  // 3) Formatos tipo “20'”, “20 min”, “2h”
  const unitMatch = clean.match(/(\d+)\s*(h|hr|hrs|hora|horas|m|min|mins|minuto|minutos|')/);
  if (unitMatch) {
    const valor = parseInt(unitMatch[1], 10);
    const unidade = unitMatch[2];

    if (["h", "hr", "hrs", "hora", "horas"].includes(unidade)) return valor * 3600;
    return valor * 60;
  }

  return null;
}

function formatSecondsToTime(totalSeconds) {
  if (totalSeconds == null || isNaN(totalSeconds)) return "";
  const t = Math.round(totalSeconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

function renderPerformance() {
  /* WOD – dias com mais carga */
  if (perfWodBody) {
    perfWodBody.innerHTML = "";
    if (!treinos.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "Ainda não existem WOD registados.";
      tr.appendChild(td);
      perfWodBody.appendChild(tr);
    } else {
      const map = {};
      treinos.forEach(t => {
        if (!t.date) return;
        if (!map[t.date]) {
          map[t.date] = {
            cargaTotal: 0,
            distTotalKm: 0,
            numEx: 0,
            melhorTempoMetconSeg: null
          };
        }
        map[t.date].cargaTotal += t.carga || 0;
        map[t.date].distTotalKm += t.distanciaKm || 0;
        map[t.date].numEx += 1;

        if (t.tipo === "metcon" && t.tempo) {
          const sec = parseTimeToSeconds(t.tempo);
          if (sec != null) {
            if (map[t.date].melhorTempoMetconSeg == null || sec < map[t.date].melhorTempoMetconSeg) {
              map[t.date].melhorTempoMetconSeg = sec;
            }
          }
        }
      });

      const rows = Object.keys(map).map(date => ({
        date,
        cargaTotal: map[date].cargaTotal,
        distTotalKm: map[date].distTotalKm,
        numEx: map[date].numEx,
        melhorTempoMetconSeg: map[date].melhorTempoMetconSeg
      }));

      rows.sort((a, b) => (b.cargaTotal || 0) - (a.cargaTotal || 0));

      rows.slice(0, 10).forEach(r => {
        const tr = document.createElement("tr");

        const tdData = document.createElement("td");
        tdData.textContent = r.date;
        tr.appendChild(tdData);

        const tdCarga = document.createElement("td");
        tdCarga.textContent = formatKg(r.cargaTotal);
        tr.appendChild(tdCarga);

        const tdDist = document.createElement("td");
        tdDist.textContent = r.distTotalKm ? formatKm(r.distTotalKm) : "-";
        tr.appendChild(tdDist);

        const tdNum = document.createElement("td");
        tdNum.textContent = r.numEx.toString();
        tr.appendChild(tdNum);

        const tdTempo = document.createElement("td");
        tdTempo.textContent = r.melhorTempoMetconSeg != null
          ? formatSecondsToTime(r.melhorTempoMetconSeg)
          : "-";
        tr.appendChild(tdTempo);

        perfWodBody.appendChild(tr);
      });

      if (!perfWodBody.hasChildNodes()) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "Sem dados suficientes para gerar ranking.";
        tr.appendChild(td);
        perfWodBody.appendChild(tr);
      }
    }
  }

  /* Top 1RM */
  if (perf1rmBody) {
    perf1rmBody.innerHTML = "";
    const nomes = Object.keys(dataRm || {});
    if (!nomes.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = "Ainda não registaste nenhum 1RM.";
      tr.appendChild(td);
      perf1rmBody.appendChild(tr);
    } else {
      const pesoCorporal = profile && profile.peso ? profile.peso : null;
      const rows = nomes.map(name => ({
        name,
        value: dataRm[name]
      })).sort((a, b) => (b.value || 0) - (a.value || 0));

      rows.slice(0, 10).forEach(r => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        const label = MOVES_PT[r.name] ? `${r.name} – ${MOVES_PT[r.name]}` : r.name;
        tdName.textContent = label;
        tr.appendChild(tdName);

        const tdVal = document.createElement("td");
        tdVal.textContent = formatKg(r.value);
        tr.appendChild(tdVal);

        const tdRel = document.createElement("td");
        if (pesoCorporal) {
          const rel = r.value / pesoCorporal;
          tdRel.textContent = rel.toFixed(2) + "x";
        } else {
          tdRel.textContent = "-";
        }
        tr.appendChild(tdRel);

        perf1rmBody.appendChild(tr);
      });
    }
  }

  /* Metcon – melhores tempos (tipo = 'metcon') */
  if (perfMetconBody) {
    perfMetconBody.innerHTML = "";
    const metconMap = {};

    treinos.forEach(t => {
      if (t.tipo !== "metcon" || !t.tempo) return;
      const sec = parseTimeToSeconds(t.tempo);
      if (sec == null) return;
      const key = t.ex || "Metcon";
      const existing = metconMap[key];
      if (!existing || sec < existing.tempoSeg) {
        metconMap[key] = {
          exercicio: key,
          tempoSeg: sec,
          tempoStr: t.tempo,
          date: t.date || "",
          carga: t.carga || 0,
          distanciaKm: t.distanciaKm || 0
        };
      }
    });

    const rows = Object.keys(metconMap).map(k => metconMap[k]).sort((a, b) => a.tempoSeg - b.tempoSeg);

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "Ainda não registaste metcons com tempo em formato mm:ss.";
      tr.appendChild(td);
      perfMetconBody.appendChild(tr);
    } else {
      rows.slice(0, 10).forEach(r => {
        const tr = document.createElement("tr");

        const tdEx = document.createElement("td");
        const label = MOVES_PT[r.exercicio] ? `${r.exercicio} – ${MOVES_PT[r.exercicio]}` : r.exercicio;
        tdEx.textContent = label;
        tr.appendChild(tdEx);

        const tdTempo = document.createElement("td");
        tdTempo.textContent = r.tempoStr;
        tr.appendChild(tdTempo);

        const tdData = document.createElement("td");
        tdData.textContent = r.date;
        tr.appendChild(tdData);

        const tdCarga = document.createElement("td");
        let cargaLabel = "-";
        if (r.distanciaKm && r.distanciaKm > 0) {
          cargaLabel = formatKm(r.distanciaKm);
        } else if (r.carga && r.carga > 0) {
          cargaLabel = formatKg(r.carga);
        }
        tdCarga.textContent = cargaLabel;
        tr.appendChild(tdCarga);

        perfMetconBody.appendChild(tr);
      });
    }
  }
}

/* ===== RESERVAS & PRESENÇAS (ALUNO) ===== */

/* Garantir que as estruturas são sempre arrays válidas */
if (!Array.isArray(reservas)) reservas = [];
if (!Array.isArray(presencas)) presencas = [];
if (!Array.isArray(rankingsMensais)) rankingsMensais = [];

function saveReservas() {
  try {
    localStorage.setItem(STORAGE_RESERVAS, JSON.stringify(reservas));
  } catch (e) {
    console.error("Erro ao guardar reservas:", e);
    alert("Não foi possível guardar a reserva (erro de armazenamento do navegador).");
  }
}

function savePresencas() {
  try {
    localStorage.setItem(STORAGE_PRESENCAS, JSON.stringify(presencas));
  } catch (e) {
    console.error("Erro ao guardar presenças:", e);
  }
}

function saveRankings() {
  try {
    localStorage.setItem(STORAGE_RANKINGS, JSON.stringify(rankingsMensais));
  } catch (e) {
    console.error("Erro ao guardar rankings mensais:", e);
  }
}

function gerarIdReserva() {
  return "res_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function marcarPresenca(reservaId) {
  const existe = presencas.some(p => p.reservaId === reservaId);
  if (existe) return;
  const now = new Date();
  presencas.push({
    reservaId,
    data: now.toISOString().slice(0, 10),
    hora: now.toTimeString().slice(0,5)
  });
  savePresencas();
  renderReservas();
  atualizarRankingsMensais();
}

function apagarReserva(id) {
  if (!confirm("Apagar esta reserva?")) return;
  reservas = reservas.filter(r => r.id !== id);
  presencas = presencas.filter(p => p.reservaId !== id);
  saveReservas();
  savePresencas();
  renderReservas();
  atualizarRankingsMensais();
}

function adicionarReserva() {
  try {
    const hojeISO = new Date().toISOString().slice(0,10);

    const data = (reservaDataEl && reservaDataEl.value) ? reservaDataEl.value : hojeISO;
    const hora = reservaHoraEl ? reservaHoraEl.value : "";
    const tipo = reservaTipoEl ? reservaTipoEl.value : "";
    const nota = reservaNotaEl ? reservaNotaEl.value.trim() : "";

    if (!data || !hora || !tipo) {
      alert("Preenche pelo menos data, hora e tipo de aula.");
      return;
    }

    const novaReserva = {
      id: gerarIdReserva(),
      data,
      hora,
      tipo,
      nota,
      inscritos: profile && profile.nome ? [profile.nome] : []
    };

    if (!Array.isArray(reservas)) reservas = [];
    reservas.unshift(novaReserva);

    saveReservas();
    if (reservaNotaEl) reservaNotaEl.value = "";
    registerBackupMeta("Reserva registada");
    renderReservas();
    atualizarRankingsMensais();

    console.log("Reserva adicionada:", novaReserva);
  } catch (e) {
    console.error("Erro ao adicionar reserva:", e);
    alert("Ocorreu um erro ao guardar a reserva. Verifica a consola do navegador para mais detalhes.");
  }
}

function mesmoMesAno(dataISO, ano, mes) {
  const d = new Date(dataISO);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === ano && (d.getMonth() + 1) === mes;
}

function atualizarRankingsMensais() {
  if (!treinos || !treinos.length) {
    rankingsMensais = [];
    saveRankings();
    renderReservasResumo();
    return;
  }

  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const chave = `${ano}-${String(mes).padStart(2,"0")}`;

  let cargaTotal = 0;
  let distTotal = 0;
  let nTreinos = 0;

  treinos.forEach(t => {
    if (!t.date) return;
    if (!mesmoMesAno(t.date, ano, mes)) return;
    nTreinos++;
    cargaTotal += t.carga || 0;
    distTotal += t.distanciaKm || 0;
  });

  const outras = rankingsMensais.filter(r => r.mes !== chave);
  const atual = {
    mes: chave,
    ano,
    mesNumero: mes,
    nTreinos,
    cargaTotal,
    distTotal
  };

  rankingsMensais = [...outras, atual];
  saveRankings();
  renderReservasResumo();
}

function renderReservasResumo() {
  if (!reservasResumoEl) return;
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;

  const nReservasMes = reservas.filter(r => mesmoMesAno(r.data, ano, mes)).length;
  const nPresencasMes = presencas.filter(p => mesmoMesAno(p.data, ano, mes)).length;

  const chave = `${ano}-${String(mes).padStart(2,"0")}`;
  const rank = rankingsMensais.find(r => r.mes === chave);

  let texto = `Este mês: ${nReservasMes} reservas e ${nPresencasMes} presenças registadas.`;

  if (rank && rank.nTreinos > 0) {
    texto += ` Treinos registados em WOD: ${rank.nTreinos} · Carga total = ${formatKg(rank.cargaTotal)}.`;
    if (rank.distTotal > 0) {
      texto += ` Distância total = ${formatKm(rank.distTotal)}.`;
    }
  } else {
    texto += " Ainda não há dados suficientes de WOD para resumo mensal.";
  }

  reservasResumoEl.textContent = texto;
}

function renderReservas() {
  if (!reservasBody) return;
  reservasBody.innerHTML = "";

  if (!reservas || !reservas.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Sem reservas registadas.";
    tr.appendChild(td);
    reservasBody.appendChild(tr);
    renderReservasResumo();
    return;
  }

  reservas.forEach(r => {
    const tr = document.createElement("tr");

    const tdData = document.createElement("td");
    tdData.textContent = r.data || "";
    tr.appendChild(tdData);

    const tdHora = document.createElement("td");
    tdHora.textContent = r.hora || "";
    tr.appendChild(tdHora);

    const tdTipo = document.createElement("td");
    tdTipo.textContent = r.tipo || "";
    tr.appendChild(tdTipo);

    const tdNota = document.createElement("td");
    tdNota.textContent = r.nota || "";
    tr.appendChild(tdNota);

    const tdPres = document.createElement("td");
    const temPresenca = presencas.some(p => p.reservaId === r.id);
    if (temPresenca) {
      tdPres.textContent = "Presente ✅";
    } else {
      const btnPres = document.createElement("button");
      btnPres.className = "btn-secondary";
      btnPres.style.padding = "4px 8px";
      btnPres.style.fontSize = "0.7rem";
      btnPres.textContent = "Marcar presença";
      btnPres.addEventListener("click", () => marcarPresenca(r.id));
      tdPres.appendChild(btnPres);
    }
    tr.appendChild(tdPres);

    const tdDel = document.createElement("td");
    const btnDel = document.createElement("button");
    btnDel.className = "btn-delete";
    btnDel.textContent = "🗑";
    btnDel.addEventListener("click", () => apagarReserva(r.id));
    tdDel.appendChild(btnDel);
    tr.appendChild(tdDel);

    reservasBody.appendChild(tr);
  });

  renderReservasResumo();
}

/* LIGAR BOTÃO GUARDAR RESERVA */
if (reservaAddBtn) {
  reservaAddBtn.addEventListener("click", adicionarReserva);
}

/* ---------------------------------------------------
   TABS PRINCIPAIS (1RM / WOD & Tools) - versão segura
---------------------------------------------------- */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // remover active de todas as tabs
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.target;

    // esconder todas as sections principais
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));

    // ativar só se existir (evita página em branco)
    const sec = document.getElementById(target);
    if (sec && sec.classList.contains("section")) {
      sec.classList.add("active");
    }
  });
});


/* ---------------------------------------------------
   SUB-SECÇÕES (WOD, Objetivo, Gráficos, etc.)
---------------------------------------------------- */
document.querySelectorAll(".opt-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;

    // esconder todas as sub-secções
    document.querySelectorAll(".option-section").forEach(s => s.classList.remove("active"));

    // mostrar a secção pedida
    const sec = document.getElementById(target);
    if (sec && sec.classList.contains("option-section")) {
      sec.classList.add("active");
    }

    // atualizar conteúdos específicos de cada secção
    if (target === "opt-wod") {
      renderTreinos();
    }

    if (target === "opt-historico") {
      renderDailyHistory();
    }

    if (target === "opt-performance") {
      renderPerformance();
    }

    if (target === "opt-guia") {
      renderGuiaExercicios();
    }
  });
});


/* ---------------------------------------------------
   BOTÃO DE RESERVAS (caso exista)
---------------------------------------------------- */
if (reservasBtn && reservasSection) {
  reservasBtn.addEventListener("click", () => {
    const visivel = reservasSection.style.display === "block";
    reservasSection.style.display = visivel ? "none" : "block";
  });
}


/* ---------------------------------------------------
   ARRANQUE DA APP (sequência segura)
---------------------------------------------------- */

// impedir crashes se o localStorage tiver dados corrompidos (versão correta)
treinos = JSON.parse(localStorage.getItem(STORAGE_TREINO) || "[]");
if (!Array.isArray(treinos)) {
  treinos = [];
  localStorage.setItem(STORAGE_TREINO, JSON.stringify(treinos));
}

// iniciar selects e dados
initSelects();
loadProfile();
renderRm();

refreshCalcExOptions();
refreshGraphExerciseOptions();

// definir automaticamente a data do WOD se vazio
if (treinoDataEl && !treinoDataEl.value) {
  treinoDataEl.value = new Date().toISOString().slice(0, 10);
}

renderTreinos();          // mostra WOD do dia
updateBackupInfo();       // estado do backup
renderGuiaExercicios();   // guia
renderPerformance();      // desempenho
renderReservas();         // reservas
atualizarRankingsMensais();// rankings


/* ---------------------------------------------------
   SERVICE WORKER
---------------------------------------------------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js?v=6", { scope: "./" });
  });
}
function renderQuadroWodDia(dataSelecionada) {
  const card = document.getElementById("wodQuadroCard");
  const dataDiv = document.getElementById("wodQuadroData");
  const conteudo = document.getElementById("wodQuadroConteudo");
  if (!card || !dataDiv || !conteudo) return;

  const treinos = JSON.parse(localStorage.getItem("treinos")) || [];
  const doDia = treinos.filter(t => t.data === dataSelecionada);

  if (doDia.length === 0) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";
  conteudo.innerHTML = "";

  dataDiv.textContent = `WOD — ${new Date(dataSelecionada).toLocaleDateString("pt-PT")}`;

  const grupos = {};

  doDia.forEach(t => {
    if (!grupos[t.parte]) grupos[t.parte] = [];
    grupos[t.parte].push(t);
  });

  Object.keys(grupos).sort().forEach(parte => {
    const bloco = document.createElement("div");
    bloco.style.marginBottom = "10px";

    const titulo = document.createElement("strong");
    titulo.textContent = `${parte})`;
    bloco.appendChild(titulo);

    grupos[parte].forEach(item => {
      const linha = document.createElement("div");
      linha.textContent =
        `• ${item.formato || ""} ${item.rondas ? item.rondas + "×" : ""}${item.reps || ""} ` +
        `${item.exercicio}${item.peso ? " @ " + item.peso + " kg" : ""}`;

      linha.style.padding = "4px 6px";
      linha.style.borderRadius = "6px";
      linha.style.marginTop = "4px";

      // long press
      let pressTimer;
      linha.addEventListener("touchstart", () => {
        pressTimer = setTimeout(() => abrirEdicaoWod(item.id), 2000);
      });
      linha.addEventListener("touchend", () => clearTimeout(pressTimer));

      bloco.appendChild(linha);
    });

    conteudo.appendChild(bloco);
  });
}
function abrirEdicaoWod(id) {
  const treinos = JSON.parse(localStorage.getItem("treinos")) || [];
  const treino = treinos.find(t => t.id === id);
  if (!treino) return;

  if (confirm("Queres apagar este registo?\nOK = apagar\nCancelar = editar")) {
    const novos = treinos.filter(t => t.id !== id);
    localStorage.setItem("treinos", JSON.stringify(novos));
  } else {
    document.getElementById("treinoParte").value = treino.parte;
    document.getElementById("treinoFormato").value = treino.formato;
    document.getElementById("treinoRondas").value = treino.rondas;
    document.getElementById("treinoReps").value = treino.reps;
    document.getElementById("treinoPeso").value = treino.peso;
  }

  renderQuadroWodDia(treino.data);
          }

// Re-desenhar o gráfico quando o utilizador abre a secção (canvas pode estar escondido antes)
document.addEventListener("click", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest(".opt-btn") : null;
  if (!btn) return;
  const tgt = btn.getAttribute("data-target") || "";
  if (tgt === "opt-graficos" || tgt === "opt-performance") {
    setTimeout(() => { try { updateRmChart(); } catch(_) {} }, 60);
  }
});

