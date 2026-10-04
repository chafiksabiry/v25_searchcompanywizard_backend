/**
 * One-shot seed of FR/EN company profile i18n for existing harx companies.
 * Run: node src/scripts/seedCompanyProfileI18nManual.js
 */
const mongoose = require('mongoose');

const URI =
  process.env.MONGODB_URI ||
  'mongodb://mongo:DiGaBWUZXCkIxlZMuntztBaFJcOlUJIg@maglev.proxy.rlwy.net:40270/harx?authSource=admin';

const patches = {
  '6a47eb926505cd50af513257': {
    industry: "Technologie de l'assurance",
    industry_i18n: { en: 'Insurance Technology', fr: "Technologie de l'assurance" },
    overview:
      "Aldric™ est un conseiller IA en assurance qui analyse les profils utilisateurs, identifie les risques réels et recommande la couverture idéale. Il opère en tant que courtier enregistré ORIAS, avec un hébergement sécurisé des données.",
    overview_i18n: {
      en: 'Aldric™ is an AI advisor in insurance that analyzes user profiles, identifies real risks, and recommends ideal coverage. It operates as a registered broker with ORIAS, ensuring that data is securely hosted.',
      fr: "Aldric™ est un conseiller IA en assurance qui analyse les profils utilisateurs, identifie les risques réels et recommande la couverture idéale. Il opère en tant que courtier enregistré ORIAS, avec un hébergement sécurisé des données.",
    },
    mission:
      "Fournir des recommandations d'assurance personnalisées grâce à l'IA avancée, pour aider chacun à comprendre et réduire efficacement ses risques.",
    mission_i18n: {
      en: 'To provide personalized insurance recommendations through advanced AI technology, helping users to understand and mitigate their risks effectively.',
      fr: "Fournir des recommandations d'assurance personnalisées grâce à l'IA avancée, pour aider chacun à comprendre et réduire efficacement ses risques.",
    },
    culture: {
      values: ['Innovation', 'Orientation client', 'Intégrité'],
      values_i18n: {
        en: ['Innovation', 'Customer-centricity', 'Integrity'],
        fr: ['Innovation', 'Orientation client', 'Intégrité'],
      },
      benefits: ["Solutions d'assurance personnalisées", 'Sécurité des données', "Accompagnement d'experts"],
      benefits_i18n: {
        en: ['Personalized insurance solutions', 'Data security', 'Expert guidance'],
        fr: ["Solutions d'assurance personnalisées", 'Sécurité des données', "Accompagnement d'experts"],
      },
      workEnvironment:
        'Aldric™ cultive un environnement collaboratif et innovant où la technologie et les besoins clients sont prioritaires.',
      workEnvironment_i18n: {
        en: 'Aldric™ fosters a collaborative and innovative work environment where technology and customer needs are prioritized.',
        fr: 'Aldric™ cultive un environnement collaboratif et innovant où la technologie et les besoins clients sont prioritaires.',
      },
    },
    opportunities: {
      roles: ['Développeur IA', 'Analyste assurance', 'Customer Success Manager'],
      roles_i18n: {
        en: ['AI Developer', 'Insurance Analyst', 'Customer Success Manager'],
        fr: ['Développeur IA', 'Analyste assurance', 'Customer Success Manager'],
      },
      growthPotential:
        "Aldric™ offre de fortes perspectives de croissance dans la tech assurance, permettant aux collaborateurs d'évoluer avec l'entreprise.",
      growthPotential_i18n: {
        en: 'Aldric™ offers significant growth opportunities in the evolving field of insurance technology, allowing employees to advance their careers as the company expands.',
        fr: "Aldric™ offre de fortes perspectives de croissance dans la tech assurance, permettant aux collaborateurs d'évoluer avec l'entreprise.",
      },
      training:
        "Des programmes de formation continue permettent à l'équipe de rester à jour sur l'IA et l'assurance.",
      training_i18n: {
        en: 'Continuous training and development programs are provided to ensure team members stay updated with the latest advancements in AI and insurance.',
        fr: "Des programmes de formation continue permettent à l'équipe de rester à jour sur l'IA et l'assurance.",
      },
    },
    technology: {
      stack: ['Artificial Intelligence', 'Data Analytics', 'Cloud Computing'],
      innovation:
        "Aldric™ mise sur l'innovation en s'appuyant sur des technologies d'IA de pointe pour améliorer le conseil en assurance.",
      innovation_i18n: {
        en: 'Aldric™ embraces innovation by leveraging cutting-edge AI technologies to enhance the insurance advisory process.',
        fr: "Aldric™ mise sur l'innovation en s'appuyant sur des technologies d'IA de pointe pour améliorer le conseil en assurance.",
      },
    },
  },
  '6a994bb74ca12155a384fa69': {
    industry: 'Assurance',
    industry_i18n: { en: 'Insurance', fr: 'Assurance' },
    overview: 'COURTIER en assurance généraliste avec forte connaissance de la complémentaire santé',
    overview_i18n: {
      en: 'General insurance broker with strong expertise in complementary health insurance',
      fr: 'COURTIER en assurance généraliste avec forte connaissance de la complémentaire santé',
    },
    mission: "Conseiller nos clients et leur proposer les meilleurs polices d'assurance par rapport à leur besoin",
    mission_i18n: {
      en: 'Advise our clients and offer the best insurance policies for their needs',
      fr: "Conseiller nos clients et leur proposer les meilleurs polices d'assurance par rapport à leur besoin",
    },
  },
  '6aa1815304cbe9638bc46273': {
    industry: 'Électronique grand public',
    industry_i18n: { en: 'Consumer Electronics', fr: 'Électronique grand public' },
    overview:
      "Samsung Electronics America, Inc. est un leader mondial de la technologie spécialisé dans l'électronique grand public : mobiles, téléviseurs, électroménager et plus. Réputée pour ses produits innovants et ses technologies de pointe, elle propose des solutions pour les particuliers et les entreprises, avec pour ambition d'améliorer le quotidien grâce à la tech et aux appareils connectés.",
    overview_i18n: {
      en: 'Samsung Electronics America, Inc. is a leading global technology company that specializes in consumer electronics, including mobile devices, televisions, home appliances, and more. The company is known for its innovative products and cutting-edge technology, providing a wide range of solutions for both consumers and businesses. Samsung is committed to enhancing the lives of its customers through advanced technology and smart appliances.',
      fr: "Samsung Electronics America, Inc. est un leader mondial de la technologie spécialisé dans l'électronique grand public : mobiles, téléviseurs, électroménager et plus. Réputée pour ses produits innovants et ses technologies de pointe, elle propose des solutions pour les particuliers et les entreprises, avec pour ambition d'améliorer le quotidien grâce à la tech et aux appareils connectés.",
    },
    mission:
      'Inspirer le monde avec des technologies, produits et designs innovants qui enrichissent la vie des gens et contribuent à la prospérité sociale en créant un nouvel avenir.',
    mission_i18n: {
      en: "To inspire the world with innovative technologies, products, and design that enrich people's lives and contribute to social prosperity by creating a new future.",
      fr: 'Inspirer le monde avec des technologies, produits et designs innovants qui enrichissent la vie des gens et contribuent à la prospérité sociale en créant un nouvel avenir.',
    },
    culture: {
      values: ['Innovation', 'Orientation client', 'Durabilité'],
      values_i18n: {
        en: ['Innovation', 'Customer-centricity', 'Sustainability'],
        fr: ['Innovation', 'Orientation client', 'Durabilité'],
      },
      benefits: ['Assurance santé complète', "Plans d'épargne retraite", 'Remises employés sur les produits'],
      benefits_i18n: {
        en: ['Comprehensive health insurance', 'Retirement savings plans', 'Employee discounts on products'],
        fr: ['Assurance santé complète', "Plans d'épargne retraite", 'Remises employés sur les produits'],
      },
      workEnvironment:
        "Samsung cultive un environnement dynamique et inclusif qui encourage créativité et collaboration. L'entreprise valorise la diversité et promeut une culture de respect et de travail d'équipe, où chacun peut contribuer et innover.",
      workEnvironment_i18n: {
        en: 'Samsung fosters a dynamic and inclusive work environment that encourages creativity and collaboration. The company values diversity and promotes a culture of respect and teamwork, where employees are empowered to contribute their ideas and drive innovation.',
        fr: "Samsung cultive un environnement dynamique et inclusif qui encourage créativité et collaboration. L'entreprise valorise la diversité et promeut une culture de respect et de travail d'équipe, où chacun peut contribuer et innover.",
      },
    },
    opportunities: {
      roles: ['Ingénieur logiciel', 'Product Manager', 'Responsable commercial'],
      roles_i18n: {
        en: ['Software Engineer', 'Product Manager', 'Sales Executive'],
        fr: ['Ingénieur logiciel', 'Product Manager', 'Responsable commercial'],
      },
      growthPotential:
        "Samsung offre de nombreuses opportunités d'évolution et de développement professionnel, avec formations et mentorat pour faire progresser les compétences.",
      growthPotential_i18n: {
        en: 'Samsung provides numerous opportunities for career advancement and professional development. Employees can take advantage of various training programs and mentorship initiatives designed to enhance their skills and support their career goals.',
        fr: "Samsung offre de nombreuses opportunités d'évolution et de développement professionnel, avec formations et mentorat pour faire progresser les compétences.",
      },
      training:
        'Samsung propose des programmes de formation étendus : formation sur le poste, ateliers et ressources en ligne pour rester à jour.',
      training_i18n: {
        en: 'Samsung offers extensive training and development programs, including on-the-job training, workshops, and access to online learning resources to help employees grow in their roles and stay updated with the latest technologies.',
        fr: 'Samsung propose des programmes de formation étendus : formation sur le poste, ateliers et ressources en ligne pour rester à jour.',
      },
    },
    technology: {
      stack: ['Android', 'Tizen OS', 'SmartThings'],
      innovation:
        "Samsung s'engage dans l'innovation continue, avec d'importants investissements R&D pour créer des technologies de pointe.",
      innovation_i18n: {
        en: 'Samsung is committed to continuous innovation, investing heavily in research and development to create cutting-edge technologies that enhance user experience and improve product performance.',
        fr: "Samsung s'engage dans l'innovation continue, avec d'importants investissements R&D pour créer des technologies de pointe.",
      },
    },
  },
};

(async () => {
  await mongoose.connect(URI);
  const col = mongoose.connection.db.collection('companies');
  for (const [id, patch] of Object.entries(patches)) {
    const r = await col.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: patch });
    console.log(id, 'matched', r.matchedCount, 'modified', r.modifiedCount);
  }
  const check = await col.findOne(
    { _id: new mongoose.Types.ObjectId('6a47eb926505cd50af513257') },
    { projection: { name: 1, industry: 1, industry_i18n: 1, overview_i18n: 1, mission_i18n: 1 } }
  );
  console.log(JSON.stringify(check, null, 2));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
