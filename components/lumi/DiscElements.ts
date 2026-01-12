// DISC Color to Element and Spirit Animal mapping
export interface DiscElement {
  element: string;
  elementFr: string;
  icon: string;
  animal: string;
  animalFr: string;
  animalEmoji: string;
  description: string;
  descriptionFr: string;
  colorClass: string;
  borderClass: string;
  textClass: string;
}

export const DISC_ELEMENTS: Record<string, DiscElement> = {
  rouge: {
    element: 'Fire',
    elementFr: 'Feu',
    icon: '🔥',
    animal: 'Lion',
    animalFr: 'Lion',
    animalEmoji: '🦁',
    description: 'You are Fire: direct, driven, and action-oriented. You move fast, take decisions, and push things forward.',
    descriptionFr: 'Tu es Feu : direct, déterminé et orienté action. Tu agis vite, prends des décisions et fais avancer les choses.',
    colorClass: 'red',
    borderClass: 'red',
    textClass: 'red',
  },
  jaune: {
    element: 'Air',
    elementFr: 'Air',
    icon: '🌬️',
    animal: 'Parrot',
    animalFr: 'Perroquet',
    animalEmoji: '🦜',
    description: 'You are Air: creative, communicative, and full of ideas. You bring innovation, connect people, and keep the energy high.',
    descriptionFr: 'Tu es Air : créatif, communicatif et plein d\'idées. Tu apportes l\'innovation, connectes les gens et maintiens l\'énergie.',
    colorClass: 'yellow',
    borderClass: 'yellow',
    textClass: 'yellow',
  },
  vert: {
    element: 'Earth',
    elementFr: 'Terre',
    icon: '🌱',
    animal: 'Deer',
    animalFr: 'Cerf',
    animalEmoji: '🦌',
    description: 'You are Earth: stable, supportive, and harmonious. You bring calm, loyalty, and team spirit.',
    descriptionFr: 'Tu es Terre : stable, solidaire et harmonieux. Tu apportes le calme, la loyauté et l\'esprit d\'équipe.',
    colorClass: 'green',
    borderClass: 'green',
    textClass: 'green',
  },
  bleu: {
    element: 'Water',
    elementFr: 'Eau',
    icon: '💧',
    animal: 'Owl',
    animalFr: 'Hibou',
    animalEmoji: '🦉',
    description: 'You are Water: analytical, deep, and precise. You think before acting, go deep, and bring structure.',
    descriptionFr: 'Tu es Eau : analytique, profond et précis. Tu réfléchis avant d\'agir, vas en profondeur et apportes la structure.',
    colorClass: 'blue',
    borderClass: 'blue',
    textClass: 'blue',
  },
};

