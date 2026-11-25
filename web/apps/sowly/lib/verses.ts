/**
 * Heures de prière et versets — Bible Louis Segond 1910 (LSG).
 * Fichier généré par web/apps/sowly/scripts/versets.mjs : ne pas modifier à
 * la main. Deux copies identiques (app et Edge Function).
 */

export interface Verse { ref: string; text: string }

export const PRAYER_HOURS = [0, 4, 6, 12, 15, 18, 20] as const;

export const VERSES: Readonly<Record<number, readonly Verse[]>> = {
  "0": [
    {
      "ref": "Psaume 119:62",
      "text": "Au milieu de la nuit je me lève pour te louer, À cause des jugements de ta justice."
    },
    {
      "ref": "Actes 16:25",
      "text": "Vers le milieu de la nuit, Paul et Silas priaient et chantaient les louanges de Dieu, et les prisonniers les entendaient."
    },
    {
      "ref": "Luc 6:12",
      "text": "En ce temps-là, Jésus se rendit sur la montagne pour prier, et il passa toute la nuit à prier Dieu."
    },
    {
      "ref": "Psaume 42:9",
      "text": "Le jour, l’Éternel m’accordait sa grâce ; La nuit, je chantais ses louanges, J’adressais une prière au Dieu de ma vie."
    }
  ],
  "4": [
    {
      "ref": "Marc 1:35",
      "text": "Vers le matin, pendant qu’il faisait encore très sombre, il se leva, et sortit pour aller dans un lieu désert, où il pria."
    },
    {
      "ref": "Psaume 119:147",
      "text": "Je devance l’aurore et je crie ; J’espère en tes promesses."
    },
    {
      "ref": "Psaume 63:2",
      "text": "Ô Dieu ! tu es mon Dieu, je te cherche ; Mon âme a soif de toi, mon corps soupire après toi, Dans une terre aride, desséchée, sans eau."
    }
  ],
  "6": [
    {
      "ref": "Psaume 5:4",
      "text": "Éternel ! le matin tu entends ma voix ; Le matin je me tourne vers toi, et je regarde."
    },
    {
      "ref": "Lamentations 3:22-23",
      "text": "Les bontés de l’Éternel ne sont pas épuisées, Ses compassions ne sont pas à leur terme ; Elles se renouvellent chaque matin. Oh ! que ta fidélité est grande !"
    },
    {
      "ref": "Psaume 143:8",
      "text": "Fais-moi dès le matin entendre ta bonté ! Car je me confie en toi. Fais-moi connaître le chemin où je dois marcher ! Car j’élève à toi mon âme."
    },
    {
      "ref": "Psaume 90:14",
      "text": "Rassasie-nous chaque matin de ta bonté, Et nous serons toute notre vie dans la joie et l’allégresse."
    },
    {
      "ref": "Psaume 92:2-3",
      "text": "Il est beau de louer l’Éternel, Et de célébrer ton nom, ô Très-Haut ! D’annoncer le matin ta bonté, Et ta fidélité pendant les nuits."
    }
  ],
  "12": [
    {
      "ref": "Psaume 55:18",
      "text": "Le soir, le matin, et à midi, je soupire et je gémis, Et il entendra ma voix."
    },
    {
      "ref": "Actes 10:9",
      "text": "Le lendemain, comme ils étaient en route, et qu’ils approchaient de la ville, Pierre monta sur le toit, vers la sixième heure, pour prier."
    },
    {
      "ref": "Philippiens 4:6",
      "text": "Ne vous inquiétez de rien ; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces."
    }
  ],
  "15": [
    {
      "ref": "Actes 3:1",
      "text": "Pierre et Jean montaient ensemble au temple, à l’heure de la prière : c’était la neuvième heure."
    },
    {
      "ref": "Hébreux 4:16",
      "text": "Approchons-nous donc avec assurance du trône de la grâce, afin d’obtenir miséricorde et de trouver grâce, pour être secourus dans nos besoins."
    },
    {
      "ref": "Matthieu 27:46",
      "text": "Et vers la neuvième heure, Jésus s’écria d’une voix forte : Éli, Éli, lama sabachthani ? c’est-à-dire : Mon Dieu, mon Dieu, pourquoi m’as-tu abandonné ?"
    }
  ],
  "18": [
    {
      "ref": "Psaume 141:2",
      "text": "Que ma prière soit devant ta face comme l’encens, Et l’élévation de mes mains comme l’offrande du soir !"
    },
    {
      "ref": "Luc 24:29",
      "text": "Mais ils le pressèrent, en disant : Reste avec nous, car le soir approche, le jour est sur son déclin. Et il entra, pour rester avec eux."
    },
    {
      "ref": "Psaume 113:3",
      "text": "Du lever du soleil jusqu’à son couchant, Que le nom de l’Éternel soit célébré !"
    }
  ],
  "20": [
    {
      "ref": "Psaume 4:9",
      "text": "Je me couche et je m’endors en paix, Car toi seul, ô Éternel ! tu me donnes la sécurité dans ma demeure."
    },
    {
      "ref": "Psaume 134:2",
      "text": "Élevez vos mains vers le sanctuaire, Et bénissez l’Éternel !"
    },
    {
      "ref": "Psaume 16:7",
      "text": "Je bénis l’Éternel, mon conseiller ; La nuit même mon cœur m’exhorte."
    },
    {
      "ref": "Psaume 63:7",
      "text": "Lorsque je pense à toi sur ma couche, Je médite sur toi pendant les veilles de la nuit."
    }
  ]
};

/** Le verset du jour pour une heure : il change chaque jour, le même sur tous les appareils. */
export function verseFor(hour: number, day: string): Verse {
  const list = VERSES[hour] ?? VERSES[0]!;
  const n = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return list[n % list.length]!;
}

/** « 4 h », « Midi », « Minuit ». */
export function hourLabel(hour: number): string {
  return hour === 0 ? 'Minuit' : hour === 12 ? 'Midi' : `${hour} h`;
}
