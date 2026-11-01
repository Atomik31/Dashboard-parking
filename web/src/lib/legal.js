/* Textes juridiques (français). Modèle à relire et à adapter à la situation réelle de l'éditeur. */

export const EDITEUR = 'Codaix';
export const CONTACT = 'contact@codaix.fr';
export const SITE = 'https://parking-aixpress.fr';
export const MAJ_LEGAL = '1er novembre 2026';

const GOOGLE = 'Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, États-Unis';
const AIRTABLE = 'Formagrid, Inc. (Airtable), 155 5th Street, San Francisco, CA 94103, États-Unis';
const HOSTINGER = 'Hostinger International Ltd., 61 Lordou Vironos Street, 6023 Larnaca, Chypre';
const AWS = 'Amazon Web Services EMEA SARL, 38 avenue John F. Kennedy, L-1855 Luxembourg';

export const LEGAL_PAGES = {
  cgu: {
    title: 'Conditions générales d’utilisation',
    sections: [
      {
        h: 'Objet',
        p: [
          `Le site ${SITE} (« le Service ») est un tableau de bord gratuit qui affiche, pour les parkings publics d’Aix-en-Provence, le nombre de places disponibles, une carte et un historique d’occupation. Les présentes conditions régissent son utilisation.`
        ]
      },
      {
        h: 'Accès au Service et compte',
        p: [
          'L’accès au tableau de bord nécessite la création d’un compte (e-mail et mot de passe, ou connexion avec Google). Tu t’engages à fournir une adresse e-mail valide, à garder ton mot de passe confidentiel et à ne pas utiliser le compte d’autrui.',
          'Tu peux supprimer ton compte à tout moment en écrivant à ' + CONTACT + '.'
        ]
      },
      {
        h: 'Origine et exactitude des données',
        p: [
          'Les informations de disponibilité proviennent des sites publics de la Semepa (parkings-semepa.fr). Elles sont collectées automatiquement, avec un décalage pouvant atteindre plusieurs minutes (mise en cache de 10 minutes).',
          'Elles sont fournies à titre indicatif, sans garantie d’exactitude, d’exhaustivité ni de disponibilité. L’éditeur n’est ni affilié ni mandaté par la Semepa ou la Ville d’Aix-en-Provence. Avant tout déplacement, la signalisation sur place fait foi.'
        ]
      },
      {
        h: 'Utilisation acceptable',
        p: [
          'Il est interdit de perturber le Service, de tenter d’en contourner l’authentification ou les limites d’usage, d’en extraire massivement les données par des moyens automatisés, ou de l’utiliser à des fins illicites.'
        ]
      },
      {
        h: 'Responsabilité',
        p: [
          'Le Service est fourni « en l’état », sans garantie de disponibilité continue. L’éditeur ne saurait être tenu responsable d’un dommage résultant d’une information erronée ou d’une indisponibilité (parking complet à l’arrivée, interruption du Service, etc.), dans les limites permises par la loi.'
        ]
      },
      {
        h: 'Propriété intellectuelle',
        p: [
          'Le design, le code et les contenus propres du Service sont protégés. Le fond de carte est fourni par Google ; les données de disponibilité appartiennent à leurs producteurs.'
        ]
      },
      {
        h: 'Modification et droit applicable',
        p: [
          'Les conditions peuvent évoluer ; la version en vigueur est celle publiée sur cette page. Elles sont soumises au droit français. Pour toute question : ' + CONTACT + '.'
        ]
      }
    ]
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    sections: [
      {
        h: 'Responsable du traitement',
        p: [`Le responsable du traitement est ${EDITEUR}, éditeur du Service. Contact : ${CONTACT}.`]
      },
      {
        h: 'Données collectées',
        p: [
          'Lors de la création d’un compte ou de la connexion, nous enregistrons uniquement les informations nécessaires à la gestion de ton compte : tes identifiants de connexion, tes préférences d’affichage et des informations techniques liées à ton compte.',
          'Ton mot de passe n’est jamais connu de l’éditeur : il est géré et protégé par Firebase Authentication. Aucune donnée de localisation, aucune mesure d’audience et aucun traceur publicitaire ne sont collectés. Des journaux techniques peuvent être conservés temporairement par l’hébergeur pour la sécurité et le bon fonctionnement du Service.'
        ]
      },
      {
        h: 'Finalités et bases légales',
        p: [
          'Gérer ton compte et sécuriser l’accès au tableau de bord (exécution du contrat : les conditions d’utilisation).',
          'Tenir un registre des comptes créés, communiquer avec toi en cas de besoin lié au compte et prévenir les abus (intérêt légitime de l’éditeur).'
        ]
      },
      {
        h: 'Destinataires et sous-traitants',
        p: [
          'Tes données ne sont ni vendues ni cédées à des fins commerciales. Elles sont traitées par les prestataires suivants, qui agissent comme sous-traitants :',
          '• Firebase Authentication (' + GOOGLE + ') : création de compte et connexion ;',
          '• Airtable (' + AIRTABLE + ') : registre des comptes ;',
          '• Hostinger (' + HOSTINGER + ') : hébergement du site et de son serveur ;',
          '• Amazon Web Services (' + AWS + ') : stockage de l’historique des places de parking (aucune donnée personnelle).',
          'Le fond de carte est chargé depuis les serveurs de Google, qui reçoivent à cette occasion ton adresse IP et les informations techniques de ton navigateur.',
          'Certains prestataires sont établis aux États-Unis : les transferts sont encadrés par les clauses contractuelles types de la Commission européenne et/ou le Data Privacy Framework.'
        ]
      },
      {
        h: 'Durée de conservation',
        p: [
          'Les données de compte sont conservées tant que ton compte existe, puis supprimées à ta demande ou après 3 ans d’inactivité. Les journaux techniques sont conservés au plus 12 mois. Le choix relatif aux cookies est mémorisé 12 mois.'
        ]
      },
      {
        h: 'Tes droits',
        p: [
          'Conformément au RGPD, tu disposes d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Pour les exercer, écris à ' + CONTACT + ' ; une réponse te sera apportée dans un délai d’un mois.',
          'Si tu estimes que tes droits ne sont pas respectés, tu peux introduire une réclamation auprès de la CNIL (www.cnil.fr).'
        ]
      },
      {
        h: 'Cookies et stockage local',
        p: [
          'Le Service n’utilise que du stockage strictement nécessaire à son fonctionnement, exempté de consentement : session de connexion Firebase (conservée dans ton navigateur pour te reconnecter automatiquement), langue, indicateur d’enregistrement du compte et mémorisation de ton choix sur les cookies (12 mois).',
          'Ton choix de thème d’affichage (clair ou sombre) n’est mémorisé dans ton navigateur que si tu as accepté le stockage optionnel ; sinon il ne vaut que pour la visite en cours. Aucun cookie de mesure d’audience ou de publicité n’est déposé. Si un service optionnel était ajouté un jour, il ne serait activé qu’après ton accord, que tu peux modifier à tout moment via « Gestion des cookies » en bas de page.'
        ]
      },
      {
        h: 'Sécurité',
        p: [
          'Les échanges sont chiffrés (HTTPS), les jetons de connexion sont vérifiés côté serveur et les clés d’accès aux services tiers ne sont jamais exposées dans ton navigateur.'
        ]
      }
    ]
  },
  'mentions-legales': {
    title: 'Mentions légales',
    sections: [
      {
        h: 'Éditeur du site',
        p: [
          `${SITE} est édité par ${EDITEUR}.`,
          'Contact : ' + CONTACT
        ]
      },
      {
        h: 'Hébergement',
        p: ['Site et serveur : ' + HOSTINGER + '.', 'Authentification : ' + GOOGLE + ' (Firebase).']
      },
      {
        h: 'Données de parkings',
        p: [
          'Les disponibilités affichées proviennent des sites de la Semepa. Elles sont fournies sans garantie d’exactitude. L’éditeur n’a aucun lien avec la Semepa ni avec la Ville d’Aix-en-Provence.'
        ]
      },
      {
        h: 'Propriété intellectuelle',
        p: ['Le code, le design et les textes du Service sont protégés. Fond de carte : © Google. Cartographie : Leaflet.']
      },
      {
        h: 'Signalement',
        p: ['Pour signaler un contenu ou un dysfonctionnement, écris à ' + CONTACT + '.']
      }
    ]
  }
};
