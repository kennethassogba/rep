import { rpm, secondaryT, steamEnergy, type State } from './physics';
export type EquipmentId =
  | 'reactor'
  | 'pressurizer'
  | 'primary'
  | 'steam'
  | 'turbine'
  | 'generator'
  | 'condenser'
  | 'feed'
  | 'cooling';
export const equipment: Record<
  EquipmentId,
  {
    name: string;
    short: string;
    circuit: string;
    role: string;
    inside: string;
    connections: [EquipmentId, string][];
  }
> = {
  reactor: {
    name: 'Cuve du réacteur',
    short: 'Réacteur',
    circuit: '01 · Circuit primaire',
    role: 'La fission libère de la chaleur dans le combustible. L’eau qui traverse le cœur l’emporte vers le générateur de vapeur.',
    inside:
      'Les crayons orangés représentent le combustible. Les tiges sombres représentent les barres absorbantes : leur retrait accompagne ici une consigne de chaleur, sans calcul neutronique.',
    connections: [
      ['primary', 'Reçoit l’eau refroidie'],
      ['steam', 'Envoie l’eau chaude'],
      ['pressurizer', 'Partage la pression du circuit'],
    ],
  },
  pressurizer: {
    name: 'Pressuriseur',
    short: 'Pressuriseur',
    circuit: '01 · Circuit primaire',
    role: 'Un volume d’eau et de vapeur maintient le primaire sous pression. Dans la cuve, l’eau reste liquide malgré sa température élevée.',
    inside:
      'La poche supérieure représente la vapeur du pressuriseur. La pression primaire est imposée à 155 bar dans ce modèle ; le chauffage et l’aspersion ne sont pas simulés.',
    connections: [['reactor', 'Raccordé à la branche chaude']],
  },
  primary: {
    name: 'Pompe primaire',
    short: 'Pompe primaire',
    circuit: '01 · Circuit primaire',
    role: 'Elle fait circuler l’eau entre le cœur et les tubes du générateur de vapeur. Sans débit suffisant, la chaleur s’accumule dans le primaire.',
    inside:
      'La roue met l’eau en mouvement. L’animation suit le débit calculé, avec une courte inertie au démarrage.',
    connections: [
      ['steam', 'Aspire l’eau refroidie'],
      ['reactor', 'Refoule vers la cuve'],
    ],
  },
  steam: {
    name: 'Générateur de vapeur',
    short: 'Générateur de vapeur',
    circuit: '01 ↔ 02 · Échange de chaleur',
    role: 'L’eau primaire circule dans les tubes. De l’autre côté de leur paroi, l’eau secondaire chauffe puis se vaporise. Les deux eaux ne se mélangent pas.',
    inside:
      'Les tubes en U appartiennent au primaire. Le volume autour appartient au secondaire. L’ébullition est fixée à 275 °C, pour une pression secondaire d’environ 60 bar.',
    connections: [
      ['reactor', 'Reçoit la chaleur du primaire'],
      ['primary', 'Retour primaire refroidi'],
      ['turbine', 'Envoie la vapeur'],
      ['feed', 'Reçoit l’eau secondaire'],
    ],
  },
  turbine: {
    name: 'Turbine à vapeur',
    short: 'Turbine',
    circuit: '02 · Circuit secondaire',
    role: 'La vapeur se détend et cède une partie de son énergie à l’arbre. Le reste doit être évacué dans le condenseur.',
    inside:
      'Les disques représentent les étages d’aubes. Leur rotation suit l’énergie cinétique de l’arbre ; l’affichage ralentit cette rotation pour la rendre lisible.',
    connections: [
      ['steam', 'Reçoit la vapeur sous pression'],
      ['condenser', 'Évacue la vapeur détendue'],
      ['generator', 'Transmet le couple par l’arbre'],
    ],
  },
  generator: {
    name: 'Alternateur',
    short: 'Alternateur',
    circuit: 'Énergie mécanique → électrique',
    role: 'Le rotor entraîné par la turbine induit un courant dans le stator. Connecter une charge prélève de l’énergie sur l’arbre et peut le ralentir.',
    inside:
      'Le rotor et le stator sont séparés en vue éclatée. La charge est idéale et isolée : cette expérience ne simule ni réseau électrique ni synchronisation.',
    connections: [['turbine', 'Reçoit l’énergie mécanique']],
  },
  condenser: {
    name: 'Condenseur',
    short: 'Condenseur',
    circuit: '02 ↔ 03 · Échange de chaleur',
    role: 'La vapeur cède sa chaleur à des tubes froids et redevient liquide. L’eau du refroidissement reste séparée de l’eau secondaire.',
    inside:
      'Les tubes bleus appartiennent au refroidissement. Une température trop élevée réduit le rendement et bloque l’admission au-delà de 75 °C dans cette expérience.',
    connections: [
      ['turbine', 'Reçoit la vapeur détendue'],
      ['feed', 'Renvoie l’eau condensée'],
      ['cooling', 'Cède la chaleur au circuit froid'],
    ],
  },
  feed: {
    name: 'Pompe alimentaire',
    short: 'Pompe alimentaire',
    circuit: '02 · Circuit secondaire',
    role: 'Elle renvoie l’eau du condenseur vers le générateur de vapeur. Le cycle peut alors recommencer.',
    inside:
      'Le retour d’eau équilibre ici le débit de vapeur. Les niveaux d’eau, les réchauffeurs et le travail des pompes ne sont pas résolus.',
    connections: [
      ['condenser', 'Aspire l’eau condensée'],
      ['steam', 'Alimente le générateur de vapeur'],
    ],
  },
  cooling: {
    name: 'Refroidissement',
    short: 'Refroidissement',
    circuit: '03 · Circuit de refroidissement',
    role: 'Ce troisième circuit emporte la chaleur du condenseur vers une source froide. Sans lui, la centrale ne peut pas convertir durablement la chaleur en électricité.',
    inside:
      'L’échangeur ouvert représente une source froide idéale à 20 °C, pas une tour aéroréfrigérante détaillée. Cette eau ne traverse jamais le réacteur.',
    connections: [['condenser', 'Alimente et refroidit les tubes']],
  },
};
export const ids = Object.keys(equipment) as EquipmentId[];
export const lessons = [
  {
    title: 'Préparer le retour de l’eau',
    equipment: 'cooling',
    action: 'Démarrer les deux pompes',
    explain:
      'Pour réutiliser la vapeur, il faudra la refroidir puis renvoyer l’eau vers le générateur. Mettez d’abord le refroidissement et la pompe alimentaire en marche.',
    observe: 'Les circuits froid et secondaire sont prêts. Le réacteur ne chauffe pas encore.',
    ready: (s: State) => s.coolingFlow > 0.85 && s.feedFlow > 0.85,
  },
  {
    title: 'Faire circuler le primaire',
    equipment: 'primary',
    action: 'Démarrer la pompe primaire',
    explain:
      'L’eau primaire transporte la chaleur du cœur vers les tubes du générateur de vapeur. Son circuit est fermé et séparé des deux autres.',
    observe:
      'Le débit primaire s’établit. Faire circuler l’eau ne suffit pas à produire de l’électricité.',
    ready: (s: State) => s.primaryFlow > 0.85,
  },
  {
    title: 'Transmettre la chaleur',
    equipment: 'reactor',
    action: 'Chauffer à 65 %',
    explain:
      'La chaleur passe du combustible au primaire, puis au secondaire à travers les tubes. Observez les températures : le secondaire doit atteindre 275 °C avant de produire de la vapeur.',
    observe:
      'Le secondaire bout. Sa température reste à 275 °C : l’énergie supplémentaire sert à vaporiser l’eau.',
    ready: (s: State) => secondaryT(s) >= 274.99 && steamEnergy(s) > 80,
  },
  {
    title: 'Mettre l’arbre en rotation',
    equipment: 'turbine',
    action: 'Ouvrir l’admission à 70 %',
    explain:
      'Ouvrir la vanne laisse la vapeur traverser la turbine. Elle accélère l’arbre ; le condenseur reçoit la chaleur qui n’a pas été convertie en mouvement.',
    observe:
      'La turbine tourne, mais l’alternateur ne débite pas encore : aucune charge n’est connectée.',
    ready: (s: State) => rpm(s) > 600,
  },
  {
    title: 'Produire de l’électricité',
    equipment: 'generator',
    action: 'Connecter la charge',
    explain:
      'Connectez une charge électrique à l’alternateur. L’énergie prélevée freine l’arbre, tandis que la vapeur continue de l’entraîner.',
    observe:
      'La chaîne est complète. Essayez maintenant de réduire la chaleur ou le refroidissement en exploration libre.',
    ready: (s: State) => s.exported > 100,
  },
] as const;
