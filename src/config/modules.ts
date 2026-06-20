import {
  BadgeEuro,
  Boxes,
  BriefcaseBusiness,
  CakeSlice,
  ClipboardCheck,
  CookingPot,
  Croissant,
  type LucideIcon,
} from "lucide-react";

export type ModuleId =
  | "hygiene"
  | "boulangerie"
  | "patisserie"
  | "snacking"
  | "vente"
  | "stock"
  | "gestion";

export type ModuleStatus = "Disponible" | "En développement" | "À venir";

export type BakeryModule = {
  id: ModuleId;
  title: string;
  description: string;
  status: ModuleStatus;
  icon: LucideIcon;
  color: string;
  softColor: string;
  features: string[];
};

export const bakeryModules: BakeryModule[] = [
  {
    id: "hygiene",
    title: "Hygiène",
    description: "Pilotez le PMS, la traçabilité et tous les contrôles sanitaires de l’atelier.",
    status: "Disponible",
    icon: ClipboardCheck,
    color: "#0d6144",
    softColor: "#e3f2e9",
    features: ["Pack hygiène", "PMS / HACCP", "Traçabilité", "Températures", "Nettoyage", "Non-conformités", "Contrôles sanitaires", "Registres obligatoires"],
  },
  {
    id: "boulangerie",
    title: "Boulangerie",
    description: "Organisez les fournées, les recettes, les pétrins et les prévisions de production.",
    status: "En développement",
    icon: Croissant,
    color: "#a55d16",
    softColor: "#fff0dc",
    features: ["Fiches de production pain", "Calculs de pétrin", "Planning de pousse / blocage", "Recettes boulangerie", "Prévisions de production", "Rendements", "Coûts de revient pain"],
  },
  {
    id: "patisserie",
    title: "Pâtisserie",
    description: "Centralisez les recettes, productions, DLC et coûts de vos créations sucrées.",
    status: "À venir",
    icon: CakeSlice,
    color: "#a13f66",
    softColor: "#fbe8f0",
    features: ["Recettes pâtisserie", "Fiches de production", "Surgélation / décongélation", "DLC internes", "Entremets", "Mignardises", "Pièces montées", "Coûts de revient pâtisserie"],
  },
  {
    id: "snacking",
    title: "Snacking",
    description: "Suivez la production salée, les DLC courtes, les étiquettes et les ventes prévues.",
    status: "À venir",
    icon: CookingPot,
    color: "#b34a32",
    softColor: "#fce9e4",
    features: ["Production salé", "Sandwichs / salades / quiches", "DLC courtes", "Traçabilité renforcée", "Étiquettes produits", "Prévisions de vente snacking"],
  },
  {
    id: "vente",
    title: "Vente",
    description: "Gérez les prix, la vitrine, les promotions et les indicateurs commerciaux.",
    status: "À venir",
    icon: BadgeEuro,
    color: "#2c6594",
    softColor: "#e7f1fa",
    features: ["Prix de vente", "Étiquettes vitrine", "Promotions", "Produits du jour", "Suivi des ventes", "Panier moyen", "Actions commerciales"],
  },
  {
    id: "stock",
    title: "Stock",
    description: "Maîtrisez les matières, fournisseurs, lots, alertes et mouvements de stock.",
    status: "À venir",
    icon: Boxes,
    color: "#6c5598",
    softColor: "#eee9f8",
    features: ["Matières premières", "Fournisseurs", "Prix d’achat", "Lots", "DLC / DDM", "Alertes stock bas", "Inventaires", "Historique des entrées / sorties"],
  },
  {
    id: "gestion",
    title: "Gestion",
    description: "Analysez les coûts, marges, charges, chiffre d’affaires et rentabilité.",
    status: "À venir",
    icon: BriefcaseBusiness,
    color: "#3e6970",
    softColor: "#e5f0f1",
    features: ["Coûts de revient", "Marges", "Masse salariale", "Charges fixes", "Tableaux de bord", "Suivi CA", "Rentabilité par famille produit"],
  },
];

export const moduleById = Object.fromEntries(
  bakeryModules.map((module) => [module.id, module]),
) as Record<ModuleId, BakeryModule>;
