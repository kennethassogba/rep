import { lessons } from './content';
import type { Lang } from './parts';
export const englishLessons = [
  {
    title: 'Prepare the water return',
    action: 'Start cooling & feed pumps',
    explain:
      'Steam will need to condense, then return to the steam generator. Start cooling and the feed pump first.',
    observe: 'Both paths are ready. Circulation alone does not produce heat.',
    equipment: 'cooling',
  },
  {
    title: 'Circulate the primary water',
    action: 'Start the primary pump',
    explain:
      'The primary water carries heat from the core to the steam-generator tubes. It stays in its own closed circuit.',
    observe: 'Primary flow is established. Follow the arrows around the closed loop.',
    equipment: 'primary',
  },
  {
    title: 'Transfer heat',
    action: 'Set core heat to 65%',
    explain:
      'Heat passes from the fuel to the primary water, then across the tubes. Watch the secondary temperature reach 275 °C before steam appears.',
    observe:
      'The secondary water is boiling. Added energy now vaporizes water instead of increasing its temperature.',
    equipment: 'reactor',
  },
  {
    title: 'Turn the shaft',
    action: 'Open steam admission to 70%',
    explain:
      'Steam expansion drives the turbine. The condenser receives the heat that was not converted into shaft work.',
    observe: 'The shaft is turning. Electrical output stays at zero until a load is connected.',
    equipment: 'turbine',
  },
  {
    title: 'Connect an electrical load',
    action: 'Connect the load',
    explain:
      'The generator extracts energy from the shaft. The load resists rotation while steam continues to drive the turbine.',
    observe: 'The cycle is running. Try changing the heat input or cooling in Explore mode.',
    equipment: 'generator',
  },
];
export function lessonCopy(lang: Lang, i: number) {
  return lang === 'en' ? englishLessons[i] : lessons[i];
}
const blocks: Record<string, string> = {
  'L’eau primaire doit circuler : démarrez la pompe primaire.':
    'Primary water must circulate. Start the primary pump.',
  'La chaleur doit pouvoir sortir : démarrez le refroidissement.':
    'Heat needs an outlet. Start the cooling pump.',
  'Fermez le cycle secondaire : démarrez la pompe alimentaire.':
    'Close the secondary loop. Start the feed pump.',
  'Le condenseur est trop chaud : rétablissez le refroidissement et attendez moins de 75 °C.':
    'The condenser is too hot. Restore cooling and wait for a temperature below 75 °C.',
  'Le retour d’eau est arrêté : démarrez la pompe alimentaire.':
    'Water return is stopped. Start the feed pump.',
  'Pas encore de vapeur : chauffez l’eau secondaire jusqu’à 275 °C dans ce modèle.':
    'No steam yet. Heat the secondary water to 275 °C in this model.',
  'La réserve de vapeur est épuisée : augmentez la chaleur ou réduisez l’admission.':
    'The steam energy reserve is empty. Increase heat input or reduce admission.',
  'Arrêt pédagogique : le primaire a atteint 330 °C. Réduisez la puissance, rétablissez les pompes puis réarmez sous 310 °C.':
    'Teaching trip: primary water reached 330 °C. Set heat to zero, restore all pumps and reset below 310 °C.',
  'Arrêt pédagogique : le débit primaire est insuffisant. Rétablissez la pompe, ramenez la puissance à zéro puis réarmez.':
    'Teaching trip: primary flow is too low. Restore the pump, set heat to zero and reset.',
};
export const translateBlock = (s: string, lang: Lang) => (lang === 'en' ? (blocks[s] ?? s) : s);
export const connectionLabels: Record<string, string> = {
  'Reçoit l’eau refroidie': 'Receives cooled water',
  'Envoie l’eau chaude': 'Sends hot water',
  'Partage la pression du circuit': 'Shares primary pressure',
  'Raccordé à la branche chaude': 'Connected to the hot leg',
  'Aspire l’eau refroidie': 'Takes in cooled water',
  'Refoule vers la cuve': 'Discharges into the vessel',
  'Reçoit la chaleur du primaire': 'Receives primary heat',
  'Retour primaire refroidi': 'Cooled primary return',
  'Envoie la vapeur': 'Sends steam',
  'Reçoit l’eau secondaire': 'Receives feedwater',
  'Reçoit la vapeur sous pression': 'Receives pressurized steam',
  'Évacue la vapeur détendue': 'Discharges exhaust steam',
  'Transmet le couple par l’arbre': 'Transmits shaft torque',
  'Reçoit l’énergie mécanique': 'Receives shaft work',
  'Reçoit la vapeur détendue': 'Receives exhaust steam',
  'Renvoie l’eau condensée': 'Returns condensate',
  'Cède la chaleur au circuit froid': 'Transfers heat to cooling water',
  'Aspire l’eau condensée': 'Takes in condensate',
  'Alimente le générateur de vapeur': 'Feeds the steam generator',
  'Alimente et refroidit les tubes': 'Supplies cooling water to the tubes',
};
export function modelHTML(lang: Lang) {
  return lang === 'en'
    ? `
<h2 id="model-title">Model & limits</h2>
<p>An energy-flow model for learning, not a plant operating procedure. The initial state assumes already pressurized circuits. No real installation is represented.</p>
<h3>Energy is accounted for</h3><p>Fission heats the primary water. The steam generator transfers heat to the secondary reservoir. Steam expansion adds shaft energy; the electrical load extracts it. The remaining heat reaches the cold sink.</p><pre>C dT/dt = heat in − heat out\nE shaft = ½ J ω²</pre><p>Storage includes primary and secondary heat, condenser heat, latent steam energy, rotation and an illustrative decay-heat reservoir. Current balance error: <strong id="balance">0</strong> MJ.</p>
<h3>Imposed parameters</h3><p>Maximum fission power: 1,200 MW. Effective thermal capacities: primary 25, secondary 15 and condenser 18 MJ/K. Primary pressure: 155 bar. Secondary boiling temperature: 275 °C, approximately 60 bar. Pressures are imposed, not calculated.</p><p>Heat-exchanger conductance: 40 MW/K at full primary flow. Ideal cold sink: 20 °C. Nominal primary/cooling flow: 14,000/20,000 kg/s. Cycle efficiency: 65% of the Carnot limit between steam and condenser; generator efficiency: 96%. Steam mass flow includes effective latent heat (1.6 MJ/kg) and feedwater reheating (4.8 kJ/kg/K).</p>
<p>Explore opens on an operating example integrated from cold for 360 model seconds. Cold start begins the guided energy-flow lesson at 20 °C.</p><h3>Teaching time</h3><p>Effective thermal masses are reduced so heating takes tens of model seconds. There is no single conversion factor to real time. Pause and playback speed control both physics and animation. Shaft rotation is displayed at a slower visual rate.</p>
<h3>Detail does not imply local simulation</h3><p>Internal views explain component structure. Geometry, counts, wall thicknesses and gaps are schematic. Fuel-rod and pellet temperatures, local stresses, magnetic fields and microscopic processes are not calculated. The live values in these views belong to the parent equipment. Internal paths illustrate routes, not calculated velocity fields. Particle speed follows circuit flow or heat transfer; colours indicate the direction of warming, not local temperatures. Electrical loops show energy conversion, not a computed magnetic field. Opening shells is an illustrative sectioning operation.</p>
<h3>Omitted physics</h3><p>No neutron kinetics, detailed fluid dynamics, dynamic pressure, water-level inventory, network synchronization or accident analysis. The steam reservoir has no finite mass limit. Feedwater return balances steam flow when the feed pump is on. Pump electricity is omitted, so output is gross.</p><p>The decay reservoir receives 6% of fission power and releases energy with a 60 s time constant. This is illustrative, not a qualified decay-heat curve. Trips and admission blocks are teaching rules. At 340 °C the liquid-only primary model pauses at its domain boundary; restore the primary pump and resume to cool.</p>
<h3>References & source</h3><p><a href="https://www.nrc.gov/reactors/power/pwrs" target="_blank" rel="noreferrer">NRC · Pressurized water reactors</a><br><a href="https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/04.pdf" target="_blank" rel="noreferrer">NRC · Reactor Concepts Manual</a><br><a href="https://april-zhu.com/colorfigures" target="_blank" rel="noreferrer">April Zhu · Colorfigures, visual reference</a><br><a href="https://github.com/kennethassogba/rep" target="_blank" rel="noreferrer">GitHub · source code and equations</a></p><p>Original geometry and implementation. No operating data was used to calibrate this model.</p>`
    : `
<h2 id="model-title">Modèle et limites</h2><p>Un modèle d’échanges d’énergie pour comprendre, sans procédure de conduite. L’état initial suppose des circuits déjà pressurisés. Aucune installation réelle n’est représentée.</p>
<h3>Un bilan d’énergie</h3><p>La fission chauffe le primaire. Le générateur transmet la chaleur au secondaire. La vapeur fournit de l’énergie à l’arbre ; la charge électrique en prélève. Le reste rejoint la source froide.</p><pre>C dT/dt = chaleur reçue − chaleur cédée\nE arbre = ½ J ω²</pre><p>Le stockage comprend les chaleurs primaire, secondaire et du condenseur, la réserve latente, la rotation et une réserve de chaleur résiduelle. Écart actuel du bilan : <strong id="balance">0</strong> MJ.</p>
<h3>Paramètres imposés</h3><p>Fission maximale : 1 200 MW. Capacités thermiques effectives : primaire 25, secondaire 15 et condenseur 18 MJ/K. Primaire : 155 bar. Ébullition secondaire : 275 °C, soit environ 60 bar. Les pressions sont imposées, non calculées.</p><p>Conductance de l’échangeur : 40 MW/K au débit primaire nominal. Source froide idéale à 20 °C. Débits primaire/froid nominaux : 14 000/20 000 kg/s. Rendement du cycle : 65 % de la limite de Carnot entre vapeur et condenseur ; alternateur : 96 %. Le débit vapeur inclut chaleur latente effective (1,6 MJ/kg) et réchauffage du retour (4,8 kJ/kg/K).</p>
<p>Explorer s’ouvre sur un exemple en marche, calculé depuis l’état froid pendant 360 secondes de modèle. Démarrage à froid lance la leçon guidée à 20 °C.</p><h3>Temps pédagogique</h3><p>Les masses thermiques effectives sont réduites pour chauffer en quelques dizaines de secondes de modèle. Il n’existe pas de facteur unique vers le temps réel. Pause et vitesse agissent sur la physique et les animations. La rotation de l’arbre est ralentie visuellement.</p>
<h3>Détail visuel et calcul local</h3><p>Les vues internes expliquent la structure. Géométries, nombres, épaisseurs et jeux sont schématiques. Les températures de crayons ou pastilles, contraintes locales, champs magnétiques et processus microscopiques ne sont pas calculés. Les valeurs affichées dans ces vues appartiennent à l’équipement parent. Les trajets internes ne sont pas des champs de vitesse calculés. Le défilement suit le débit du circuit ou le transfert de chaleur ; les couleurs indiquent le sens du réchauffement, pas des températures locales. Les boucles électriques illustrent la conversion d’énergie, sans calcul de champ magnétique. L’ouverture des enveloppes est une mise en coupe illustrative.</p>
<h3>Physique omise</h3><p>Pas de cinétique neutronique, d’écoulement détaillé, de pression dynamique, de niveaux d’eau, de synchronisation réseau ni d’analyse d’accident. La réserve vapeur n’a pas de limite de masse. Le retour alimentaire équilibre le débit vapeur lorsque la pompe fonctionne. L’électricité des pompes est omise : la production est brute.</p><p>La réserve résiduelle reçoit 6 % de la fission et libère son énergie avec une constante de 60 s. Elle est illustrative, sans courbe qualifiée de décroissance. Les arrêts et blocages sont des règles pédagogiques. À 340 °C, le modèle primaire liquide se met en pause à sa limite de validité ; rétablissez la pompe primaire puis reprenez pour refroidir.</p>
<h3>Références et code</h3><p><a href="https://www.nrc.gov/reactors/power/pwrs" target="_blank" rel="noreferrer">NRC · Réacteurs à eau pressurisée</a><br><a href="https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/04.pdf" target="_blank" rel="noreferrer">NRC · Reactor Concepts Manual</a><br><a href="https://april-zhu.com/colorfigures" target="_blank" rel="noreferrer">April Zhu · Colorfigures, référence visuelle</a><br><a href="https://github.com/kennethassogba/rep" target="_blank" rel="noreferrer">GitHub · code et équations</a></p><p>Géométrie et implémentation originales. Aucune donnée d’exploitation n’a servi à calibrer le modèle.</p>`;
}
