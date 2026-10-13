import type { Tier } from "@/modules/relevance/types";

/**
 * The marketplace corpus (spec § The corpus fixture): the first organic results of six grocery
 * searches on Mercado Livre and Amazon Now, captured once on 2026-10-12 with a throwaway
 * Playwright script (sponsored cards skipped, the first 20 or every card when fewer).
 * Screenshots of every page: apps/api/test/marketplace/<site>-<term>.png. Ordered by
 * (site, term, position) and inserted in that order, so the shortlist's id tie-break is
 * reproducible. The labels below are approved by the human, one by one.
 */
export type CorpusSite = "mercado-livre" | "amazon-now";
export type CorpusTerm = "banana" | "pão" | "frango" | "carne" | "uva" | "papel higiênico";

export interface CorpusRow {
  site: CorpusSite;
  term: CorpusTerm; // the search that listed it
  position: number; // 1-based, sponsored cards skipped
  name: string; // full listing title, verbatim
  priceCents: number; // current price; 0 when the card showed none
  url: string;
}

export interface CorpusPage {
  site: CorpusSite;
  term: CorpusTerm;
  searchUrl: string;
  capturedAt: string; // ISO date
  route: "playwright" | "claude-in-chrome";
}

export const SITE_SHOP_NAME: Record<CorpusSite, string> = {
  "mercado-livre": "Mercado Livre",
  "amazon-now": "Amazon Now",
};

export const TUNING_TERMS: readonly CorpusTerm[] = ["banana", "pão", "frango", "carne"];
export const HOLDOUT_TERMS: readonly CorpusTerm[] = ["uva", "papel higiênico"];

export const CORPUS_PAGES: readonly CorpusPage[] = [
  {
    site: "mercado-livre",
    term: "banana",
    searchUrl: "https://lista.mercadolivre.com.br/banana",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "mercado-livre",
    term: "pão",
    searchUrl: "https://lista.mercadolivre.com.br/p%C3%A3o",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "mercado-livre",
    term: "frango",
    searchUrl: "https://lista.mercadolivre.com.br/frango",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "mercado-livre",
    term: "carne",
    searchUrl: "https://lista.mercadolivre.com.br/carne",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "mercado-livre",
    term: "uva",
    searchUrl: "https://lista.mercadolivre.com.br/uva",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    searchUrl: "https://lista.mercadolivre.com.br/papel%20higi%C3%AAnico",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "amazon-now",
    term: "banana",
    searchUrl: "https://www.amazon.com.br/s?k=banana&i=amazonnow",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "amazon-now",
    term: "pão",
    searchUrl: "https://www.amazon.com.br/s?k=p%C3%A3o&i=amazonnow",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "amazon-now",
    term: "frango",
    searchUrl: "https://www.amazon.com.br/s?k=frango&i=amazonnow",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "amazon-now",
    term: "carne",
    searchUrl: "https://www.amazon.com.br/s?k=carne&i=amazonnow",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "amazon-now",
    term: "uva",
    searchUrl: "https://www.amazon.com.br/s?k=uva&i=amazonnow",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    searchUrl: "https://www.amazon.com.br/s?k=papel%20higi%C3%AAnico&i=amazonnow",
    capturedAt: "2026-10-13",
    route: "playwright",
  },
];

export const CORPUS: readonly CorpusRow[] = [
  {
    site: "mercado-livre",
    term: "banana",
    position: 1,
    name: "Extima Lata Banana 600g",
    priceCents: 22529,
    url: "https://www.mercadolivre.com.br/extima-lata-banana-600g/p/MLB20545965",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 2,
    name: "Fini Mini Bananas Balas de Gelatina 12x15 - Festas, Lembrancinhas e Decorações",
    priceCents: 1147,
    url: "https://www.mercadolivre.com.br/fini-mini-bananas-balas-de-gelatina-12x15-festas-lembrancinhas-e-decoracoes/p/MLB19542247",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 3,
    name: "Fruta Pocket - Manga, banana, abacaxi, açaí e maçã - 20g - Liofilizada - Solo Snacks",
    priceCents: 1699,
    url: "https://www.mercadolivre.com.br/fruta-pocket-manga-banana-abacaxi-acai-e-maca-20g-liofilizada-solo-snacks/p/MLB28296947",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 4,
    name: "Bala de Banana Oliveira 500g Sem Glúten Lactose",
    priceCents: 1620,
    url: "https://www.mercadolivre.com.br/bala-de-banana-oliveira-500g-sem-gluten-lactose/p/MLB19131419",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 5,
    name: "Mudas De Banana Caturra / Banana Mais Doce Do Brasil",
    priceCents: 17100,
    url: "https://www.mercadolivre.com.br/mudas-de-banana-caturra--banana-mais-doce-do-brasil/up/MLBU3087633705",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 6,
    name: "Bananada Zero Naturafruti 10un De 25g - Com Ameixa",
    priceCents: 1799,
    url: "https://www.mercadolivre.com.br/bananada-zero-naturafruti-10un-de-25g-com-ameixa/p/MLB21401913",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 7,
    name: "10 Mudas De Banana Caturra / Banana Mais Doce Do Brasil",
    priceCents: 33250,
    url: "https://www.mercadolivre.com.br/10-mudas-de-banana-caturra--banana-mais-doce-do-brasil/up/MLBU3092976218",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 8,
    name: "Bala Mastigável De Frutas Sortidas Florestal 500g Com 100un",
    priceCents: 1180,
    url: "https://www.mercadolivre.com.br/bala-mastigavel-de-frutas-sortidas-florestal-500g-com-100un/p/MLB26927759",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 9,
    name: "Bananinha Cremosa Oliveira Zero Açúcar Sem Glúten 24x22g",
    priceCents: 4823,
    url: "https://www.mercadolivre.com.br/bananinha-cremosa-oliveira-zero-acucar-sem-gluten-24x22g/p/MLB34698351",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 10,
    name: "BANANA DA TERRA ORG KG",
    priceCents: 2632,
    url: "https://www.mercadolivre.com.br/banana-da-terra-org-kg/p/MLB59108671",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 11,
    name: "Kit Fini 60 Unidades De Balas de Gelatina Tubes - Sabores Sortidos para Festas e Lembrancinhas",
    priceCents: 6020,
    url: "https://www.mercadolivre.com.br/kit-fini-60-unidades-de-balas-de-gelatina-tubes-sabores-sortidos-para-festas-e-lembrancinhas/p/MLB28435310",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 12,
    name: "2kg Banana Prata Verde Orgânica",
    priceCents: 4999,
    url: "https://www.mercadolivre.com.br/2kg-banana-prata-verde-organica/up/MLBU3336288556",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 13,
    name: "Bananinha Cremosa Zero Açúcar 24 x30g",
    priceCents: 4699,
    url: "https://www.mercadolivre.com.br/bananinha-cremosa-zero-acucar-24-x30g/p/MLB51695566",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 14,
    name: "Banana Zero 180g Dacolônia",
    priceCents: 2335,
    url: "https://www.mercadolivre.com.br/banana-zero-180g-dacolonia/up/MLBU3743539029",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 15,
    name: "Bananada Zero Açúcar NaturaFruti 250g Sem Glúten e Lactose Saudável",
    priceCents: 1699,
    url: "https://www.mercadolivre.com.br/bananada-zero-acucar-naturafruti-250g-sem-gluten-e-lactose-saudavel/p/MLB21825855",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 16,
    name: "Banana Copo Vitória Pote C/20 Unidades",
    priceCents: 4202,
    url: "https://www.mercadolivre.com.br/banana-copo-vitoria-pote-c20-unidades/p/MLB2106890893",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 17,
    name: "Fini Balas De Gelatina Bananas 500g",
    priceCents: 2289,
    url: "https://www.mercadolivre.com.br/fini-balas-de-gelatina-bananas-500g/p/MLB66695214",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 18,
    name: "Banana Verde Em Pó 500 Gramas Qualidade Premium",
    priceCents: 2200,
    url: "https://www.mercadolivre.com.br/banana-verde-em-po-500-gramas-qualidade-premium/up/MLBU1470534833",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 19,
    name: "Display Bananinha Bananafruti - 24 X 25 G",
    priceCents: 4472,
    url: "https://www.mercadolivre.com.br/display-bananinha-bananafruti-24-x-25-g/p/MLB28870770",
  },
  {
    site: "mercado-livre",
    term: "banana",
    position: 20,
    name: "Paraibuna Bananinha Tradicional C/ Açúcar 36g Dp 20 Unidades",
    priceCents: 6899,
    url: "https://www.mercadolivre.com.br/paraibuna-bananinha-tradicional-c-acucar-36g-dp-20-unidades/p/MLB19774737",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 1,
    name: "Kit 3 Pães De Forma Tradicional Visconti 400g",
    priceCents: 2380,
    url: "https://www.mercadolivre.com.br/kit-3-paes-de-forma-tradicional-visconti-400g/p/MLB39649468",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 2,
    name: "Pão Francês sem Glúten Zero Lactose Schär Bandeja 100g",
    priceCents: 1777,
    url: "https://www.mercadolivre.com.br/pao-frances-sem-gluten-zero-lactose-schr-bandeja-100g/p/MLB24842514",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 3,
    name: "Pãozinho de Batata Belive Sem Glúten, Leite e Lactose 198 g",
    priceCents: 1463,
    url: "https://www.mercadolivre.com.br/paozinho-de-batata-belive-sem-gluten-leite-e-lactose-198-g/p/MLB38054744",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 4,
    name: "Pão de Forma Sem Glúten Sem Leite Sem Lactose Belive 400g",
    priceCents: 1743,
    url: "https://www.mercadolivre.com.br/pao-de-forma-sem-gluten-sem-leite-sem-lactose-belive-400g/p/MLB26916213",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 5,
    name: "Pão de forma Sem Glúten Multigrãos Zero Lactose Sem Leite Belive 400g",
    priceCents: 1890,
    url: "https://www.mercadolivre.com.br/pao-de-forma-sem-gluten-multigraos-zero-lactose-sem-leite-belive-400g/p/MLB26916215",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 6,
    name: "Pão De Forma De Batata-doce Sem Glúten Sem Leite Belive",
    priceCents: 2290,
    url: "https://www.mercadolivre.com.br/pao-de-forma-de-batata-doce-sem-gluten-sem-leite-belive/p/MLB74690578",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 7,
    name: "O Pão Ciabatta Tradicional Leviassa, não é congelado. Feito com ingredientes naturais, sem conservantes ou açucares. Pronto em até 8min. Pode ser armazenado em temperatura ambiente por até 120 dias.",
    priceCents: 1490,
    url: "https://www.mercadolivre.com.br/o-pao-ciabatta-tradicional-leviassa-nao-e-congelado-feito-com-ingredientes-naturais-sem-conservantes-ou-acucares-pronto-em-ate-8min-pode-ser-armazenado-em-temperatura-ambiente-por-ate-120-dias/p/MLB47715153",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 8,
    name: "Pão de Forma Integral Bauducco 390g Macio Fatiado Fibras",
    priceCents: 929,
    url: "https://www.mercadolivre.com.br/pao-de-forma-integral-bauducco-390g-macio-fatiado-fibras/p/MLB19467553",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 9,
    name: "Torrada Tradicional Salgada Bauducco Kit Com 30 Sachês 15g",
    priceCents: 2695,
    url: "https://www.mercadolivre.com.br/torrada-tradicional-salgada-bauducco-kit-com-30-saches-15g/p/MLB47442115",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 10,
    name: "Bisnaguinha Visconti Textura Macio D+ 240g",
    priceCents: 651,
    url: "https://www.mercadolivre.com.br/bisnaguinha-visconti-textura-macio-d-240g/p/MLB30188981",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 11,
    name: "Pão De Cebola Sem Glúten Sem Lactose 200g Belive",
    priceCents: 1798,
    url: "https://www.mercadolivre.com.br/pao-de-cebola-sem-gluten-sem-lactose-200g-belive/p/MLB47607746",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 12,
    name: "Pãozinho de Cebola Sem Glúten Sem Leite Zero Lactose Belive 200g",
    priceCents: 1860,
    url: "https://www.mercadolivre.com.br/paozinho-de-cebola-sem-gluten-sem-leite-zero-lactose-belive-200g/p/MLB47886352",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 13,
    name: "Bisnaguinha Bauducco Tradicional Leve E Macia 260g",
    priceCents: 781,
    url: "https://www.mercadolivre.com.br/bisnaguinha-bauducco-tradicional-leve-e-macia-260g/p/MLB18953429",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 14,
    name: "Pão de Mel Panco Pacote 500g",
    priceCents: 1234,
    url: "https://www.mercadolivre.com.br/pao-de-mel-panco-pacote-500g/p/MLB18090274",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 15,
    name: "Pão de Forma Visconti Tradicional Macio D+ 400g",
    priceCents: 689,
    url: "https://www.mercadolivre.com.br/pao-de-forma-visconti-tradicional-macio-d-400g/p/MLB18056250",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 16,
    name: "Bisnaguinhas Sem Glúten Sem Leite Zero Lactose Belive 200g",
    priceCents: 1612,
    url: "https://www.mercadolivre.com.br/bisnaguinhas-sem-gluten-sem-leite-zero-lactose-belive-200g/p/MLB21090504",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 17,
    name: "Kit 2 Pão De Forma Tradicional Visconti 400g",
    priceCents: 1658,
    url: "https://www.mercadolivre.com.br/kit-2-pao-de-forma-tradicional-visconti-400g/p/MLB47709910",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 18,
    name: "Torrada Integral Bauducco De Forma 284g",
    priceCents: 1049,
    url: "https://www.mercadolivre.com.br/torrada-integral-bauducco-de-forma-284g/up/MLBU3779843439",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 19,
    name: "Pão para Hambúrguer Bauducco Macio com Embalagem de 4 Unid 200g",
    priceCents: 895,
    url: "https://www.mercadolivre.com.br/pao-para-hamburguer-bauducco-macio-com-embalagem-de-4-unid-200g/p/MLB29550093",
  },
  {
    site: "mercado-livre",
    term: "pão",
    position: 20,
    name: "Pão de Sanduíche Multigrãos sem Glúten Jasmine Pacote 350g",
    priceCents: 2199,
    url: "https://www.mercadolivre.com.br/pao-de-sanduiche-multigraos-sem-gluten-jasmine-pacote-350g/p/MLB16196203",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 1,
    name: "16 Beef Jerky Protein Snacks Carne Sweet & Hot Jack Links",
    priceCents: 21040,
    url: "https://www.mercadolivre.com.br/16-beef-jerky-protein-snacks-carne-sweet-hot-jack-links/p/MLB2114900574",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 2,
    name: "1 Beef Jerky Protein Snacks Carne Sabor Original Jack Links",
    priceCents: 1499,
    url: "https://www.mercadolivre.com.br/1-beef-jerky-protein-snacks-carne-sabor-original-jack-links/up/MLBU1734199656",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 3,
    name: "Strogonoff De Frango Vapza Só Aquecer 250g",
    priceCents: 3699,
    url: "https://www.mercadolivre.com.br/strogonoff-de-frango-vapza-so-aquecer-250g/p/MLB61928441",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 4,
    name: "Tradicional Codeguim Receita Italiana - 400g Di Callani",
    priceCents: 3694,
    url: "https://www.mercadolivre.com.br/tradicional-codeguim-receita-italiana--400g-di-callani/up/MLBU4503734916",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 5,
    name: "6 Beef Jerky Protein Snacks Carne Sabor Sweet Hot Jack Links",
    priceCents: 7899,
    url: "https://www.mercadolivre.com.br/6-beef-jerky-protein-snacks-carne-sabor-sweet-hot-jack-links/p/MLB2114906462",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 6,
    name: "6 Beef Jerky Protein Snacks Carne Sabor Teriyaki Jack Links",
    priceCents: 7899,
    url: "https://www.mercadolivre.com.br/6-beef-jerky-protein-snacks-carne-sabor-teriyaki-jack-links/p/MLB2095504226",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 7,
    name: "6 Beef Jerky Protein Snacks Carne Sabor Original Jack Links",
    priceCents: 7899,
    url: "https://www.mercadolivre.com.br/6-beef-jerky-protein-snacks-carne-sabor-original-jack-links/up/MLBU1763471378",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 8,
    name: "Beef Jerky Protein Snacks Carne Jack Links Kit 2 Sabores",
    priceCents: 3299,
    url: "https://www.mercadolivre.com.br/beef-jerky-protein-snacks-carne-jack-links-kit-2-sabores/p/MLB44983397",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 9,
    name: "6 Beef Jerky Protein Snacks Carne Sabor Original Jack Links",
    priceCents: 7869,
    url: "https://www.mercadolivre.com.br/6-beef-jerky-protein-snacks-carne-sabor-original-jack-links/p/MLB2116932058",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 10,
    name: "16 Beef Jerky Protein Snacks Carne Sabor Teriyaki Jack Links",
    priceCents: 20369,
    url: "https://www.mercadolivre.com.br/16-beef-jerky-protein-snacks-carne-sabor-teriyaki-jack-links/p/MLB70315377",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 11,
    name: "Peito De Frango Desfiado Cozido Vapza 400g",
    priceCents: 4365,
    url: "https://www.mercadolivre.com.br/peito-de-frango-desfiado-cozido-vapza-400g/p/MLB23972996",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 12,
    name: "Linguiça Tipo Calabresa Perdigão Defumação Tradicional 1kg",
    priceCents: 4398,
    url: "https://www.mercadolivre.com.br/linguica-tipo-calabresa-perdigao-defumacao-tradicional-1kg/p/MLB77412672",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 13,
    name: "Caixa De Frango Desfiado Cozido Nutrue Com 5 Pacotes De 400",
    priceCents: 15990,
    url: "https://www.mercadolivre.com.br/caixa-de-frango-desfiado-cozido-nutrue-com-5-pacotes-de-400/p/MLB74559681",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 14,
    name: "Linguiça Tipo Calabresa - Pacote 2kg",
    priceCents: 9997,
    url: "https://www.mercadolivre.com.br/linguica-tipo-calabresa--pacote-2kg/up/MLBU5458563432",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 15,
    name: "Kit 2 Peito Frango Vapza Desfiado Cozido Vapor 800 G",
    priceCents: 10033,
    url: "https://www.mercadolivre.com.br/kit-2-peito-frango-vapza-desfiado-cozido-800-g-cozido-vapor/p/MLB2082396907",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 16,
    name: "16 Beef Jerky Protein Snacks Carne Sabor Teriyaki Jack Links",
    priceCents: 19999,
    url: "https://www.mercadolivre.com.br/16-beef-jerky-protein-snacks-carne-sabor-teriyaki-jack-links/p/MLB44975873",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 17,
    name: "Frango Caipira Superbom 370g Kit 6 Unidades",
    priceCents: 30992,
    url: "https://www.mercadolivre.com.br/kit-6-unidades-frango-caipira-370g-superbom/p/MLB2098671578",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 18,
    name: "Peito De Frango Desfiado Cozido Vapza 400g",
    priceCents: 5499,
    url: "https://www.mercadolivre.com.br/peito-de-frango-desfiado-cozido-vapza-400g/up/MLBU733572600",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 19,
    name: "Kit 6 Caixas Peito Frango Vapza Desfiado Cozido Vapor 400g",
    priceCents: 24871,
    url: "https://www.mercadolivre.com.br/kit-6-caixas-peito-frango-vapza-desfiado-cozido-vapor-400g/p/MLB2092586808",
  },
  {
    site: "mercado-livre",
    term: "frango",
    position: 20,
    name: "Caixa 12 Peito Frango Vapza Desfiado Cozido Vapor 400 G",
    priceCents: 47489,
    url: "https://www.mercadolivre.com.br/caixa-12-peito-frango-vapza-desfiado-cozido-vapor-400-g/p/MLB2089826458",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 1,
    name: "Beef Jerky Protein Snacks Carne Sabor Original Jack Links",
    priceCents: 1499,
    url: "https://www.mercadolivre.com.br/beef-jerky-protein-snacks-carne-sabor-original-jack-links/p/MLB24811080",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 2,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Linguiças",
    priceCents: 57047,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e-linguicas/up/MLBU5177792626",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 3,
    name: "Carne Seca Jabá Charque Js 1kg - Ponta De Agulha",
    priceCents: 5040,
    url: "https://www.mercadolivre.com.br/carne-seca-jaba-charque-js-1kg-ponta-de-agulha/p/MLB58110878",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 4,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Clássico",
    priceCents: 57223,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e--classico/up/MLBU5142332433",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 5,
    name: "Kit Com 2 Pacotes De 500g Charque Js - Ponta De Agulha",
    priceCents: 5040,
    url: "https://www.mercadolivre.com.br/kit-com-2-pacotes-de-500g-charque-js-ponta-de-agulha/p/MLB63352753",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 6,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Ling Clássico",
    priceCents: 57223,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e-ling--classico/up/MLBU5164203899",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 7,
    name: "250g Linguiça Alheira Portuguêsa Defumada - Sabor Intenso",
    priceCents: 3219,
    url: "https://www.mercadolivre.com.br/250g-linguica-alheira-portuguesa-defumada-sabor-intenso/p/MLB51294555",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 8,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Linguiças",
    priceCents: 57223,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e-linguicas/up/MLBU5142332429",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 9,
    name: "Pastrami Bovino Defumado 500g Sabor Intenso - Di Callani",
    priceCents: 7666,
    url: "https://www.mercadolivre.com.br/pastrami-bovino-defumado-500g-sabor-intenso-di-callani/p/MLB44984983",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 10,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Premium",
    priceCents: 54699,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e--premium/up/MLBU5142332431",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 11,
    name: "Jerked Suino Seara Carne Seca Charque De Porco 400g",
    priceCents: 2298,
    url: "https://www.mercadolivre.com.br/jerked-suino-seara-carne-seca-charque-de-porco-400g/p/MLB35367528",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 12,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Clássico",
    priceCents: 57047,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e--classico/up/MLBU5209701280",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 13,
    name: "Jerked Beef Carne Seca Charque Dianteiro Vilheto 500g",
    priceCents: 4039,
    url: "https://www.mercadolivre.com.br/jerked-beef-carne-seca-charque-dianteiro-vilheto-500g/p/MLB38785274",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 14,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Premium",
    priceCents: 54314,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e--premium/up/MLBU5209701278",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 15,
    name: "Carne Na Lata Xavante 3,4 Kg /promocional /banha /gordura",
    priceCents: 24638,
    url: "https://www.mercadolivre.com.br/carne-na-lata-xavante-34-kg-promocional-banha-gordura/p/MLB43758389",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 16,
    name: "Cesta Básica Alimentos (45 Itens) C/ Carne E Lingu Premium",
    priceCents: 54699,
    url: "https://www.mercadolivre.com.br/cesta-basica-alimentos-45-itens-c-carne-e-lingu--premium/up/MLBU5177722574",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 17,
    name: "Bacon Defumado Seara Gourmet 1.300kg",
    priceCents: 6798,
    url: "https://www.mercadolivre.com.br/bacon-defumado-seara-gourmet-1300kg/p/MLB67837017",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 18,
    name: "Torresmo Especial De Barriga Suina Na Lata 900 Gr Xavante (Pancetta)",
    priceCents: 7890,
    url: "https://www.mercadolivre.com.br/torresmo-especial-de-barriga-suina-na-lata-900-gr-xavante-pancetta/p/MLB43870660",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 19,
    name: "TORRESMO SUÍNO PRONTO PARA O CONSUMO porco suíno San Carlos Torresmo pronto para o consumo em toucinho com a pele frito sem osso de produção orgânica em sacola 1 kg",
    priceCents: 5224,
    url: "https://www.mercadolivre.com.br/torresmo-suino-pronto-para-o-consumo-porco-suino-san-carlos-torresmo-pronto-para-o-consumo-em-toucinho-com-a-pele-frito-sem-osso-de-producao-organica-em-sacola-1-kg/p/MLB46340406",
  },
  {
    site: "mercado-livre",
    term: "carne",
    position: 20,
    name: "Carne Seca Dianteiro Vilheto 400g",
    priceCents: 3549,
    url: "https://www.mercadolivre.com.br/carne-seca-dianteiro-vilheto-400g/p/MLB18397940",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 1,
    name: "Especial Uva 1kg",
    priceCents: 3947,
    url: "https://www.mercadolivre.com.br/especial-uva-1kg/p/MLB2093855703",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 2,
    name: "Cacho De Uva Grande 23cm Uva Artificial Silicone Verde",
    priceCents: 2200,
    url: "https://www.mercadolivre.com.br/cacho-de-uva-grande-23cm-uva-artificial-silicone-verde/p/MLB2095332720",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 3,
    name: "Cacho De Uvas Artificiais 23cm Silicone Rosada",
    priceCents: 2100,
    url: "https://www.mercadolivre.com.br/cacho-de-uvas-artificiais-23cm-silicone-rosada/up/MLBU1467817917",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 4,
    name: "Frutas Cristalizadas 1kg Vupi",
    priceCents: 2780,
    url: "https://www.mercadolivre.com.br/frutas-cristalizadas-1kg-vupi/up/MLBU2971964306",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 5,
    name: "Suco Noni Orgânico Morinda 500ml Kit 3 Unidades Natural",
    priceCents: 17090,
    url: "https://www.mercadolivre.com.br/suco-noni-organico-morinda-500ml-kit-3-unidades-natural/up/MLBU3172760198",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 6,
    name: "Uva Em Pó 500 Gramas Qualidade Premium",
    priceCents: 3500,
    url: "https://www.mercadolivre.com.br/uva-em-po-500-gramas-qualidade-premium/up/MLBU1456353732",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 7,
    name: "Fini Tubes Azedinho Tutti Frutti 12unx15g - Festas, Lembrancinhas e Decorações",
    priceCents: 981,
    url: "https://www.mercadolivre.com.br/fini-tubes-azedinho-tutti-frutti-12unx15g-festas-lembrancinhas-e-decoracoes/p/MLB19567113",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 8,
    name: "Suco De Uva Aurora Tinto Integral Caixa 1,5l",
    priceCents: 1474,
    url: "https://www.mercadolivre.com.br/suco-de-uva-aurora-tinto-integral-caixa-15l/p/MLB19788309",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 9,
    name: "Kit CEIA Cálice Com Suco E Pão Ázimo Para Santa Ceia 48 Unidades - Frutos do Sertão",
    priceCents: 3591,
    url: "https://www.mercadolivre.com.br/kit-ceia-calice-com-suco-e-pao-azimo-para-santa-ceia-48-unidades-frutos-do-sertao/p/MLB25197683",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 10,
    name: "Chiclete Plutonita Baba De Bruxa Halloween Arcor 180g",
    priceCents: 919,
    url: "https://www.mercadolivre.com.br/chiclete-plutonita-baba-de-bruxa-halloween-arcor-180g/p/MLB19747103",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 11,
    name: "Espumante Brasileiro Branco Zero Álcool Aurora Serra Gaúcha Garrafa 750ml",
    priceCents: 2600,
    url: "https://www.mercadolivre.com.br/espumante-brasileiro-branco-zero-alcool-aurora-serra-gaucha-garrafa-750ml/p/MLB18308355",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 12,
    name: "Kit Cálice Santa Ceia Premium Uva Suco Pão Evangélica 48 Un",
    priceCents: 3683,
    url: "https://www.mercadolivre.com.br/kit-calice-santa-ceia-premium-uva-suco-pao-evangelica-48-un/p/MLB59151882",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 13,
    name: "Suco de uva e maçã Natural One Ambiente líquido sem glúten 180 ml pack x 6",
    priceCents: 1999,
    url: "https://www.mercadolivre.com.br/suco-de-uva-e-maca-natural-one-ambiente-liquido-sem-gluten-180-ml-pack-x-6/p/MLB16697783",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 14,
    name: "Granola Tradicional Tia Sônia 1kg Sem Uva Passa – Sabor Natural",
    priceCents: 4909,
    url: "https://www.mercadolivre.com.br/granola-tradicional-tia-sonia-1kg-sem-uva-passa-sabor-natural/p/MLB23313988",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 15,
    name: "Bebida Isotônica Gatorade Uva 500cc Pack x6 Unidades",
    priceCents: 3054,
    url: "https://www.mercadolivre.com.br/bebida-isotonica-gatorade-uva-500cc-pack-x6-unidades/p/MLB18973490",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 16,
    name: "Fini - Tubes - Uva - 15g - C/12",
    priceCents: 989,
    url: "https://www.mercadolivre.com.br/fini-tubes-uva-15g-c12/p/MLB19535814",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 17,
    name: "Farinha De Uva Puro Grão Pré Treino 600g Marapuama",
    priceCents: 2958,
    url: "https://www.mercadolivre.com.br/farinha-de-uva-puro-grao-pre-treino-600g-marapuama/p/MLB2043103443",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 18,
    name: "Suco de Uva Natural One Fresh 900ml",
    priceCents: 919,
    url: "https://www.mercadolivre.com.br/suco-de-uva-natural-one-fresh-900ml/p/MLB63008465",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 19,
    name: "Uva Passa Preta Sem Semente 1kg Fruta Seca Extra Premium Madoxx",
    priceCents: 1999,
    url: "https://www.mercadolivre.com.br/uva-passa-preta-sem-semente-1kg-fruta-seca-extra-premium-madoxx/p/MLB40301108",
  },
  {
    site: "mercado-livre",
    term: "uva",
    position: 20,
    name: "Suco de Uva, Maçã e Pêra Natural One Temperatura Ambiente 1.7L",
    priceCents: 1919,
    url: "https://www.mercadolivre.com.br/suco-de-uva-maca-e-pera-natural-one-temperatura-ambiente-17l/p/MLB52446897",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 1,
    name: "Papel Higiênico Familiar Folha Dupla Kit 24 Rolos de 30 m",
    priceCents: 2799,
    url: "https://www.mercadolivre.com.br/papel-higienico-familiar-folha-dupla-kit-24-rolos-de-30-m/p/MLB66453791",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 2,
    name: "Papel Higiênico Neve Supreme Folha Tripla Leve 32 Pague 28",
    priceCents: 5999,
    url: "https://www.mercadolivre.com.br/papel-higienico-neve-supreme-folha-tripla-leve-32-pague-28/p/MLB16084447",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 3,
    name: "Lenço De Papel De Bolso Facial 9 Pacotes Viagem",
    priceCents: 1837,
    url: "https://www.mercadolivre.com.br/lenco-de-papel-de-bolso-facial-9-pacotes-viagem/up/MLBU4961634524",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 4,
    name: "Papel Higiênico Supreme Folha Tripla Com 12 Rolos Neve",
    priceCents: 1185,
    url: "https://www.mercadolivre.com.br/papel-higienico-supreme-folha-tripla-com-12-rolos-neve/p/MLB16084404",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 5,
    name: "Papel Higiênico Supra Folha Tripla 24 Rolos",
    priceCents: 3490,
    url: "https://www.mercadolivre.com.br/papel-higienico-supra-folha-tripla-24-rolos/p/MLB38655102",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 6,
    name: "Papel Higiênico Folha Dupla 30m L24p22 Personal",
    priceCents: 3150,
    url: "https://www.mercadolivre.com.br/papel-higienico-folha-dupla-30m-l24p22-personal/p/MLB66452309",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 7,
    name: "Papel Higienico Toque De Seda Folha Dupla 24 Unidades Neve",
    priceCents: 3790,
    url: "https://www.mercadolivre.com.br/papel-higienico-toque-de-seda-folha-dupla-24-unidades-neve/p/MLB16084455",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 8,
    name: "Neve Supreme 16 rolos",
    priceCents: 2568,
    url: "https://www.mercadolivre.com.br/neve-supreme-16-rolos/p/MLB16084461",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 9,
    name: "Papel Higiênico Interfolhado Folha Dupla Ipel 8.000 Folhas Extra Luxo",
    priceCents: 7900,
    url: "https://www.mercadolivre.com.br/papel-higienico-interfolhado-folha-dupla-ipel-8000-folhas-extra-luxo/p/MLB22965880",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 10,
    name: "Papel Higiênico Gopaper Rolão Folha Simples 300m 8 Rolos",
    priceCents: 2097,
    url: "https://www.mercadolivre.com.br/papel-higienico-gopaper-rolao-folha-simples-300m-8-rolos/p/MLB22639774",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 11,
    name: "F Bálsamo Hidratante Ap+ M 400 Ml",
    priceCents: 3956,
    url: "https://www.mercadolivre.com.br/ai-1-garrafa-de-balsamo-hidratante-ap-m-400-ml/p/MLB2110772180",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 12,
    name: "Papel Higiênico Supreme Folha Tripla 24 Rolos Neve Folha Tripla",
    priceCents: 3829,
    url: "https://www.mercadolivre.com.br/papel-higienico-supreme-folha-tripla-24-rolos-neve-folha-tripla/p/MLB16084358",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 13,
    name: "Papel Higiênico Folha Dupla Neve Leve 16 Pague 15",
    priceCents: 2999,
    url: "https://www.mercadolivre.com.br/papel-higienico-folha-dupla-neve-leve-16-pague-15/p/MLB40485663",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 14,
    name: "Papel Higiênico Folha Tripla Mimmo 12 Rolos - 20 Metros",
    priceCents: 2349,
    url: "https://www.mercadolivre.com.br/papel-higienico-folha-tripla-mimmo-12-rolos-20-metros/p/MLB66454153",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 15,
    name: "Papel Higiênico Neve Ultracomfort 4 Folhas 12 Rolos 20m",
    priceCents: 4740,
    url: "https://www.mercadolivre.com.br/papel-higienico-neve-ultracomfort-4-folhas-12-rolos-20m/p/MLB47685788",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 16,
    name: "Papel Higiênico Interfolhado Isapel Folha Dupla Para Banheiro",
    priceCents: 5990,
    url: "https://www.mercadolivre.com.br/papel-higienico-interfolhado-isapel-folha-dupla-para-banheiro/p/MLB24821279",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 17,
    name: "Papel Higiênico Vip Kilométrico Neutro Folha Dupla com 20 rolos de 50 metros Personal",
    priceCents: 4754,
    url: "https://www.mercadolivre.com.br/papel-higienico-vip-kilometrico-neutro-folha-dupla-com-20-rolos-de-50-metros-personal/p/MLB22335593",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 18,
    name: "Papel Higiênico Rolão Benn/Prime 8 Rolos 300m Banheiro Industrial",
    priceCents: 4124,
    url: "https://www.mercadolivre.com.br/papel-higienico-rolao-bennprime-8-rolos-300m-banheiro-industrial/p/MLB35096869",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 19,
    name: "Papel Higiênico Neve Toque Da Seda Folha Dupla 30m 4 Rolos",
    priceCents: 467,
    url: "https://www.mercadolivre.com.br/papel-higienico-neve-toque-da-seda-folha-dupla-30m-4-rolos/p/MLB16084410",
  },
  {
    site: "mercado-livre",
    term: "papel higiênico",
    position: 20,
    name: "Papel Higiênico Rolão Absorção Premium 8 X300m 100% Celulose",
    priceCents: 2350,
    url: "https://www.mercadolivre.com.br/papel-higienico-rolao-absorcao-premium-8-x300m-100-celulose/p/MLB23686766",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 1,
    name: "Banana Prata - 1 Und",
    priceCents: 203,
    url: "https://www.amazon.com.br/Rappi-Banana-Prata-1-Und/dp/B0GPFCNLZ1/ref=sr_1_1_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 2,
    name: "Banana Nanica Hortmix 500 g",
    priceCents: 689,
    url: "https://www.amazon.com.br/Banana-Nanica-Hortmix-500-g/dp/B0GKF5VGNV/ref=sr_1_2_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 3,
    name: "Hortmix Banana Prata 500 g",
    priceCents: 939,
    url: "https://www.amazon.com.br/Hortmix-Banana-Prata-500-g/dp/B0GKF13CPG/ref=sr_1_3_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 4,
    name: "Banana Nanica - 1 Und",
    priceCents: 187,
    url: "https://www.amazon.com.br/Rappi-Banana-Nanica-1-Und/dp/B0GPFZH5F9/ref=sr_1_4_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 5,
    name: "Banana Terra Hortmix - - 500 G",
    priceCents: 1579,
    url: "https://www.amazon.com.br/Banana-Terra-Hortmix-500/dp/B0GKT3KQ3S/ref=sr_1_5_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 6,
    name: "Bananada Zero Açúcar 22 G",
    priceCents: 210,
    url: "https://www.amazon.com.br/Bananada-Zero-A%C3%A7%C3%BAcar-22-G/dp/B0H3MW4789/ref=sr_1_6_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 7,
    name: "Bananinha Cremosa Com Açúcar 30 G",
    priceCents: 135,
    url: "https://www.amazon.com.br/Bananinha-Cremosa-Com-A%C3%A7%C3%BAcar-30/dp/B0H3MJ4JLW/ref=sr_1_7_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 8,
    name: "Danoninho Bom Dia banana com aveia 70g",
    priceCents: 480,
    url: "https://www.amazon.com.br/Danoninho-Bom-Dia-banana-aveia/dp/B0GKCP5NN5/ref=sr_1_8_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 9,
    name: "Chambinho Petit Maçã e Banana",
    priceCents: 1170,
    url: "https://www.amazon.com.br/Chambinho-Petit-Ma%C3%A7%C3%A3-e-Banana/dp/B0GKC8NN91/ref=sr_1_9_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 10,
    name: "BISCOITO MABEL ROSQUINHA BANANA/CANELA 300 GR",
    priceCents: 699,
    url: "https://www.amazon.com.br/BISCOITO-ROSQUINHA-BANANA-CANELA-PACOTES/dp/B0CY7P75YQ/ref=sr_1_10_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 11,
    name: "Farofa de Mandioca com Pedaços de Banana Crocante Yoki Caseiríssima Pacote 200g",
    priceCents: 799,
    url: "https://www.amazon.com.br/Mandioca-Peda%C3%A7os-Crocante-Yoki-Caseir%C3%ADssima/dp/B0D8TR2JLK/ref=sr_1_11_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 12,
    name: "Nestlé Ninho Iogurte Maçã e Banana 170 g",
    priceCents: 450,
    url: "https://www.amazon.com.br/Nestl%C3%A9-Ninho-Iogurte-Ma%C3%A7%C3%A3-Banana/dp/B0GKV15JKW/ref=sr_1_12_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 13,
    name: "Nestlé Ninho Pounch Maçã e Banana 100 g",
    priceCents: 450,
    url: "https://www.amazon.com.br/Nestl%C3%A9-Ninho-Pounch-Ma%C3%A7%C3%A3-Banana/dp/B0GKCK1S1W/ref=sr_1_13_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 14,
    name: "Danoninho Petit Suisse Morango, Banana e Maçã-Verde 480g",
    priceCents: 1899,
    url: "https://www.amazon.com.br/Danoninho-Suisse-Morango-Banana-Ma%C3%A7%C3%A3-Verde/dp/B0H5D65YC1/ref=sr_1_14_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "banana",
    position: 15,
    name: "Bala Gelatina Fini Banana - 80 g",
    priceCents: 1099,
    url: "https://www.amazon.com.br/Bala-Gelatina-Fini-Banana-80/dp/B0GLFHTWRW/ref=sr_1_15_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 1,
    name: "Pão Francês Modelado Congelado - 260 g",
    priceCents: 1099,
    url: "https://www.amazon.com.br/P%C3%A3o-Franc%C3%AAs-Modelado-Congelado-260/dp/B0GLFB4VN7/ref=sr_1_1_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 2,
    name: "PAO FORMA 480G PUL",
    priceCents: 610,
    url: "https://www.amazon.com.br/PULLMAN-PAO-FORMA-480G-PUL/dp/B0C5RXJ84F/ref=sr_1_2_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 3,
    name: "Pão De Sanduiche Seven Boys Leite - Seven Boys - 450 g",
    priceCents: 713,
    url: "https://www.amazon.com.br/P%C3%A3o-Sanduiche-Seven-Boys-Leite/dp/B0GKL84HZP/ref=sr_1_3_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 4,
    name: "Pão De Forma Nutrella Cranberry, Quinoa & Hibisco - - 350 g",
    priceCents: 1478,
    url: "https://www.amazon.com.br/Forma-Nutrella-Cranberry-Quinoa-Hibisco/dp/B0GKL1FCXK/ref=sr_1_4_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 5,
    name: "Pão De Milho Seven Boys Casa De Vó - 450 g",
    priceCents: 1029,
    url: "https://www.amazon.com.br/P%C3%A3o-Milho-Seven-Boys-Casa/dp/B0GLF9LBVT/ref=sr_1_5_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 6,
    name: "Pão de Forma Tradicional B",
    priceCents: 1099,
    url: "https://www.amazon.com.br/P%C3%A3o-de-Forma-Tradicional-B/dp/B0C6B4YGM8/ref=sr_1_6_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 7,
    name: "Seven Boys Pão Bisnaguinha Seven Boys - Seven Boys - 300 g",
    priceCents: 1124,
    url: "https://www.amazon.com.br/Seven-Boys-P%C3%A3o-Bisnaguinha-300/dp/B0GLF745SM/ref=sr_1_7_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 8,
    name: "Bisnaga na Chapa Artesano Pullman 300g",
    priceCents: 1335,
    url: "https://www.amazon.com.br/Bisnaga-Chapa-Artesano-Pullman-300g/dp/B0CNXMQ419/ref=sr_1_8_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 9,
    name: "Pão De Forma Seven Boys - Seven Boys - 450 g",
    priceCents: 1024,
    url: "https://www.amazon.com.br/P%C3%A3o-Forma-Seven-Boys-450/dp/B0GKLLM25T/ref=sr_1_9_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 10,
    name: "Pao de Forma Tradicional Visconti",
    priceCents: 799,
    url: "https://www.amazon.com.br/Pao-De-Forma-Tradicional-Visc/dp/B083MB6S7X/ref=sr_1_10_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 11,
    name: "PAO FORM WICKBOLD, 450G INTEGRAL",
    priceCents: 900,
    url: "https://www.amazon.com.br/PAO-FORM-WICKBOLD-450G-INTEGRAL/dp/B0C5RXLDV9/ref=sr_1_11_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 12,
    name: "Pão Pullman Artesano - Plus Vita - 500 g",
    priceCents: 1712,
    url: "https://www.amazon.com.br/P%C3%A3o-Pullman-Artesano-Plus-Vita/dp/B0GLFTVJ6Q/ref=sr_1_12_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 13,
    name: "Ciabatta Brico Bread Grande 218G - - 218 g",
    priceCents: 1499,
    url: "https://www.amazon.com.br/Ciabatta-Brico-Bread-Grande-218G/dp/B0GKM6LDS5/ref=sr_1_13_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 14,
    name: "Wickbold Pão Integral Castanha-do-Pará & Quinoa Grão Sabor",
    priceCents: 1750,
    url: "https://www.amazon.com.br/Wickbold-Integral-Castanha-do-Par%C3%A1-Quinoa-Sabor/dp/B0GPB3MXNX/ref=sr_1_14_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 15,
    name: "BISNAGA ARTESANO NA CHAPA 300G PULLMAN",
    priceCents: 1239,
    url: "https://www.amazon.com.br/BISNAGA-ARTESANO-CHAPA-300G-PULLMAN/dp/B0DDTYK6HS/ref=sr_1_15_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 16,
    name: "Pão De Forma Pullman Sabor Pão Na Chapa Artesano - - 500 g",
    priceCents: 1647,
    url: "https://www.amazon.com.br/Forma-Pullman-Sabor-Chapa-Artesano/dp/B0GKL19FGN/ref=sr_1_16_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 17,
    name: "Brasileirinho Pão Mini Brioche",
    priceCents: 2059,
    url: "https://www.amazon.com.br/Rappi-Brasileirinho-P%C3%A3o-Mini-Brioche/dp/B0GPDG1RD7/ref=sr_1_17_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 18,
    name: "Pão de forma Bauducco Graos Classicos 390g",
    priceCents: 749,
    url: "https://www.amazon.com.br/forma-Bauducco-Graos-Classicos-390g/dp/B0C6B4GJ7N/ref=sr_1_18_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 19,
    name: "Pão de Hamburguer Bauducco 200g",
    priceCents: 1199,
    url: "https://www.amazon.com.br/Bauducco-P%C3%A3o-de-Hamburguer-B/dp/B0CBNJKL3V/ref=sr_1_19_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "pão",
    position: 20,
    name: "Pão de forma Bauducco Integral 390g",
    priceCents: 1149,
    url: "https://www.amazon.com.br/P%C3%A3o-forma-Bauducco-Integral-390g/dp/B0C6B3TCHQ/ref=sr_1_20_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 1,
    name: "File De Peito De Frango Sadia Congelado - 1 kg",
    priceCents: 3049,
    url: "https://www.amazon.com.br/File-Peito-Frango-Sadia-Congelado/dp/B0GKV8JGQK/ref=sr_1_1_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 2,
    name: "Perdigão Filezinho de Sassami de Frango Congelado",
    priceCents: 2099,
    url: "https://www.amazon.com.br/Perdig%C3%A3o-Filezinho-Sassami-Frango-Congelado/dp/B0GKCWQ99T/ref=sr_1_2_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 3,
    name: "Sadia Peito de Frango Desfiado",
    priceCents: 3049,
    url: "https://www.amazon.com.br/Sadia-Peito-de-Frango-Desfiado/dp/B0GKC99433/ref=sr_1_3_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 4,
    name: "Peito de frango desfiado Seara 400g",
    priceCents: 2799,
    url: "https://www.amazon.com.br/Peito-frango-desfiado-Seara-400g/dp/B0GKCWYG23/ref=sr_1_4_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 5,
    name: "Sadia Filezinho Sassami de Frango",
    priceCents: 3899,
    url: "https://www.amazon.com.br/Sadia-Filezinho-Sassami-de-Frango/dp/B0GKCJ1V25/ref=sr_1_5_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 6,
    name: "Perdigão Tirinhas de Frango Empanadas",
    priceCents: 1549,
    url: "https://www.amazon.com.br/Perdig%C3%A3o-Tirinhas-de-Frango-Empanadas/dp/B0GKCJPNTD/ref=sr_1_6_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 7,
    name: "Filé de Peito de Frango em Bifes Bassar Congelado 400 g",
    priceCents: 1899,
    url: "https://www.amazon.com.br/Peito-Frango-Bifes-Bassar-Congelado/dp/B0GXQL5CS4/ref=sr_1_7_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 8,
    name: "Korin Sobrecoxa de Frango",
    priceCents: 1999,
    url: "https://www.amazon.com.br/Korin-Sobrecoxa-de-Frango/dp/B0GKCNLQMS/ref=sr_1_8_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 9,
    name: "Nuggets De Frango Sadia Tradicional 300 G",
    priceCents: 1649,
    url: "https://www.amazon.com.br/Nuggets-Frango-Sadia-Tradicional-300/dp/B0GKMVPPPF/ref=sr_1_9_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 10,
    name: "Frango A Passarinho Sadia Temperado Congelado - 1 Kg",
    priceCents: 2049,
    url: "https://www.amazon.com.br/Frango-Passarinho-Sadia-Temperado-Congelado/dp/B0GKTX92SR/ref=sr_1_10_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 11,
    name: "Empanado De Frango Sadia Em Iscas Tempurá - - 300 g",
    priceCents: 2299,
    url: "https://www.amazon.com.br/Empanado-Frango-Sadia-Iscas-Tempur%C3%A1/dp/B0GKN5F4KS/ref=sr_1_11_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 12,
    name: "Korin Espetinho de Filé de Coxa de Frango Temperado Congelado",
    priceCents: 2549,
    url: "https://www.amazon.com.br/Korin-Espetinho-Frango-Temperado-Congelado/dp/B0GKCJ9R1Q/ref=sr_1_12_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 13,
    name: "Sadia Frango a Passarinho Congelado",
    priceCents: 2199,
    url: "https://www.amazon.com.br/Sadia-Frango-a-Passarinho-Congelado/dp/B0GKCMG82P/ref=sr_1_13_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 14,
    name: "Filé de Peito de Frango Sem Transgênico Congelado Korin 600 G",
    priceCents: 3849,
    url: "https://www.amazon.com.br/Peito-Frango-Transg%C3%AAnico-Congelado-Korin/dp/B0GKC2LJWV/ref=sr_1_14_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 15,
    name: "Carne Temperada Congelada De Frango Com Osso Sobrecoxa Seara 1 KG",
    priceCents: 2299,
    url: "https://www.amazon.com.br/Temperada-Congelada-Frango-Sobrecoxa-Seara/dp/B0H9BPJPPW/ref=sr_1_15_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 16,
    name: "Frango A Passarinho Temperado Congelado Asa Coxa Dorso Peito Sobrecoxa Seara 1 KG",
    priceCents: 2049,
    url: "https://www.amazon.com.br/Passarinho-Temperado-Congelado-Sobrecoxa-Seara/dp/B0H9BNVPKK/ref=sr_1_16_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 17,
    name: "Yakisoba De Frango Liv Up Com Legumes 300 g",
    priceCents: 2867,
    url: "https://www.amazon.com.br/Yakisoba-Frango-Liv-Up-Legumes/dp/B0GKJK23B8/ref=sr_1_17_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 18,
    name: "Empanado De Frango Seara Chicken Crispy Tradicional - - 300 g",
    priceCents: 2149,
    url: "https://www.amazon.com.br/Empanado-Frango-Chicken-Crispy-Tradicional/dp/B0GKM88BZS/ref=sr_1_18_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 19,
    name: "Carne Temperada Cozida Congelada De Frango Com Osso Coxinha Da Asa Seara 400 G",
    priceCents: 2649,
    url: "https://www.amazon.com.br/Temperada-Cozida-Congelada-Coxinha-Seara/dp/B0H9BHZFBG/ref=sr_1_19_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "frango",
    position: 20,
    name: "Korin Fígado de Frango Orgânico",
    priceCents: 1199,
    url: "https://www.amazon.com.br/Korin-F%C3%ADgado-de-Frango-Org%C3%A2nico/dp/B0GKCJRZKQ/ref=sr_1_20_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 1,
    name: "Carne Bovina Moída Bassar Congelada 400 g",
    priceCents: 2199,
    url: "https://www.amazon.com.br/Carne-Bovina-Mo%C3%ADda-Bassar-Congelada/dp/B0GXQGKLKT/ref=sr_1_1_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 2,
    name: "Perdigão Hambúrguer de Carne Bovina Na Brasa Picanha",
    priceCents: 949,
    url: "https://www.amazon.com.br/Perdig%C3%A3o-Hamb%C3%BArguer-Carne-Bovina-Picanha/dp/B0GKFG1JPK/ref=sr_1_2_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 3,
    name: "Patinho Moído Bassar Congelado 400 g",
    priceCents: 3599,
    url: "https://www.amazon.com.br/Patinho-Mo%C3%ADdo-Bassar-Congelado-400/dp/B0GXQLV6G4/ref=sr_1_3_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 4,
    name: "Nuggets De Frango Sadia Tradicional 300 G",
    priceCents: 1649,
    url: "https://www.amazon.com.br/Nuggets-Frango-Sadia-Tradicional-300/dp/B0GKMVPPPF/ref=sr_1_4_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 5,
    name: "Perdigão Mortadela Ouro Defumada",
    priceCents: 1099,
    url: "https://www.amazon.com.br/Perdigao-Perdig%C3%A3o-Mortadela-Ouro-Defumada/dp/B0GKHGGR9P/ref=sr_1_5_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 6,
    name: "Sadia Linguia Calabresa Cozida e Defumada",
    priceCents: 1449,
    url: "https://www.amazon.com.br/Sadia-Linguia-Calabresa-Cozida-Defumada/dp/B0GKHSKJJL/ref=sr_1_6_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 7,
    name: "Presunto Cozido Seara Fatiado 180 G",
    priceCents: 1449,
    url: "https://www.amazon.com.br/Presunto-Cozido-Seara-Fatiado-180/dp/B0GKMPGNCH/ref=sr_1_7_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 8,
    name: "Sadia Coxa e Sobrecoxa Desossada",
    priceCents: 3130,
    url: "https://www.amazon.com.br/Sadia-Coxa-e-Sobrecoxa-Desossada/dp/B0GKDS9GRX/ref=sr_1_8_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 9,
    name: "Perdigão Hambúrguer de Carne Bovina Na Brasa Costela",
    priceCents: 999,
    url: "https://www.amazon.com.br/Perdig%C3%A3o-Hamb%C3%BArguer-Carne-Bovina-Costela/dp/B0GKFVJJ7R/ref=sr_1_9_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 10,
    name: "Korin Espetinho de Filé de Coxa de Frango Temperado Congelado",
    priceCents: 2549,
    url: "https://www.amazon.com.br/Korin-Espetinho-Frango-Temperado-Congelado/dp/B0GKCJ9R1Q/ref=sr_1_10_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 11,
    name: "Carne Bovina Curada Desfiada Sabor Carne Seca 400G Vapza",
    priceCents: 5949,
    url: "https://www.amazon.com.br/Carne-Bovina-Cozida-Desfiada-Gramas/dp/B076B9QGWZ/ref=sr_1_11_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 12,
    name: "Sadia Peito de Frango Desfiado",
    priceCents: 3049,
    url: "https://www.amazon.com.br/Sadia-Peito-de-Frango-Desfiado/dp/B0GKC99433/ref=sr_1_12_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 13,
    name: "Filé De Tilápia Seara Congelado - - 600 g",
    priceCents: 5049,
    url: "https://www.amazon.com.br/Fil%C3%A9-Til%C3%A1pia-Seara-Congelado-600/dp/B0GKMYGRQY/ref=sr_1_13_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 14,
    name: "Wessel Hambúrguer Bovino de Fraldinha Congelado 120g",
    priceCents: 1099,
    url: "https://www.amazon.com.br/Wessel-Hamb%C3%BArguer-Bovino-Fraldinha-Congelado/dp/B0H9BNZ9M1/ref=sr_1_14_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 15,
    name: "Filé de Peito de Frango Medalhão Bassar Congelado 400 g",
    priceCents: 2449,
    url: "https://www.amazon.com.br/Peito-Frango-Medalh%C3%A3o-Bassar-Congelado/dp/B0GXQLW3MC/ref=sr_1_15_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 16,
    name: "Vpj Carne Moída de Patinho Angus Beef Todo Dia 300 g",
    priceCents: 2849,
    url: "https://www.amazon.com.br/Carne-Mo%C3%ADda-Patinho-Angus-Beef/dp/B0GKFG3RZZ/ref=sr_1_16_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 17,
    name: "Carne Temperada Cozida Congelada De Frango Com Osso Coxinha Da Asa Seara 400 G",
    priceCents: 2649,
    url: "https://www.amazon.com.br/Temperada-Cozida-Congelada-Coxinha-Seara/dp/B0H9BHZFBG/ref=sr_1_17_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 18,
    name: "Sadia Filezinho Sassami de Frango",
    priceCents: 3899,
    url: "https://www.amazon.com.br/Sadia-Filezinho-Sassami-de-Frango/dp/B0GKCJ1V25/ref=sr_1_18_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 19,
    name: "Sadia Bacon em Fatias na Receita",
    priceCents: 3049,
    url: "https://www.amazon.com.br/Sadia-Bacon-Fatias-Receita/dp/B0GKHNSN37/ref=sr_1_19_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "carne",
    position: 20,
    name: "Carne Moida Liv Up Arroz Integral E Feijão Carioca - - 300 g",
    priceCents: 2700,
    url: "https://www.amazon.com.br/Liv-Up-Integral-Feij%C3%A3o-Carioca/dp/B0GKMYN2T8/ref=sr_1_20_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 1,
    name: "Uva Thompson Hortmix 500 g",
    priceCents: 1499,
    url: "https://www.amazon.com.br/Uva-Thompson-Hortmix-500-g/dp/B0GKFH4HLS/ref=sr_1_1_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 2,
    name: "Uva Black sem Semente Vitória",
    priceCents: 1359,
    url: "https://www.amazon.com.br/Uva-Black-sem-Semente-Vit%C3%B3ria/dp/B0GKFH1J73/ref=sr_1_2_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 3,
    name: "Uva Mista Higienizada",
    priceCents: 1699,
    url: "https://www.amazon.com.br/uva-Uva-Mista-Higienizada/dp/B0GKF9SWLK/ref=sr_1_3_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 4,
    name: "Uva Crimson",
    priceCents: 1749,
    url: "https://www.amazon.com.br/Rappi-Uva-Crimson/dp/B0GKT4V6PR/ref=sr_1_4_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 5,
    name: "Uva Passa Hortmix Preta Sem Semente 200 g",
    priceCents: 1169,
    url: "https://www.amazon.com.br/Uva-Passa-Hortmix-Preta-Semente/dp/B0GK64SPH1/ref=sr_1_5_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 6,
    name: "Suco de Uva Integral Aurora tto 1,5l tp",
    priceCents: 2499,
    url: "https://www.amazon.com.br/suco-uva-integral-aurora-tto/dp/B0D4ZGHND4/ref=sr_1_6_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 7,
    name: "Suco De Uva 900ml Ambiente - Natural One",
    priceCents: 1499,
    url: "https://www.amazon.com.br/Suco-Fazenda-Natural-One-900ml/dp/B07Y2DGYP7/ref=sr_1_7_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 8,
    name: "La Violetera Uva-Passa Escura Sem Semente 100G",
    priceCents: 849,
    url: "https://www.amazon.com.br/Uva-passa-Escura-semente-Violetera-100g/dp/B0BP2RZFPY/ref=sr_1_8_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 9,
    name: "Del Valle Suco Frut Sabor Uva",
    priceCents: 849,
    url: "https://www.amazon.com.br/Del-Valle-Suco-Frut-Sabor/dp/B0GP8X51B1/ref=sr_1_9_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 10,
    name: "Suco De Uva 180ml Ambiente - Natural One",
    priceCents: 449,
    url: "https://www.amazon.com.br/Natural-One/dp/B084T82LQP/ref=sr_1_10_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 11,
    name: "Picolé Kibon Fruttare Uva - - 59 g",
    priceCents: 849,
    url: "https://www.amazon.com.br/Picol%C3%A9-Kibon-Fruttare-Uva-59/dp/B0GKM8F9JW/ref=sr_1_11_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 12,
    name: "Suco De Uva Suco De Uva Aurora Tinto Integral - - 1 L",
    priceCents: 2499,
    url: "https://www.amazon.com.br/Suco-Uva-Aurora-Tinto-Integral/dp/B0H3QXJP1W/ref=sr_1_12_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 13,
    name: "SUCO DEL VALLE 100% UVA 1L",
    priceCents: 1929,
    url: "https://www.amazon.com.br/SUCO-DEL-VALLE-100-UVA/dp/B084HNRYYW/ref=sr_1_13_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 14,
    name: "Tial Suco Misto de Uva e Pera 100% 1L, Sem Adição de Açúcar, Sem Ingredientes Artificiais, Não Contém Conservantes, Pronto para Beber",
    priceCents: 1449,
    url: "https://www.amazon.com.br/Tial-Adi%C3%A7%C3%A3o-Ingredientes-Artificiais-Conservantes/dp/B0FP1518BN/ref=sr_1_14_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 15,
    name: "Suco Del Vale Mais Néctar De Uva Light 1L",
    priceCents: 918,
    url: "https://www.amazon.com.br/N%C3%A9ctar-Del-Valle-Uva-Light/dp/B01AH1HSMY/ref=sr_1_15_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 16,
    name: "Suco Maguary Uva Maguary Sabor 1000Ml",
    priceCents: 749,
    url: "https://www.amazon.com.br/Suco-Maguary-Uva-Sabor-1000Ml/dp/B08LM5XQWK/ref=sr_1_16_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 17,
    name: "Refrigerante Fanta Uva Garrafa 2L 1 UN",
    priceCents: 900,
    url: "https://www.amazon.com.br/Refrigerante-Fanta-Uva-Garrafa-2L/dp/B07W5LWYNM/ref=sr_1_17_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 18,
    name: "Suco De Uva 100% Natural Xandô Sem Açucar - Xandô - 900 ml",
    priceCents: 2349,
    url: "https://www.amazon.com.br/Suco-100-Natural-Xand%C3%B4-A%C3%A7ucar/dp/B0GKM9KQ3S/ref=sr_1_18_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 19,
    name: "Refrigerante Sukita, Uva, Garrafa 2L",
    priceCents: 699,
    url: "https://www.amazon.com.br/Refrigerante-Sukita-Uva-Garrafa-2L/dp/B08DLYKGZM/ref=sr_1_19_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "uva",
    position: 20,
    name: "Kapo Uva 200ml",
    priceCents: 319,
    url: "https://www.amazon.com.br/N%C3%A9ctar-de-Uva-Kapo-200ml/dp/B07Y2DY242/ref=sr_1_20_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    position: 1,
    name: "Personal Papel Higiênico Vip Folha Dupla, 16 Unidades Branco (Embalagem Pode Variar)",
    priceCents: 2599,
    url: "https://www.amazon.com.br/Papel-Higi%C3%AAnico-Personal-Branco-pacote/dp/B07D5LTDT4/ref=sr_1_1_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    position: 2,
    name: "Personal VIP - Papel Higiênico, Folha Dupla, 12 unidades (Embalagem pode variar)",
    priceCents: 1999,
    url: "https://www.amazon.com.br/Papel-Higi%C3%AAnico-Personal-Branco-pacote/dp/B07D5PH2YJ/ref=sr_1_2_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    position: 3,
    name: "Personal VIP - Papel Higiênico Folha Dupla, Branco 24 unidades (Embalagem pode variar)",
    priceCents: 3149,
    url: "https://www.amazon.com.br/Papel-Higi%C3%AAnico-Personal-Branco-pacote/dp/B07D5LZZCC/ref=sr_1_3_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    position: 4,
    name: "Papel Higiênico Neve Toque das Ondas Folha Tripla 12 rolos 20M",
    priceCents: 4249,
    url: "https://www.amazon.com.br/Papel-Higi%C3%AAnico-Neve-Toque-Tripla/dp/B0FHGDL31P/ref=sr_1_4_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    position: 5,
    name: "Papel Higiênico Neve Toque das Ondas, Folha Tripla, Branco, 6 Rolos",
    priceCents: 2199,
    url: "https://www.amazon.com.br/Papel-Higi%C3%AAnico-Neve-Toque-Tripla/dp/B0FHGH6WGQ/ref=sr_1_5_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    position: 6,
    name: "Papel Higiênico Folha Tripla Neutro Neve 20 m 4 un",
    priceCents: 1249,
    url: "https://www.amazon.com.br/Neve-Higi%C3%AAnico-Supreme-Neutro-Tripla/dp/B07Y2BTCKH/ref=sr_1_6_br_f3_wg_amnow",
  },
  {
    site: "amazon-now",
    term: "papel higiênico",
    position: 7,
    name: "Mimmo Papel Higiênico Folha Dupla 12 Rolos 40M",
    priceCents: 4049,
    url: "https://www.amazon.com.br/Mimmo-Papel-Higi%C3%AAnico-Folha-Dupla/dp/B09XLS5TD4/ref=sr_1_7_br_f3_wg_amnow",
  },
];

/** Approved tiers per search, keyed by the normalised name (trim, lowercase, collapse spaces, accents kept). */
export const CORPUS_LABELS: Record<CorpusTerm, Record<string, Tier>> = {
  banana: {
    "extima lata banana 600g": "related", // ML
    "banana nanica - 1 und": "match", // AN
    "fruta pocket - manga, banana, abacaxi, açaí e maçã - 20g - liofilizada - solo snacks":
      "related", // ML
    "banana prata - 1 und": "match", // AN
    "bala de banana oliveira 500g sem glúten lactose": "related", // ML
    "banana da terra org kg": "match", // ML
    "mudas de banana caturra / banana mais doce do brasil": "related", // ML
    "banana zero 180g dacolônia": "related", // ML
    "10 mudas de banana caturra / banana mais doce do brasil": "related", // ML
    "bala gelatina fini banana - 80 g": "related", // AN
    "banana nanica hortmix 500 g": "match", // AN
    "2kg banana prata verde orgânica": "match", // ML
    "banana verde em pó 500 gramas qualidade premium": "related", // ML
    "banana copo vitória pote c/20 unidades": "related", // ML
    "danoninho bom dia banana com aveia 70g": "related", // AN
    "fini balas de gelatina bananas 500g": "related", // ML
    "biscoito mabel rosquinha banana/canela 300 gr": "related", // AN
    "hortmix banana prata 500 g": "match", // AN
    "paraibuna bananinha tradicional c/ açúcar 36g dp 20 unidades": "related", // ML
    "banana terra hortmix - - 500 g": "match", // AN
    "display bananinha bananafruti - 24 x 25 g": "related", // ML
    "bananinha cremosa com açúcar 30 g": "related", // AN
    "bananinha cremosa zero açúcar 24 x30g": "related", // ML
    "chambinho petit maçã e banana": "related", // AN
    "bananada zero naturafruti 10un de 25g - com ameixa": "related", // ML
    "farofa de mandioca com pedaços de banana crocante yoki caseiríssima pacote 200g": "related", // AN
    "nestlé ninho iogurte maçã e banana 170 g": "related", // AN
    "nestlé ninho pounch maçã e banana 100 g": "related", // AN
    "danoninho petit suisse morango, banana e maçã-verde 480g": "related", // AN
    "bananada zero açúcar 22 g": "related", // AN
    "fini mini bananas balas de gelatina 12x15 - festas, lembrancinhas e decorações": "related", // ML
    "bananinha cremosa oliveira zero açúcar sem glúten 24x22g": "related", // ML
    "bananada zero açúcar naturafruti 250g sem glúten e lactose saudável": "related", // ML
    "pão francês sem glúten zero lactose schär bandeja 100g": "unrelated", // cross-page
    "uva crimson": "unrelated", // cross-page
    "carne na lata xavante 3,4 kg /promocional /banha /gordura": "unrelated", // cross-page
    "brasileirinho pão mini brioche": "unrelated", // cross-page
    "papel higiênico interfolhado isapel folha dupla para banheiro": "unrelated", // cross-page
    "frutas cristalizadas 1kg vupi": "unrelated", // cross-page
    "papel higiênico rolão benn/prime 8 rolos 300m banheiro industrial": "unrelated", // cross-page
    "especial uva 1kg": "unrelated", // cross-page
    "bala mastigável de frutas sortidas florestal 500g com 100un": "unrelated", // ML
    "uva mista higienizada": "unrelated", // cross-page
    "kit fini 60 unidades de balas de gelatina tubes - sabores sortidos para festas e lembrancinhas":
      "unrelated", // ML
    "picolé kibon fruttare uva - - 59 g": "unrelated", // cross-page
    "pãozinho de batata belive sem glúten, leite e lactose 198 g": "unrelated", // cross-page
    "del valle suco frut sabor uva": "unrelated", // cross-page
    "pão de forma de batata-doce sem glúten sem leite belive": "unrelated", // cross-page
    "pão de forma integral bauducco 390g macio fatiado fibras": "unrelated", // cross-page
    "kapo uva 200ml": "unrelated", // cross-page
  },
  pão: {
    "pão francês sem glúten zero lactose schär bandeja 100g": "match", // ML
    "pão de forma tradicional b": "match", // AN
    "pão de forma sem glúten sem leite sem lactose belive 400g": "match", // ML
    "pão de forma pullman sabor pão na chapa artesano - - 500 g": "match", // AN
    "pão de forma sem glúten multigrãos zero lactose sem leite belive 400g": "match", // ML
    "wickbold pão integral castanha-do-pará & quinoa grão sabor": "match", // AN
    "pão de forma de batata-doce sem glúten sem leite belive": "match", // ML
    "pão de forma bauducco graos classicos 390g": "match", // AN
    "o pão ciabatta tradicional leviassa, não é congelado. feito com ingredientes naturais, sem conservantes ou açucares. pronto em até 8min. pode ser armazenado em temperatura ambiente por até 120 dias.":
      "match", // ML
    "pão de mel panco pacote 500g": "related", // ML
    "pão de forma integral bauducco 390g macio fatiado fibras": "match", // ML
    "pão para hambúrguer bauducco macio com embalagem de 4 unid 200g": "match", // ML
    "pão de cebola sem glúten sem lactose 200g belive": "match", // ML
    "pão de forma bauducco integral 390g": "match", // AN
    "pão de forma visconti tradicional macio d+ 400g": "match", // ML
    "pão francês modelado congelado - 260 g": "match", // AN
    "kit 2 pão de forma tradicional visconti 400g": "match", // ML
    "pão de sanduíche multigrãos sem glúten jasmine pacote 350g": "match", // ML
    "pão pullman artesano - plus vita - 500 g": "match", // AN
    "kit ceia cálice com suco e pão ázimo para santa ceia 48 unidades - frutos do sertão":
      "unrelated", // cross-page
    "kit cálice santa ceia premium uva suco pão evangélica 48 un": "unrelated", // cross-page
    "ciabatta brico bread grande 218g - - 218 g": "match", // AN
    "brasileirinho pão mini brioche": "match", // AN
    "pao forma 480g pul": "match", // AN
    "pão de hamburguer bauducco 200g": "match", // AN
    "pão de sanduiche seven boys leite - seven boys - 450 g": "match", // AN
    "pão de forma nutrella cranberry, quinoa & hibisco - - 350 g": "match", // AN
    "pão de milho seven boys casa de vó - 450 g": "match", // AN
    "seven boys pão bisnaguinha seven boys - seven boys - 300 g": "match", // AN
    "pão de forma seven boys - seven boys - 450 g": "match", // AN
    "pao de forma tradicional visconti": "match", // AN
    "pao form wickbold, 450g integral": "match", // AN
    "kit 3 pães de forma tradicional visconti 400g": "match", // ML
    "pãozinho de cebola sem glúten sem leite zero lactose belive 200g": "match", // ML
    "pãozinho de batata belive sem glúten, leite e lactose 198 g": "match", // ML
    "sadia bacon em fatias na receita": "unrelated", // cross-page
    "bacon defumado seara gourmet 1.300kg": "unrelated", // cross-page
    "kit fini 60 unidades de balas de gelatina tubes - sabores sortidos para festas e lembrancinhas":
      "unrelated", // cross-page
    "cesta básica alimentos (45 itens) c/ carne e ling clássico": "unrelated", // cross-page
    "paraibuna bananinha tradicional c/ açúcar 36g dp 20 unidades": "unrelated", // cross-page
    "sadia coxa e sobrecoxa desossada": "unrelated", // cross-page
    "jerked suino seara carne seca charque de porco 400g": "unrelated", // cross-page
    "caixa de frango desfiado cozido nutrue com 5 pacotes de 400": "unrelated", // cross-page
    "carne bovina moída bassar congelada 400 g": "unrelated", // cross-page
    "linguiça tipo calabresa - pacote 2kg": "unrelated", // cross-page
    "torrada tradicional salgada bauducco kit com 30 sachês 15g": "related", // ML
    "kit com 2 pacotes de 500g charque js - ponta de agulha": "unrelated", // cross-page
    "cesta básica alimentos (45 itens) c/ carne e clássico": "unrelated", // cross-page
    "pastrami bovino defumado 500g sabor intenso - di callani": "unrelated", // cross-page
  },
  frango: {
    "strogonoff de frango vapza só aquecer 250g": "related", // ML
    "sadia filezinho sassami de frango": "match", // AN
    "peito de frango desfiado cozido vapza 400g": "match", // ML
    "caixa de frango desfiado cozido nutrue com 5 pacotes de 400": "match", // ML
    "sadia peito de frango desfiado": "match", // AN
    "kit 2 peito frango vapza desfiado cozido vapor 800 g": "match", // ML
    "frango caipira superbom 370g kit 6 unidades": "match", // ML
    "sadia frango a passarinho congelado": "match", // AN
    "perdigão tirinhas de frango empanadas": "related", // AN
    "kit 6 caixas peito frango vapza desfiado cozido vapor 400g": "match", // ML
    "sadia linguia calabresa cozida e defumada": "unrelated", // cross-page
    "caixa 12 peito frango vapza desfiado cozido vapor 400 g": "match", // ML
    "frango a passarinho temperado congelado asa coxa dorso peito sobrecoxa seara 1 kg": "match", // AN
    "file de peito de frango sadia congelado - 1 kg": "match", // AN
    "perdigão filezinho de sassami de frango congelado": "match", // AN
    "peito de frango desfiado seara 400g": "match", // AN
    "frango a passarinho sadia temperado congelado - 1 kg": "match", // AN
    "korin sobrecoxa de frango": "match", // AN
    "empanado de frango sadia em iscas tempurá - - 300 g": "related", // AN
    "filé de peito de frango em bifes bassar congelado 400 g": "match", // AN
    "nuggets de frango sadia tradicional 300 g": "related", // AN
    "empanado de frango seara chicken crispy tradicional - - 300 g": "related", // AN
    "korin espetinho de filé de coxa de frango temperado congelado": "match", // AN
    "sadia coxa e sobrecoxa desossada": "match", // cross-page
    "danoninho bom dia banana com aveia 70g": "unrelated", // cross-page
    "filé de peito de frango sem transgênico congelado korin 600 g": "match", // AN
    "carne temperada congelada de frango com osso sobrecoxa seara 1 kg": "match", // AN
    "filé de peito de frango medalhão bassar congelado 400 g": "match", // cross-page
    "yakisoba de frango liv up com legumes 300 g": "related", // AN
    "carne temperada cozida congelada de frango com osso coxinha da asa seara 400 g": "match", // AN
    "presunto cozido seara fatiado 180 g": "unrelated", // cross-page
    "korin fígado de frango orgânico": "match", // AN
    "jerked suino seara carne seca charque de porco 400g": "unrelated", // cross-page
    "vpj carne moída de patinho angus beef todo dia 300 g": "unrelated", // cross-page
    "carne seca jabá charque js 1kg - ponta de agulha": "unrelated", // cross-page
    "uva crimson": "unrelated", // cross-page
    "pão francês sem glúten zero lactose schär bandeja 100g": "unrelated", // cross-page
    "linguiça tipo calabresa - pacote 2kg": "unrelated", // ML
    "danoninho petit suisse morango, banana e maçã-verde 480g": "unrelated", // cross-page
    "pão francês modelado congelado - 260 g": "unrelated", // cross-page
    "wessel hambúrguer bovino de fraldinha congelado 120g": "unrelated", // cross-page
    "fruta pocket - manga, banana, abacaxi, açaí e maçã - 20g - liofilizada - solo snacks":
      "unrelated", // cross-page
    "bala mastigável de frutas sortidas florestal 500g com 100un": "unrelated", // cross-page
    "patinho moído bassar congelado 400 g": "unrelated", // cross-page
  },
  carne: {
    "16 beef jerky protein snacks carne sweet & hot jack links": "related", // cross-page
    "jerked beef carne seca charque dianteiro vilheto 500g": "match", // ML
    "1 beef jerky protein snacks carne sabor original jack links": "related", // cross-page
    "perdigão hambúrguer de carne bovina na brasa costela": "related", // AN
    "6 beef jerky protein snacks carne sabor sweet hot jack links": "related", // cross-page
    "perdigão hambúrguer de carne bovina na brasa picanha": "related", // AN
    "6 beef jerky protein snacks carne sabor teriyaki jack links": "related", // cross-page
    "jerked suino seara carne seca charque de porco 400g": "related", // ML
    "6 beef jerky protein snacks carne sabor original jack links": "related", // cross-page
    "carne na lata xavante 3,4 kg /promocional /banha /gordura": "related", // ML
    "beef jerky protein snacks carne jack links kit 2 sabores": "related", // cross-page
    "carne seca dianteiro vilheto 400g": "match", // ML
    "wessel hambúrguer bovino de fraldinha congelado 120g": "related", // AN
    "16 beef jerky protein snacks carne sabor teriyaki jack links": "related", // cross-page
    "carne bovina curada desfiada sabor carne seca 400g vapza": "match", // AN
    "carne temperada congelada de frango com osso sobrecoxa seara 1 kg": "related", // cross-page
    "beef jerky protein snacks carne sabor original jack links": "related", // ML
    "vpj carne moída de patinho angus beef todo dia 300 g": "match", // AN
    "cesta básica alimentos (45 itens) c/ carne e linguiças": "related", // ML
    "carne seca jabá charque js 1kg - ponta de agulha": "match", // ML
    "carne temperada cozida congelada de frango com osso coxinha da asa seara 400 g": "related", // AN
    "cesta básica alimentos (45 itens) c/ carne e clássico": "related", // ML
    "cesta básica alimentos (45 itens) c/ carne e ling clássico": "related", // ML
    "cesta básica alimentos (45 itens) c/ carne e premium": "related", // ML
    "filé de peito de frango em bifes bassar congelado 400 g": "related", // cross-page
    "cesta básica alimentos (45 itens) c/ carne e lingu premium": "related", // ML
    "peito de frango desfiado cozido vapza 400g": "related", // cross-page
    "perdigão tirinhas de frango empanadas": "related", // cross-page
    "carne bovina moída bassar congelada 400 g": "match", // AN
    "sadia peito de frango desfiado": "related", // AN
    "carne moida liv up arroz integral e feijão carioca - - 300 g": "match", // AN
    "torresmo suíno pronto para o consumo porco suíno san carlos torresmo pronto para o consumo em toucinho com a pele frito sem osso de produção orgânica em sacola 1 kg":
      "related", // ML
    "mudas de banana caturra / banana mais doce do brasil": "unrelated", // cross-page
    "empanado de frango sadia em iscas tempurá - - 300 g": "related", // cross-page
    "10 mudas de banana caturra / banana mais doce do brasil": "unrelated", // cross-page
    "tradicional codeguim receita italiana - 400g di callani": "related", // cross-page
    "linguiça tipo calabresa perdigão defumação tradicional 1kg": "related", // cross-page
    "caixa de frango desfiado cozido nutrue com 5 pacotes de 400": "related", // cross-page
    "linguiça tipo calabresa - pacote 2kg": "related", // cross-page
    "korin sobrecoxa de frango": "related", // cross-page
    "frango caipira superbom 370g kit 6 unidades": "related", // cross-page
    "kit 6 caixas peito frango vapza desfiado cozido vapor 400g": "related", // cross-page
  },
  uva: {
    "especial uva 1kg": "related", // ML
    "uva crimson": "match", // AN
    "cacho de uva grande 23cm uva artificial silicone verde": "unrelated", // ML
    "del valle suco frut sabor uva": "related", // AN
    "uva em pó 500 gramas qualidade premium": "related", // ML
    "sadia linguia calabresa cozida e defumada": "unrelated", // cross-page
    "suco de uva aurora tinto integral caixa 1,5l": "related", // ML
    "kit cálice santa ceia premium uva suco pão evangélica 48 un": "unrelated", // ML
    "sadia coxa e sobrecoxa desossada": "unrelated", // cross-page
    "suco de uva e maçã natural one ambiente líquido sem glúten 180 ml pack x 6": "related", // ML
    "suco de uva suco de uva aurora tinto integral - - 1 l": "related", // AN
    "granola tradicional tia sônia 1kg sem uva passa – sabor natural": "unrelated", // ML
    "suco del vale mais néctar de uva light 1l": "related", // AN
    "bebida isotônica gatorade uva 500cc pack x6 unidades": "related", // ML
    "bisnaguinha bauducco tradicional leve e macia 260g": "unrelated", // cross-page
    "fini - tubes - uva - 15g - c/12": "related", // ML
    "presunto cozido seara fatiado 180 g": "unrelated", // cross-page
    "farinha de uva puro grão pré treino 600g marapuama": "related", // ML
    "uva mista higienizada": "match", // AN
    "suco de uva natural one fresh 900ml": "related", // ML
    "suco maguary uva maguary sabor 1000ml": "related", // AN
    "uva passa preta sem semente 1kg fruta seca extra premium madoxx": "related", // ML
    "torrada tradicional salgada bauducco kit com 30 sachês 15g": "unrelated", // cross-page
    "suco de uva, maçã e pêra natural one temperatura ambiente 1.7l": "related", // ML
    "perdigão mortadela ouro defumada": "unrelated", // cross-page
    "uva thompson hortmix 500 g": "match", // AN
    "fini tubes azedinho tutti frutti 12unx15g - festas, lembrancinhas e decorações": "unrelated", // ML
    "uva black sem semente vitória": "match", // AN
    "refrigerante fanta uva garrafa 2l 1 un": "related", // AN
    "uva passa hortmix preta sem semente 200 g": "related", // AN
    "suco del valle 100% uva 1l": "related", // AN
    "suco de uva integral aurora tto 1,5l tp": "related", // AN
    "danoninho bom dia banana com aveia 70g": "unrelated", // cross-page
    "suco de uva 900ml ambiente - natural one": "related", // AN
    "kapo uva 200ml": "related", // AN
    "la violetera uva-passa escura sem semente 100g": "related", // AN
    "refrigerante sukita, uva, garrafa 2l": "related", // AN
    "neve supreme 16 rolos": "unrelated", // cross-page
    "suco de uva 180ml ambiente - natural one": "related", // AN
    "pao de forma tradicional visconti": "unrelated", // cross-page
    "picolé kibon fruttare uva - - 59 g": "related", // AN
    "pastrami bovino defumado 500g sabor intenso - di callani": "unrelated", // cross-page
    "tial suco misto de uva e pera 100% 1l, sem adição de açúcar, sem ingredientes artificiais, não contém conservantes, pronto para beber":
      "related", // AN
    "fini mini bananas balas de gelatina 12x15 - festas, lembrancinhas e decorações": "unrelated", // cross-page
    "banana nanica - 1 und": "unrelated", // cross-page
    "linguiça tipo calabresa - pacote 2kg": "unrelated", // cross-page
    "suco de uva 100% natural xandô sem açucar - xandô - 900 ml": "related", // AN
    "carne seca jabá charque js 1kg - ponta de agulha": "unrelated", // cross-page
    "torresmo especial de barriga suina na lata 900 gr xavante (pancetta)": "unrelated", // cross-page
    "mudas de banana caturra / banana mais doce do brasil": "unrelated", // cross-page
  },
  "papel higiênico": {
    "papel higiênico familiar folha dupla kit 24 rolos de 30 m": "match", // ML
    "papel higiênico interfolhado isapel folha dupla para banheiro": "match", // ML
    "papel higiênico neve supreme folha tripla leve 32 pague 28": "match", // ML
    "papel higiênico supra folha tripla 24 rolos": "match", // ML
    "papel higiênico supreme folha tripla com 12 rolos neve": "match", // ML
    "mimmo papel higiênico folha dupla 12 rolos 40m": "match", // AN
    "papel higiênico gopaper rolão folha simples 300m 8 rolos": "match", // ML
    "papel higiênico folha dupla 30m l24p22 personal": "match", // ML
    "papel higiênico folha tripla mimmo 12 rolos - 20 metros": "match", // ML
    "papel higienico toque de seda folha dupla 24 unidades neve": "match", // ML
    "papel higiênico rolão benn/prime 8 rolos 300m banheiro industrial": "match", // ML
    "papel higiênico interfolhado folha dupla ipel 8.000 folhas extra luxo": "match", // ML
    "papel higiênico supreme folha tripla 24 rolos neve folha tripla": "match", // ML
    "personal papel higiênico vip folha dupla, 16 unidades branco (embalagem pode variar)": "match", // AN
    "papel higiênico folha dupla neve leve 16 pague 15": "match", // ML
    "papel higiênico neve toque da seda folha dupla 30m 4 rolos": "match", // ML
    "papel higiênico neve ultracomfort 4 folhas 12 rolos 20m": "match", // ML
    "personal vip - papel higiênico folha dupla, branco 24 unidades (embalagem pode variar)":
      "match", // AN
    "papel higiênico vip kilométrico neutro folha dupla com 20 rolos de 50 metros personal":
      "match", // ML
    "personal vip - papel higiênico, folha dupla, 12 unidades (embalagem pode variar)": "match", // AN
    "papel higiênico folha tripla neutro neve 20 m 4 un": "match", // AN
    "papel higiênico rolão absorção premium 8 x300m 100% celulose": "match", // ML
    "papel higiênico neve toque das ondas folha tripla 12 rolos 20m": "match", // AN
    "papel higiênico neve toque das ondas, folha tripla, branco, 6 rolos": "match", // AN
    "uva mista higienizada": "unrelated", // cross-page
    "lenço de papel de bolso facial 9 pacotes viagem": "related", // ML
    "sadia coxa e sobrecoxa desossada": "unrelated", // cross-page
    "filé de peito de frango sem transgênico congelado korin 600 g": "unrelated", // cross-page
    "pão de mel panco pacote 500g": "unrelated", // cross-page
    "uva crimson": "unrelated", // cross-page
    "suco noni orgânico morinda 500ml kit 3 unidades natural": "unrelated", // cross-page
    "linguiça tipo calabresa perdigão defumação tradicional 1kg": "unrelated", // cross-page
    "kit cálice santa ceia premium uva suco pão evangélica 48 un": "unrelated", // cross-page
    "sadia linguia calabresa cozida e defumada": "unrelated", // cross-page
    "korin fígado de frango orgânico": "unrelated", // cross-page
    "torrada tradicional salgada bauducco kit com 30 sachês 15g": "unrelated", // cross-page
    "kit ceia cálice com suco e pão ázimo para santa ceia 48 unidades - frutos do sertão":
      "unrelated", // cross-page
    "pao de forma tradicional visconti": "unrelated", // cross-page
    "pão para hambúrguer bauducco macio com embalagem de 4 unid 200g": "unrelated", // cross-page
    "perdigão mortadela ouro defumada": "unrelated", // cross-page
    "uva passa hortmix preta sem semente 200 g": "unrelated", // cross-page
    "linguiça tipo calabresa - pacote 2kg": "unrelated", // cross-page
    "pão de forma nutrella cranberry, quinoa & hibisco - - 350 g": "unrelated", // cross-page
    "pao forma 480g pul": "unrelated", // cross-page
    "pão de hamburguer bauducco 200g": "unrelated", // cross-page
    "bisnaguinha visconti textura macio d+ 240g": "unrelated", // cross-page
    "kit fini 60 unidades de balas de gelatina tubes - sabores sortidos para festas e lembrancinhas":
      "unrelated", // cross-page
    "bala gelatina fini banana - 80 g": "unrelated", // cross-page
    "paraibuna bananinha tradicional c/ açúcar 36g dp 20 unidades": "unrelated", // cross-page
    "brasileirinho pão mini brioche": "unrelated", // cross-page
  },
};

/** Every first-page name the human labelled unrelated, with the reason; the label itself is in CORPUS_LABELS. */
export const CORPUS_OVERRIDES: readonly { term: CorpusTerm; name: string; reason: string }[] = [
  {
    term: "banana",
    name: "Bala Mastigável De Frutas Sortidas Florestal 500g Com 100un",
    reason: "generic assorted candy; no banana in it",
  },
  {
    term: "banana",
    name: "Kit Fini 60 Unidades De Balas de Gelatina Tubes - Sabores Sortidos para Festas e Lembrancinhas",
    reason: "generic assorted candy; no banana in it",
  },
  {
    term: "frango",
    name: "Linguiça Tipo Calabresa - Pacote 2kg",
    reason: "pork sausage on the Mercado Livre frango page",
  },
  {
    term: "uva",
    name: "Cacho De Uva Grande 23cm Uva Artificial Silicone Verde",
    reason: "decoration, not food",
  },
  {
    term: "uva",
    name: "Kit Cálice Santa Ceia Premium Uva Suco Pão Evangélica 48 Un",
    reason: "communion kit; contains grape juice but nobody searching uva wants it",
  },
  {
    term: "uva",
    name: "Granola Tradicional Tia Sônia 1kg Sem Uva Passa – Sabor Natural",
    reason: "granola explicitly WITHOUT raisins",
  },
  {
    term: "uva",
    name: "Fini Tubes Azedinho Tutti Frutti 12unx15g - Festas, Lembrancinhas e Decorações",
    reason: "assorted candy, no grape",
  },
];
