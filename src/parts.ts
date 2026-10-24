export type Lang = 'en' | 'fr';
export type Pair = readonly [en: string, fr: string];
export type Kind =
  | 'vessel'
  | 'core'
  | 'assembly'
  | 'rod'
  | 'pellet'
  | 'cladding'
  | 'gap'
  | 'control'
  | 'grid'
  | 'fluid'
  | 'shell'
  | 'bundle'
  | 'tube'
  | 'wall'
  | 'pump'
  | 'impeller'
  | 'blade'
  | 'motor'
  | 'rotor'
  | 'coil'
  | 'wire'
  | 'insulation'
  | 'turbine'
  | 'stage'
  | 'shaft'
  | 'generator'
  | 'stator'
  | 'condenser'
  | 'waterbox'
  | 'pressurizer'
  | 'heater'
  | 'spray'
  | 'nozzle'
  | 'cooling'
  | 'fan'
  | 'bearing'
  | 'seal';
export interface Part {
  id: string;
  name: Pair;
  role: Pair;
  kind: Kind;
  children: Part[];
  parent?: Part;
  equipment: string;
}
type Spec = [key: string, name: Pair, role: Pair, kind: Kind, children?: Spec[]];
const conductor = (): Spec => [
  'conductor',
  ['Copper conductor', 'Conducteur en cuivre'],
  [
    'Electric current flows through the conductor. Its resistance produces heat; electrical losses are represented only by the overall generator efficiency.',
    'Le courant traverse le conducteur. Sa résistance produit de la chaleur ; ces pertes ne sont représentées que par le rendement global de l’alternateur.',
  ],
  'wire',
  [
    [
      'insulation',
      ['Electrical insulation', 'Isolant électrique'],
      [
        'Insulation separates adjacent turns and the conductor from grounded metal. Dielectric strength and ageing are outside this model.',
        'L’isolant sépare les spires entre elles et des masses métalliques. La tenue diélectrique et le vieillissement ne sont pas simulés.',
      ],
      'insulation',
    ],
  ],
];
const coil = (): Spec => [
  'winding',
  ['Winding', 'Bobinage'],
  [
    'Insulated turns form a coil. Current creates a magnetic field; a changing linked field can induce a voltage.',
    'Les spires isolées forment une bobine. Le courant crée un champ magnétique ; la variation du flux lié peut induire une tension.',
  ],
  'coil',
  [conductor()],
];
const blade = (pump = false): Spec => [
  'blade',
  [pump ? 'Impeller vane' : 'Blade', pump ? 'Aube de roue' : 'Aube'],
  [
    pump
      ? 'A curved vane transfers momentum from the rotating wheel to the liquid. The resulting pressure rise drives the circuit.'
      : 'The blade profile redirects the flow. A moving blade exchanges energy with the shaft; a fixed blade guides the flow.',
    pump
      ? 'Une aube courbe transmet de la quantité de mouvement de la roue au liquide. L’augmentation de pression entraîne l’écoulement.'
      : 'Le profil dévie l’écoulement. Une aube mobile échange de l’énergie avec l’arbre ; une aube fixe guide le fluide.',
  ],
  'blade',
  [
    [
      'profile',
      ['Profile & passage', 'Profil et passage'],
      [
        'The space between neighbouring surfaces sets the flow passage. Curvature and pressure gradients are shown schematically, without a fluid-dynamics calculation.',
        'L’espace entre surfaces voisines forme le passage du fluide. Courbure et gradients de pression sont schématiques, sans calcul d’écoulement.',
      ],
      'nozzle',
    ],
    [
      'root',
      ['Root attachment', 'Pied de fixation'],
      [
        'The root transfers force to the disk. Stress, fatigue and material temperature are not calculated.',
        'Le pied transmet l’effort au disque. Les contraintes, la fatigue et la température du matériau ne sont pas calculées.',
      ],
      'grid',
    ],
  ],
];
const bearing = (): Spec => [
  'bearing',
  ['Bearing & shaft seal', 'Palier et étanchéité'],
  [
    'The bearing supports the shaft while the seal limits leakage. Shaft losses are lumped into one friction term.',
    'Le palier supporte l’arbre et le joint limite les fuites. Les pertes mécaniques sont regroupées dans un terme de frottement.',
  ],
  'bearing',
  [
    [
      'seal',
      ['Seal faces', 'Faces du joint'],
      [
        'Closely spaced stationary and rotating faces form the sealing interface. Leakage and contact forces are not resolved.',
        'Deux faces, fixe et tournante, forment l’interface d’étanchéité. Les fuites et les efforts de contact ne sont pas résolus.',
      ],
      'seal',
    ],
  ],
];
const motor = (): Spec => [
  'motor',
  ['Electric motor', 'Moteur électrique'],
  [
    'The motor drives the pump or fan. Auxiliary electricity is omitted from the energy balance; pump flow follows the requested setting with an inertia.',
    'Le moteur entraîne la pompe ou le ventilateur. L’électricité des auxiliaires est omise du bilan ; le débit suit la commande avec une inertie.',
  ],
  'motor',
  [
    [
      'rotor',
      ['Rotor', 'Rotor'],
      [
        'The rotating electromagnetic part transmits torque to the shaft. Its speed is represented by the flow fraction in this illustration.',
        'La partie électromagnétique tournante transmet le couple à l’arbre. Sa vitesse est représentée par la fraction de débit dans cette illustration.',
      ],
      'rotor',
      [coil(), bearing()],
    ],
    [
      'stator',
      ['Stator', 'Stator'],
      [
        'The fixed magnetic structure surrounds the rotor and carries the winding. The air gap lets the rotor turn without contact.',
        'La structure magnétique fixe entoure le rotor et porte le bobinage. L’entrefer permet la rotation sans contact.',
      ],
      'stator',
      [
        coil(),
        [
          'airgap',
          ['Air gap', 'Entrefer'],
          [
            'Magnetic flux crosses the small clearance between rotor and stator. The dimension is enlarged here to show the separation.',
            'Le flux magnétique traverse le faible espace entre rotor et stator. Cet espace est agrandi ici pour rendre la séparation visible.',
          ],
          'gap',
        ],
      ],
    ],
  ],
];
const tube = (steam = false): Spec => [
  'tube',
  [steam ? 'U-tube' : 'Heat-exchanger tube', steam ? 'Tube en U' : 'Tube d’échange'],
  [
    steam
      ? 'Primary water travels inside the U-tube; secondary water surrounds it. Heat crosses the metal without mixing the fluids.'
      : 'One fluid flows inside the tube and another outside. The metal wall transmits heat while keeping the circuits apart.',
    steam
      ? 'L’eau primaire circule dans le tube en U ; le secondaire l’entoure. La chaleur traverse le métal sans mélange des eaux.'
      : 'Un fluide circule dans le tube et un autre à l’extérieur. La paroi métallique transmet la chaleur en séparant les circuits.',
  ],
  'tube',
  [
    [
      'wall',
      ['Metal wall', 'Paroi métallique'],
      [
        'Conduction transfers energy through the wall. Wall thickness is exaggerated; the model uses one overall heat-transfer coefficient.',
        'La conduction transfère l’énergie à travers la paroi. Son épaisseur est exagérée ; le modèle utilise un coefficient global d’échange.',
      ],
      'wall',
    ],
    [
      'inside',
      ['Inner fluid', 'Fluide intérieur'],
      [
        'The moving fluid brings or removes heat at the inner surface. Local velocity and temperature profiles are not resolved.',
        'Le fluide en mouvement apporte ou emporte la chaleur au contact de la surface intérieure. Les profils locaux de vitesse et de température ne sont pas résolus.',
      ],
      'fluid',
    ],
    [
      'outside',
      ['Outer fluid', 'Fluide extérieur'],
      [
        'Heat crosses the outer surface into the second circuit. This flow remains hydraulically separate from the inner fluid.',
        'La chaleur traverse la surface extérieure vers le second circuit. Cet écoulement reste séparé hydrauliquement du fluide intérieur.',
      ],
      'fluid',
    ],
  ],
];
const pump = (feed = false): Spec[] => [
  [
    'hydraulics',
    [feed ? 'Pump stages' : 'Hydraulic stage', feed ? 'Étages de pompage' : 'Étage hydraulique'],
    [
      'The impeller adds energy to the liquid; stationary passages convert some of its velocity into pressure.',
      'La roue fournit de l’énergie au liquide ; les passages fixes convertissent une partie de sa vitesse en pression.',
    ],
    'pump',
    [
      [
        'impeller',
        ['Impeller', 'Roue'],
        [
          'The rotating wheel receives liquid near its centre and accelerates it outwards. Its vanes transmit shaft work to the liquid.',
          'La roue reçoit le liquide près de son centre et l’accélère vers l’extérieur. Ses aubes transmettent le travail de l’arbre au liquide.',
        ],
        'impeller',
        [blade(true)],
      ],
      [
        'diffuser',
        ['Diffuser', 'Diffuseur'],
        [
          'Stationary passages slow the flow and recover pressure. Their shape is illustrative; no pump characteristic curve is solved.',
          'Les passages fixes ralentissent le fluide et récupèrent de la pression. Leur forme est illustrative ; aucune courbe caractéristique de pompe n’est résolue.',
        ],
        'stator',
        [blade(true)],
      ],
      [
        'casing',
        ['Casing', 'Corps de pompe'],
        [
          'The casing collects the liquid and directs it into the outlet. It also forms a pressure boundary.',
          'Le corps collecte le liquide et le dirige vers la sortie. Il constitue aussi une enveloppe sous pression.',
        ],
        'shell',
        [
          [
            'wall',
            ['Pressure wall', 'Paroi sous pression'],
            [
              'The wall contains the water. Thickness, pressure stress and mechanical qualification are outside this model.',
              'La paroi contient l’eau. Épaisseur, contraintes de pression et qualification mécanique ne sont pas calculées.',
            ],
            'wall',
          ],
        ],
      ],
    ],
  ],
  motor(),
  bearing(),
];
const specs: Spec[] = [
  [
    'reactor',
    ['Reactor vessel', 'Cuve du réacteur'],
    [
      'Fuel releases heat into the primary water. Open the vessel to follow the structure down to a single fuel pellet.',
      'Le combustible cède sa chaleur à l’eau primaire. Ouvrez la cuve pour descendre jusqu’à une pastille.',
    ],
    'vessel',
    [
      [
        'core',
        ['Core', 'Cœur'],
        [
          'The core groups fuel assemblies, absorbing rods and water passages. Their arrangement is schematic and is not a neutronics model.',
          'Le cœur regroupe assemblages, barres absorbantes et passages d’eau. Leur disposition est schématique et ne constitue pas un modèle neutronique.',
        ],
        'core',
        [
          [
            'assembly',
            ['Fuel assembly', 'Assemblage combustible'],
            [
              'A lattice of fuel rods is held by spacer grids. Water flows between rods. The displayed rod count is reduced for readability.',
              'Un réseau de crayons est maintenu par des grilles. L’eau circule entre les crayons. Leur nombre affiché est réduit pour la lisibilité.',
            ],
            'assembly',
            [
              [
                'rod',
                ['Fuel rod', 'Crayon combustible'],
                [
                  'A sealed metal tube contains a stack of ceramic fuel pellets. Heat must cross the pellet, gas gap and cladding before reaching the water.',
                  'Un tube métallique étanche contient des pastilles de combustible céramique. La chaleur traverse la pastille, le jeu gazeux et la gaine avant d’atteindre l’eau.',
                ],
                'rod',
                [
                  [
                    'pellet',
                    ['Fuel pellet', 'Pastille combustible'],
                    [
                      'Fission energy becomes heat in the uranium-dioxide ceramic. Pellet temperature and radial heat conduction are not solved; the model calculates aggregate core heat only.',
                      'L’énergie de fission devient de la chaleur dans la céramique de dioxyde d’uranium. La température et la conduction radiale ne sont pas résolues ; seule la chaleur globale du cœur est calculée.',
                    ],
                    'pellet',
                    [
                      [
                        'ceramic',
                        ['Ceramic microstructure', 'Microstructure céramique'],
                        [
                          'The pellet is a sintered ceramic made of grains and pores. This magnified structure is illustrative, not a microscopy image or a fuel-performance calculation.',
                          'La pastille est une céramique frittée composée de grains et de pores. Cette structure agrandie est illustrative, sans image de microscopie ni calcul de tenue du combustible.',
                        ],
                        'core',
                        [
                          [
                            'grain',
                            ['UO₂ grain', 'Grain de UO₂'],
                            [
                              'Heat is generated within the material and conducted towards the pellet surface. Grain size, composition and irradiation effects are not represented quantitatively.',
                              'La chaleur est produite dans le matériau puis conduite vers la surface de la pastille. Taille des grains, composition et effets de l’irradiation ne sont pas représentés quantitativement.',
                            ],
                            'pellet',
                          ],
                        ],
                      ],
                    ],
                  ],
                  [
                    'gap',
                    ['Pellet–cladding gap', 'Jeu pastille–gaine'],
                    [
                      'A narrow gas-filled gap separates fuel and cladding. It adds thermal resistance. The gap is enlarged in the drawing; contact and gas behaviour are not solved.',
                      'Un faible jeu rempli de gaz sépare combustible et gaine. Il ajoute une résistance thermique. Le jeu est agrandi dans le dessin ; le contact et le comportement du gaz ne sont pas résolus.',
                    ],
                    'gap',
                  ],
                  [
                    'cladding',
                    ['Cladding', 'Gaine'],
                    [
                      'The zirconium-alloy tube separates the fuel from the coolant and transfers heat to the water. It is a material boundary, not a second water circuit.',
                      'Le tube en alliage de zirconium sépare le combustible du caloporteur et transmet la chaleur à l’eau. Cette enveloppe n’est pas un second circuit d’eau.',
                    ],
                    'cladding',
                    [
                      [
                        'wall',
                        ['Cladding wall', 'Paroi de la gaine'],
                        [
                          'Heat conducts through the solid wall. Thickness, oxidation, stresses and failure mechanisms are not simulated.',
                          'La chaleur se propage par conduction dans la paroi solide. L’épaisseur, l’oxydation, les contraintes et les mécanismes de rupture ne sont pas simulés.',
                        ],
                        'wall',
                      ],
                    ],
                  ],
                  [
                    'plenum',
                    ['Plenum & spring', 'Plénum et ressort'],
                    [
                      'The upper free volume accommodates gas and expansion. A spring retains the pellet stack. Gas pressure and swelling are not calculated.',
                      'Le volume libre supérieur accueille gaz et dilatation. Un ressort maintient l’empilement de pastilles. La pression du gaz et le gonflement ne sont pas calculés.',
                    ],
                    'coil',
                  ],
                ],
              ],
              [
                'grid',
                ['Spacer grid', 'Grille de maintien'],
                [
                  'The grid holds neighbouring rods apart and guides coolant. Each cell supports one rod or guide tube.',
                  'La grille maintient l’écartement des crayons et guide le caloporteur. Chaque cellule supporte un crayon ou un tube guide.',
                ],
                'grid',
                [
                  [
                    'cell',
                    ['Grid cell', 'Cellule de grille'],
                    [
                      'Thin strips and supports locate a rod while allowing water to pass. Contact and vibration are outside the model.',
                      'Des feuillards et appuis positionnent un crayon en laissant passer l’eau. Le contact et les vibrations ne sont pas simulés.',
                    ],
                    'grid',
                  ],
                ],
              ],
            ],
          ],
          [
            'coolant',
            ['Coolant channels', 'Canaux de refroidissement'],
            [
              'Pressurized liquid water removes heat between the rods. Only mean primary temperature and total mass flow are calculated.',
              'L’eau liquide sous pression emporte la chaleur entre les crayons. Seuls la température moyenne et le débit total du primaire sont calculés.',
            ],
            'fluid',
          ],
        ],
      ],
      [
        'controls',
        ['Control-rod cluster', 'Grappe de commande'],
        [
          'Absorbing rods change the neutron population in a real core. Here their position illustrates the heat demand; neutron kinetics are not calculated.',
          'Dans un cœur réel, les barres absorbantes modifient la population de neutrons. Leur position illustre ici la consigne de chaleur ; la cinétique neutronique n’est pas calculée.',
        ],
        'control',
        [
          [
            'absorber',
            ['Absorber rod', 'Barre absorbante'],
            [
              'An absorbing material is enclosed in a metal sheath and slides through a guide tube. No reactivity or shutdown margin is evaluated.',
              'Un matériau absorbant est enfermé dans une gaine métallique et coulisse dans un tube guide. Aucune réactivité ni marge d’arrêt n’est évaluée.',
            ],
            'rod',
            [
              [
                'material',
                ['Absorbing material', 'Matériau absorbant'],
                [
                  'Neutron capture reduces the number of neutrons available for fission. The illustration does not specify a material composition or enrichment.',
                  'La capture réduit le nombre de neutrons disponibles pour la fission. L’illustration ne spécifie ni composition du matériau ni enrichissement.',
                ],
                'pellet',
              ],
            ],
          ],
        ],
      ],
      [
        'boundary',
        ['Vessel & internals', 'Cuve et internes'],
        [
          'The vessel contains the pressurized primary water. Internal supports locate the core and guide the flow.',
          'La cuve contient l’eau primaire sous pression. Les supports internes positionnent le cœur et guident l’écoulement.',
        ],
        'shell',
        [
          [
            'wall',
            ['Vessel wall', 'Paroi de cuve'],
            [
              'The steel wall carries pressure loads. The drawing exaggerates wall thickness and does not calculate stress.',
              'La paroi en acier reprend les efforts de pression. L’épaisseur est exagérée et les contraintes ne sont pas calculées.',
            ],
            'wall',
          ],
          [
            'nozzle',
            ['Coolant nozzle', 'Tubulure'],
            [
              'The nozzle connects the vessel to the primary pipework. Inlet and outlet remain part of the same closed primary circuit.',
              'La tubulure raccorde la cuve aux tuyauteries primaires. Entrée et sortie appartiennent au même circuit primaire fermé.',
            ],
            'nozzle',
          ],
        ],
      ],
    ],
  ],
  [
    'pressurizer',
    ['Pressurizer', 'Pressuriseur'],
    [
      'A steam space provides pressure control for the primary circuit. Primary pressure is imposed at 155 bar in this model.',
      'Un volume de vapeur permet la régulation de la pression primaire. Elle est imposée à 155 bar dans ce modèle.',
    ],
    'pressurizer',
    [
      [
        'steamspace',
        ['Steam space', 'Volume de vapeur'],
        [
          'The compressible steam space is distinct from the liquid primary water. Its pressure response is not simulated.',
          'Le volume de vapeur compressible est distinct de l’eau liquide primaire. Sa réponse en pression n’est pas simulée.',
        ],
        'fluid',
      ],
      [
        'heaters',
        ['Heater bank', 'Banc de chaufferettes'],
        [
          'Immersed electrical heaters can evaporate some water to increase pressure. They are shown for explanation and do not add energy to the simplified model.',
          'Des chaufferettes immergées peuvent vaporiser de l’eau pour augmenter la pression. Elles sont illustrées mais n’ajoutent pas d’énergie au modèle simplifié.',
        ],
        'heater',
        [
          [
            'element',
            ['Heating element', 'Élément chauffant'],
            [
              'A resistive element sits inside a protective sheath. Electrical resistance converts current into heat.',
              'Un élément résistif est enfermé dans une gaine protectrice. La résistance électrique transforme le courant en chaleur.',
            ],
            'rod',
            [
              [
                'wire',
                ['Resistive wire', 'Fil résistif'],
                [
                  'The conductor dissipates electrical energy by Joule heating. Its resistance and temperature are not calculated.',
                  'Le conducteur dissipe l’énergie électrique par effet Joule. Sa résistance et sa température ne sont pas calculées.',
                ],
                'coil',
              ],
              [
                'sheath',
                ['Protective sheath', 'Gaine protectrice'],
                [
                  'The metal sheath separates the electrical element from the primary water.',
                  'La gaine métallique sépare l’élément électrique de l’eau primaire.',
                ],
                'cladding',
              ],
            ],
          ],
        ],
      ],
      [
        'spray',
        ['Spray system', 'Aspersion'],
        [
          'A fine water spray can condense steam and reduce pressure. Droplets and pressure regulation are not simulated.',
          'Une fine aspersion d’eau peut condenser la vapeur et réduire la pression. Les gouttes et la régulation de pression ne sont pas simulées.',
        ],
        'spray',
        [
          [
            'nozzle',
            ['Spray nozzle', 'Buse d’aspersion'],
            [
              'The nozzle breaks the water stream into droplets, increasing the contact area with steam.',
              'La buse fragmente l’eau en gouttes et augmente la surface de contact avec la vapeur.',
            ],
            'nozzle',
            [
              [
                'orifice',
                ['Orifice', 'Orifice'],
                [
                  'The small opening accelerates and distributes the water. Its size here is illustrative.',
                  'Le petit passage accélère et distribue l’eau. Sa taille est illustrative.',
                ],
                'wall',
              ],
            ],
          ],
        ],
      ],
      [
        'surge',
        ['Surge line', 'Ligne d’expansion'],
        [
          'This connection lets primary water enter or leave the pressurizer as the circuit expands or contracts.',
          'Ce raccord permet à l’eau primaire d’entrer ou de sortir du pressuriseur lorsque le circuit se dilate ou se contracte.',
        ],
        'tube',
        [tube()],
      ],
    ],
  ],
  [
    'primary',
    ['Primary pump', 'Pompe primaire'],
    [
      'The pump circulates primary water through the core and steam-generator tubes.',
      'La pompe fait circuler l’eau primaire dans le cœur et les tubes du générateur de vapeur.',
    ],
    'pump',
    pump(),
  ],
  [
    'steam',
    ['Steam generator', 'Générateur de vapeur'],
    [
      'Heat crosses the tube wall from primary water to the secondary circuit. The two fluids remain separate.',
      'La chaleur traverse la paroi des tubes du primaire vers le secondaire. Les deux fluides restent séparés.',
    ],
    'vessel',
    [
      [
        'bundle',
        ['Tube bundle', 'Faisceau tubulaire'],
        [
          'Many parallel U-tubes provide heat-transfer area. The visible tube count is reduced.',
          'De nombreux tubes en U offrent une surface d’échange. Le nombre de tubes visibles est réduit.',
        ],
        'bundle',
        [tube(true)],
      ],
      [
        'secondary',
        ['Secondary chamber', 'Volume secondaire'],
        [
          'Water surrounding the tubes heats and boils. Additional heat at the imposed saturation temperature supplies the steam energy reservoir.',
          'L’eau autour des tubes chauffe puis bout. À la température de saturation imposée, la chaleur supplémentaire alimente la réserve d’énergie vapeur.',
        ],
        'fluid',
      ],
      [
        'separator',
        ['Steam separation', 'Séparation de la vapeur'],
        [
          'Separators and dryers reduce carried-over liquid before steam enters the turbine. Moisture separation is not resolved in the model.',
          'Séparateurs et sécheurs réduisent l’eau liquide entraînée avant la turbine. La séparation de l’humidité n’est pas résolue.',
        ],
        'grid',
        [
          [
            'vane',
            ['Separator vane', 'Ailette de séparation'],
            [
              'The flow changes direction; liquid droplets tend to separate from the vapour. The shape is schematic.',
              'L’écoulement change de direction ; les gouttes tendent à se séparer de la vapeur. La forme est schématique.',
            ],
            'blade',
          ],
        ],
      ],
      [
        'tubesheet',
        ['Tube sheet', 'Plaque tubulaire'],
        [
          'The thick plate anchors the tubes and separates the primary channel head from the secondary water.',
          'La plaque épaisse ancre les tubes et sépare la boîte primaire de l’eau secondaire.',
        ],
        'grid',
        [
          [
            'joint',
            ['Tube-to-sheet joint', 'Liaison tube–plaque'],
            [
              'The sealed tube joint preserves the boundary between primary and secondary circuits. No leak or damage model is included.',
              'La liaison étanche maintient la séparation des circuits. Aucun modèle de fuite ou d’endommagement n’est inclus.',
            ],
            'seal',
          ],
        ],
      ],
    ],
  ],
  [
    'turbine',
    ['Steam turbine', 'Turbine à vapeur'],
    [
      'Steam expansion supplies shaft work. The condenser receives the energy that is not converted into mechanical power.',
      'La détente de la vapeur fournit du travail à l’arbre. Le condenseur reçoit l’énergie non convertie en puissance mécanique.',
    ],
    'turbine',
    [
      [
        'stage',
        ['Turbine stage', 'Étage de turbine'],
        [
          'A stationary row guides steam into a moving row. Successive stages extract energy as the steam expands.',
          'Une rangée fixe guide la vapeur vers une rangée mobile. Les étages successifs extraient de l’énergie pendant la détente.',
        ],
        'stage',
        [
          [
            'moving',
            ['Moving blade row', 'Roue mobile'],
            [
              'Steam forces on the blades create a torque on the disk and shaft.',
              'Les efforts de la vapeur sur les aubes créent un couple sur le disque et l’arbre.',
            ],
            'impeller',
            [blade()],
          ],
          [
            'fixed',
            ['Fixed nozzle row', 'Distributeur fixe'],
            [
              'Stationary blades accelerate and direct the steam towards the next moving row.',
              'Les aubes fixes accélèrent et dirigent la vapeur vers la roue suivante.',
            ],
            'stator',
            [blade()],
          ],
        ],
      ],
      [
        'shaft',
        ['Shaft train', 'Ligne d’arbre'],
        [
          'The shaft stores rotational energy and carries torque to the generator. Its calculated speed responds to steam power, load and friction.',
          'L’arbre stocke l’énergie de rotation et transmet le couple à l’alternateur. Sa vitesse calculée dépend de la vapeur, de la charge et des frottements.',
        ],
        'shaft',
        [bearing()],
      ],
      [
        'admission',
        ['Admission valve', 'Vanne d’admission'],
        [
          'The opening limits the steam energy flow into the turbine. Closing it cuts new shaft input, while stored rotation decays.',
          'L’ouverture limite le flux d’énergie vapeur vers la turbine. Sa fermeture coupe l’apport à l’arbre, dont la rotation décroît.',
        ],
        'seal',
        [
          [
            'seat',
            ['Valve seat & plug', 'Siège et clapet'],
            [
              'The moving plug changes the flow passage through the seat. Forces and leak-tightness are not simulated.',
              'Le clapet mobile modifie le passage dans le siège. Les efforts et l’étanchéité ne sont pas simulés.',
            ],
            'nozzle',
          ],
        ],
      ],
    ],
  ],
  [
    'generator',
    ['Generator', 'Alternateur'],
    [
      'Shaft power becomes electrical output when a load is connected. The model uses an isolated load, not a synchronized grid.',
      'La puissance mécanique devient électrique lorsqu’une charge est connectée. Le modèle utilise une charge isolée, sans réseau synchronisé.',
    ],
    'generator',
    [
      [
        'rotor',
        ['Field rotor', 'Rotor inducteur'],
        [
          'The rotating field sweeps past the stator windings. The shaft supplies the mechanical energy delivered to the load.',
          'Le champ tournant passe devant les bobinages du stator. L’arbre fournit l’énergie mécanique délivrée à la charge.',
        ],
        'rotor',
        [
          coil(),
          [
            'shaft',
            ['Rotor shaft', 'Arbre du rotor'],
            [
              'The shaft links the turbine and rotor. Its kinetic energy is part of the global energy balance.',
              'L’arbre relie turbine et rotor. Son énergie cinétique appartient au bilan global.',
            ],
            'shaft',
            [bearing()],
          ],
        ],
      ],
      [
        'stator',
        ['Armature stator', 'Stator induit'],
        [
          'Stationary windings receive an induced voltage from the moving magnetic field. Connecting a load draws current and creates a resisting torque.',
          'Les bobinages fixes reçoivent une tension induite par le champ mobile. La charge appelle un courant et crée un couple résistant.',
        ],
        'stator',
        [
          coil(),
          [
            'core',
            ['Laminated core', 'Circuit magnétique feuilleté'],
            [
              'Thin insulated steel sheets guide magnetic flux and limit eddy currents. Magnetic saturation is not simulated.',
              'Des tôles d’acier isolées guident le flux et limitent les courants de Foucault. La saturation magnétique n’est pas simulée.',
            ],
            'grid',
            [
              [
                'lamination',
                ['Lamination', 'Tôle magnétique'],
                [
                  'An insulating coating separates neighbouring sheets. This interruption reduces circulating eddy currents.',
                  'Un revêtement isolant sépare les tôles voisines et réduit les courants de Foucault.',
                ],
                'wall',
              ],
            ],
          ],
        ],
      ],
      [
        'airgap',
        ['Air gap', 'Entrefer'],
        [
          'This narrow clearance allows rotation while magnetic flux crosses between rotor and stator. It is enlarged for visibility.',
          'Ce faible espace permet la rotation et le passage du flux entre rotor et stator. Il est agrandi pour la lisibilité.',
        ],
        'gap',
      ],
    ],
  ],
  [
    'condenser',
    ['Condenser', 'Condenseur'],
    [
      'Exhaust steam gives heat to cold tubes and becomes liquid. Cooling water never mixes with the secondary water.',
      'La vapeur détendue cède sa chaleur aux tubes froids et redevient liquide. L’eau de refroidissement ne se mélange jamais au secondaire.',
    ],
    'condenser',
    [
      [
        'bundle',
        ['Cooling-tube bundle', 'Faisceau de refroidissement'],
        [
          'Cooling water runs through many parallel tubes. Exhaust steam condenses on their outer surfaces.',
          'L’eau de refroidissement traverse des tubes parallèles. La vapeur se condense sur leur surface extérieure.',
        ],
        'bundle',
        [tube()],
      ],
      [
        'waterbox',
        ['Water box', 'Boîte à eau'],
        [
          'The box distributes cooling water into the tubes and collects it at the outlet.',
          'La boîte distribue l’eau de refroidissement dans les tubes puis la collecte en sortie.',
        ],
        'waterbox',
        [
          [
            'partition',
            ['Partition & tube plate', 'Cloison et plaque tubulaire'],
            [
              'Partitions separate inlet and outlet passages; the tube plate separates cooling water from condensing steam.',
              'Les cloisons séparent entrée et sortie ; la plaque tubulaire sépare l’eau froide de la vapeur.',
            ],
            'grid',
            [
              [
                'seal',
                ['Tube seal', 'Joint de tube'],
                [
                  'A sealed connection keeps the cooling and secondary circuits separate.',
                  'Une liaison étanche maintient la séparation des circuits froid et secondaire.',
                ],
                'seal',
              ],
            ],
          ],
        ],
      ],
      [
        'hotwell',
        ['Condensate hotwell', 'Puits de condensats'],
        [
          'Condensed secondary water collects below the tube bundle before returning to the feed pump. The water level is not solved.',
          'L’eau secondaire condensée est collectée sous le faisceau avant le retour vers la pompe. Le niveau n’est pas résolu.',
        ],
        'waterbox',
        [
          [
            'outlet',
            ['Condensate outlet', 'Sortie des condensats'],
            [
              'The outlet connects collected liquid to the feed path. Mass return is balanced with the steam flow in the model.',
              'La sortie raccorde le liquide collecté au retour alimentaire. Le débit de retour équilibre celui de la vapeur dans le modèle.',
            ],
            'tube',
          ],
        ],
      ],
    ],
  ],
  [
    'feed',
    ['Feed pump', 'Pompe alimentaire'],
    [
      'The pump returns condensed secondary water to the steam generator. This closes the water–steam cycle.',
      'La pompe renvoie l’eau secondaire condensée vers le générateur de vapeur et ferme le cycle eau–vapeur.',
    ],
    'pump',
    pump(true),
  ],
  [
    'cooling',
    ['Cooling system', 'Refroidissement'],
    [
      'The cooling circuit carries waste heat from the condenser to an ideal 20 °C heat sink. The illustrated cooler is schematic.',
      'Le circuit emporte la chaleur du condenseur vers une source froide idéale à 20 °C. Le refroidisseur dessiné est schématique.',
    ],
    'cooling',
    [
      [
        'exchanger',
        ['Heat-rejection module', 'Module de rejet thermique'],
        [
          'Warm cooling water gives heat to the environment. The model represents this with a single transfer coefficient.',
          'L’eau de refroidissement cède sa chaleur à l’environnement. Le modèle utilise un coefficient d’échange global.',
        ],
        'condenser',
        [
          [
            'bundle',
            ['Cooling tubes', 'Tubes de refroidissement'],
            [
              'The tubes provide exchange area. This dry-cooler drawing is not a specification of a full-scale cooling installation.',
              'Les tubes offrent une surface d’échange. Ce dessin d’aéroréfrigérant sec ne décrit pas une installation réelle complète.',
            ],
            'bundle',
            [tube()],
          ],
          [
            'fin',
            ['Heat-transfer fins', 'Ailettes d’échange'],
            [
              'Thin fins increase the surface exposed to air. Airflow and fin efficiency are not calculated separately.',
              'De fines ailettes augmentent la surface exposée à l’air. Le débit d’air et le rendement des ailettes ne sont pas calculés séparément.',
            ],
            'grid',
            [
              [
                'surface',
                ['Fin surface', 'Surface d’ailette'],
                [
                  'Heat spreads through the solid and crosses into the surrounding air. This microscopic boundary is not resolved.',
                  'La chaleur se diffuse dans le solide puis passe à l’air environnant. Cette interface n’est pas résolue.',
                ],
                'wall',
              ],
            ],
          ],
        ],
      ],
      [
        'fan',
        ['Fan unit', 'Ventilateur'],
        [
          'The fan drives air through the exchanger. Its animation follows the cooling setting; no separate air circuit is computed.',
          'Le ventilateur entraîne l’air dans l’échangeur. Son animation suit la commande de refroidissement ; aucun circuit d’air distinct n’est calculé.',
        ],
        'fan',
        [blade(), motor()],
      ],
      [
        'return',
        ['Cold-water return', 'Retour d’eau froide'],
        [
          'Cooled water returns to the condenser. It remains separate from both the primary and secondary circuits.',
          'L’eau refroidie retourne au condenseur, séparée des circuits primaire et secondaire.',
        ],
        'tube',
        [tube()],
      ],
    ],
  ],
];
export const parts = new Map<string, Part>();
function make(spec: Spec, parent?: Part): Part {
  const [key, name, role, kind, children = []] = spec;
  const id = parent ? `${parent.id}/${key}` : key;
  const part: Part = {
    id,
    name,
    role,
    kind,
    children: [],
    parent,
    equipment: parent?.equipment ?? key,
  };
  parts.set(id, part);
  part.children = children.map((child) => make(child, part));
  return part;
}
export const roots = specs.map((s) => make(s));
export const tr = (pair: Pair, lang: Lang) => pair[lang === 'en' ? 0 : 1];
export function ancestry(part: Part): Part[] {
  return part.parent ? [...ancestry(part.parent), part] : [part];
}
