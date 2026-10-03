/* ===== Nador-Annonces&Pub : script unifié ===== */

const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lire = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } };
const trouver = id => annonces.find(a => String(a.id) === String(id));
const lireSession = (k, def) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? def; } catch (e) { return def; } };

let estAdmin = lireSession("admin", false);
let utilisateurConnecte = lire("session", null);
let langueActuelle = "fr";
let fichiersUploades = [];
let modeInscription = false;
let categorieActive = "toutes";
let termeRecherche = "";
const indexCarrousel = {};
let sousCategorieActive = null;

/* ===== RÉGLAGES FACILES À MODIFIER ===== */
const VITESSE_FLASH = 40;   // vitesse de la bande Flash en pixels par seconde (plus petit = plus lent)
const CONTACT = {           // coordonnées affichées dans « Nous contacter » (laissez "" pour masquer un moyen)
    whatsapp: "0646938002",
    telephone: "+212646938002",
    email: "nadorannoncepub@gmail.com"
};
const VILLE_INFO = { lat: 35.1681, lon: -2.9335 };   // Nador : position pour la météo et les horaires de prière

/* ---------- Données (avec migration des anciens formats) ---------- */
let annonces = lire("annonces", null) || [{
    id: 1, 
    titre: "Appartement vue mer", 
    categorie: "Immobilier", 
    ville: "Nador", 
    prix: 1200000,
    description: "Superbe appartement rénové avec 3 chambres et terrasse.", 
    telephone: "",
    medias: [
        { type: "image", url: "https://picsum.photos/400/250?random=1" }, 
        { type: "image", url: "https://picsum.photos/400/250?random=2" }
    ],
    auteurEmail: "vendeur@test.com", 
    premium: true, 
    vues: 12, 
    date: 1
}];

annonces.forEach(a => {
    a.medias = (a.medias || []).map(m => typeof m === "string" ? { type: m.startsWith("data:video") ? "video" : "image", url: m } : m);
    a.vues = a.vues || 0; 
    a.date = a.date || (typeof a.id === "number" ? a.id : 0);
    a.categorie = a.categorie || "Autres"; 
    a.telephone = a.telephone || "";
    a.localisation = a.localisation || "";
    a.sousCategorie = a.sousCategorie || "";
});

let flashs = lire("flashs", null) || [{ 
    id: 1, 
    titre: "🔥 Grande Solde d'Été sur les véhicules !", 
    type: "texte", 
    contenu: "Profitez de réductions jusqu'à -20% tout ce mois-ci !" 
}];
let utilisateurs = lire("utilisateurs", []);
flashs.forEach(f => { f.priorite = Number(f.priorite) || 1; });

// Compteur de visiteurs
let nbVisites = parseInt(localStorage.getItem("nbVisites") || "0");
if (!sessionStorage.getItem("visiteComptee")) {
    nbVisites++; 
    localStorage.setItem("nbVisites", nbVisites); 
    sessionStorage.setItem("visiteComptee", "1");
}

function sauvegarder() {
    try {
        localStorage.setItem("annonces", JSON.stringify(annonces));
        localStorage.setItem("flashs", JSON.stringify(flashs));
        localStorage.setItem("utilisateurs", JSON.stringify(utilisateurs));
        return true;
    } catch (e) { 
        alert("Stockage plein : réduisez le nombre/la taille des médias."); 
        return false; 
    }
}

/* ---------- Langues ---------- */
const traductions = {
    fr: { flash_title: "⚡ Flash", deposer_titre: "📢 Déposer une annonce", lbl_titre: "Titre de l'annonce *", lbl_ville: "Ville *", lbl_cat: "Catégorie *", lbl_tel: "Téléphone *", lbl_loc: "Localisation (Google Maps, Waze…) — facultatif", lbl_prix: "Prix (Optionnel)", lbl_desc: "Description détaillée *", btn_suivant: "Suivant ➔", lbl_medias: "Glissez ou sélectionnez vos fichiers (Photos, Vidéos)", btn_retour: "⬅️ Retour", btn_publier: "Publier l'annonce", annonces_titre: "🛒 Annonces récentes", visiteurs: "Visiteurs", vues: "vues" },
    en: { flash_title: "⚡ Featured Listings", deposer_titre: "📢 Post an Ad", lbl_titre: "Ad Title *", lbl_ville: "City *", lbl_cat: "Category *", lbl_tel: "Phone *", lbl_loc: "Location (Google Maps, Waze…) — optional", lbl_prix: "Price (Optional)", lbl_desc: "Detailed Description *", btn_suivant: "Next ➔", lbl_medias: "Drag & drop your files (Photos, Videos)", btn_retour: "⬅️ Back", btn_publier: "Publish Ad", annonces_titre: "🛒 Recent Ads", visiteurs: "Visitors", vues: "views" },
    ar: { flash_title: "⚡ الإعلانات المميزة", deposer_titre: "📢 نشر إعلان", lbl_titre: "عنوان الإعلان *", lbl_ville: "المدينة *", lbl_cat: "الفئة *", lbl_tel: "الهاتف *", lbl_loc: "الموقع (Google Maps، Waze…) — اختياري", lbl_prix: "الثمن (اختياري)", lbl_desc: "وصف مفصل *", btn_suivant: "التالي ➔", lbl_medias: "اسحب الملفات هنا (صور، فيديو)", btn_retour: "⬅️ عودة", btn_publier: "نشر الإعلان", annonces_titre: "🛒 الإعلانات الحديثة", visiteurs: "الزوار", vues: "مشاهدة" }
};

/* Textes supplémentaires de l'interface (cartes, détails, boutons du haut, messages) */
Object.assign(traductions.fr, {
    tagline: "Votre espace incontournable d’annonces et de publicité interactive",
    btn_login: "👤 Se Connecter", btn_publier_top: "➕ Publier une annonce", btn_admin: "🔑 Admin", btn_logout: "Déconnexion",
    btn_rechercher: "🔍 Rechercher", placeholder_recherche: "Rechercher une annonce (titre, description, ville, catégorie)...",
    bonjour: "Bonjour", voir_plus: "Voir plus", prix_non_specifie: "Prix non spécifié", devise: "DH", pas_image: "Pas d'image",
    prem_titre: "⭐ Annonces Premium", autres_annonces: "Autres annonces",
    aucune_annonce: "Aucune annonce pour le moment.", aucune_categorie: "Aucune annonce dans cette catégorie.", aucun_resultat: "Aucun résultat pour « {q} ».",
    lbl_categorie: "Catégorie", ville_det: "Ville", lbl_vues: "Vues", lbl_contact: "Contact", lbl_galerie: "Galerie",
    galerie_astuce: "(cliquez sur une photo pour l'agrandir)", cliquer_agrandir: "Cliquer pour agrandir", lbl_localisation: "Localisation",
    btn_appeler: "Appeler", retour_accueil: "Retour à l'accueil", modifier: "Modifier", supprimer: "Supprimer",
    loc_waze: "Ouvrir dans Waze", loc_gmaps: "Ouvrir dans Google Maps", loc_autre: "Ouvrir la localisation", maroc: "Maroc",
    trad_auto: "🌐 Le contenu des annonces est traduit automatiquement (des erreurs sont possibles).",
    trad_indisponible: "⚠️ Traduction automatique indisponible pour le moment : le texte original est affiché.",
    note_trad: "🌐 Traduit automatiquement"
});
Object.assign(traductions.en, {
    tagline: "Your go-to space for classified ads and interactive advertising",
    btn_login: "👤 Log in", btn_publier_top: "➕ Post an ad", btn_admin: "🔑 Admin", btn_logout: "Log out",
    btn_rechercher: "🔍 Search", placeholder_recherche: "Search an ad (title, description, city, category)...",
    bonjour: "Hello", voir_plus: "See more", prix_non_specifie: "Price not specified", devise: "DH", pas_image: "No image",
    prem_titre: "⭐ Premium Ads", autres_annonces: "Other ads",
    aucune_annonce: "No ads yet.", aucune_categorie: "No ads in this category.", aucun_resultat: "No results for “{q}”.",
    lbl_categorie: "Category", ville_det: "City", lbl_vues: "Views", lbl_contact: "Contact", lbl_galerie: "Gallery",
    galerie_astuce: "(click a photo to enlarge it)", cliquer_agrandir: "Click to enlarge", lbl_localisation: "Location",
    btn_appeler: "Call", retour_accueil: "Back to home", modifier: "Edit", supprimer: "Delete",
    loc_waze: "Open in Waze", loc_gmaps: "Open in Google Maps", loc_autre: "Open location", maroc: "Morocco",
    trad_auto: "🌐 Ad content is automatically translated (mistakes are possible).",
    trad_indisponible: "⚠️ Automatic translation is unavailable right now: the original text is shown.",
    note_trad: "🌐 Automatically translated"
});
Object.assign(traductions.ar, {
    tagline: "فضاؤك الأمثل للإعلانات والإشهار التفاعلي",
    btn_login: "👤 تسجيل الدخول", btn_publier_top: "➕ نشر إعلان", btn_admin: "🔑 المشرف", btn_logout: "تسجيل الخروج",
    btn_rechercher: "🔍 بحث", placeholder_recherche: "ابحث عن إعلان (العنوان، الوصف، المدينة، الفئة)...",
    bonjour: "مرحبا", voir_plus: "عرض المزيد", prix_non_specifie: "الثمن غير محدد", devise: "درهم", pas_image: "لا توجد صورة",
    prem_titre: "⭐ إعلانات مميزة (Premium)", autres_annonces: "إعلانات أخرى",
    aucune_annonce: "لا توجد إعلانات حاليا.", aucune_categorie: "لا توجد إعلانات في هذه الفئة.", aucun_resultat: "لا توجد نتائج لـ «{q}».",
    lbl_categorie: "الفئة", ville_det: "المدينة", lbl_vues: "المشاهدات", lbl_contact: "للتواصل", lbl_galerie: "المعرض",
    galerie_astuce: "(انقر على صورة لتكبيرها)", cliquer_agrandir: "انقر للتكبير", lbl_localisation: "الموقع",
    btn_appeler: "اتصال", retour_accueil: "العودة إلى الرئيسية", modifier: "تعديل", supprimer: "حذف",
    loc_waze: "فتح في Waze", loc_gmaps: "فتح في خرائط Google", loc_autre: "فتح الموقع", maroc: "المغرب",
    trad_auto: "🌐 يتم ترجمة محتوى الإعلانات تلقائيا (قد تحدث أخطاء).",
    trad_indisponible: "⚠️ الترجمة التلقائية غير متاحة حاليا: يتم عرض النص الأصلي.",
    note_trad: "🌐 مترجم تلقائيا"
});

/* ===== Textes des nouvelles fonctions (contact, sous-catégories, infos pratiques, localisation, page de détail) ===== */
function ajoutTrad(cle, fr, en, ar) { traductions.fr[cle] = fr; traductions.en[cle] = en; traductions.ar[cle] = ar; }
ajoutTrad("btn_contact", "📞 Nous contacter", "📞 Contact us", "📞 اتصل بنا");
ajoutTrad("contact_titre", "📞 Nous contacter", "📞 Contact us", "📞 اتصل بنا");
ajoutTrad("contact_intro", "Écrivez-nous : choisissez le moyen qui vous convient.", "Write to us: pick the way that suits you.", "راسلنا: اختر الوسيلة التي تناسبك.");
ajoutTrad("contact_nom", "Votre nom", "Your name", "اسمك");
ajoutTrad("contact_msg", "Votre message", "Your message", "رسالتك");
ajoutTrad("contact_wa", "💬 Envoyer par WhatsApp", "💬 Send via WhatsApp", "💬 إرسال عبر واتساب");
ajoutTrad("contact_mail", "✉️ Envoyer par e-mail", "✉️ Send by e-mail", "✉️ إرسال عبر البريد");
ajoutTrad("contact_tel", "📞 Appeler", "📞 Call", "📞 اتصال");
ajoutTrad("contact_vide", "Les coordonnées de contact seront bientôt disponibles.", "Contact details will be available soon.", "ستتوفر وسائل الاتصال قريبا.");
ajoutTrad("contact_sujet", "Message depuis Nador-Annonces", "Message from Nador-Annonces", "رسالة من Nador-Annonces");
ajoutTrad("lbl_souscat", "Sous-catégorie (facultatif)", "Subcategory (optional)", "الفئة الفرعية (اختياري)");
ajoutTrad("sous_aucune", "— Aucune —", "— None —", "— بدون —");
ajoutTrad("sous_tout", "Toute la catégorie", "Whole category", "كل الفئة");
ajoutTrad("sous_aria", "Sous-catégories", "Subcategories", "الفئات الفرعية");
ajoutTrad("filtre", "Filtre", "Filter", "تصفية");
ajoutTrad("retirer_filtre", "Retirer le filtre", "Remove filter", "إزالة التصفية");
ajoutTrad("info_medias", "Autant de photos que vous voulez · vidéos 2 Mo max · facultatif", "As many photos as you like · videos 2 MB max · optional", "عدد غير محدود من الصور · الفيديو 2 ميغا كحد أقصى · اختياري");
ajoutTrad("det_annonce", "📢 Annonce", "📢 Ad", "📢 إعلان");
ajoutTrad("det_flash", "⚡ Flash info", "⚡ Flash news", "⚡ خبر عاجل");
ajoutTrad("loc_gps", "📍 Ma position actuelle", "📍 My current location", "📍 موقعي الحالي");
ajoutTrad("loc_choisir", "🗺️ Choisir sur Google Maps", "🗺️ Pick on Google Maps", "🗺️ اختيار على خرائط Google");
ajoutTrad("loc_gps_attente", "Recherche de votre position…", "Finding your position…", "جارٍ تحديد موقعك…");
ajoutTrad("loc_gps_ok", "✅ Position ajoutée.", "✅ Position added.", "✅ تمت إضافة الموقع.");
ajoutTrad("loc_gps_err", "Position impossible : autorisez la localisation dans votre navigateur.", "Could not get your position: please allow location access.", "تعذر تحديد الموقع: اسمح بالوصول إلى الموقع.");
ajoutTrad("loc_gps_non", "La localisation n'est pas disponible sur cet appareil.", "Location is not available on this device.", "تحديد الموقع غير متاح على هذا الجهاز.");
ajoutTrad("loc_lien_extrait", "✅ Lien détecté dans le texte partagé.", "✅ Link detected in the shared text.", "✅ تم التقاط الرابط من النص المشارك.");
ajoutTrad("info_titre", "ℹ️ Infos pratiques — Nador", "ℹ️ Useful info — Nador", "ℹ️ معلومات مفيدة — الناظور");
ajoutTrad("info_priere", "Horaires de prière", "Prayer times", "أوقات الصلاة");
ajoutTrad("info_meteo", "Météo", "Weather", "الطقس");
ajoutTrad("info_trains", "Trains", "Trains", "القطارات");
ajoutTrad("info_pharmacies", "Pharmacies de garde", "On-duty pharmacies", "الصيدليات المداومة");
ajoutTrad("info_numeros", "Numéros utiles", "Useful numbers", "أرقام مفيدة");
ajoutTrad("info_chargement", "Chargement…", "Loading…", "جارٍ التحميل…");
ajoutTrad("info_erreur", "Informations indisponibles pour le moment.", "Information unavailable right now.", "المعلومات غير متوفرة حاليا.");
ajoutTrad("info_hors_ligne", "Connexion indisponible : dernières données enregistrées.", "No connection: last saved data shown.", "لا يوجد اتصال: عرض آخر البيانات المحفوظة.");
ajoutTrad("info_prochaine", "prochaine", "next", "التالية");
ajoutTrad("info_source_priere", "Mise à jour automatique chaque jour (source : Aladhan, méthode Maroc).", "Updated automatically every day (source: Aladhan, Morocco method).", "تحديث تلقائي كل يوم (المصدر: Aladhan، طريقة المغرب).");
ajoutTrad("info_source_meteo", "Actualisée automatiquement toutes les 30 minutes (source : Open-Meteo).", "Updated automatically every 30 minutes (source: Open-Meteo).", "تحديث تلقائي كل 30 دقيقة (المصدر: Open-Meteo).");
ajoutTrad("info_humidite", "Humidité", "Humidity", "الرطوبة");
ajoutTrad("info_vent", "Vent", "Wind", "الرياح");
ajoutTrad("info_maj", "Mis à jour le", "Updated on", "آخر تحديث");
ajoutTrad("info_aucune", "Aucune information enregistrée pour le moment. Consultez les sites officiels ci-dessous.", "Nothing saved yet. See the official sites below.", "لا توجد معلومات مسجلة حاليا. راجع المواقع الرسمية أدناه.");
ajoutTrad("info_modifier", "✏️ Mettre à jour", "✏️ Update", "✏️ تحديث");
ajoutTrad("info_sites", "Sites officiels marocains", "Official Moroccan websites", "مواقع مغربية رسمية");
ajoutTrad("num_police", "Police", "Police", "الشرطة");
ajoutTrad("num_gendarmerie", "Gendarmerie Royale", "Royal Gendarmerie", "الدرك الملكي");
ajoutTrad("num_pompiers", "Protection civile (pompiers)", "Civil protection (fire brigade)", "الوقاية المدنية (المطافئ)");
ajoutTrad("num_samu", "Ambulance / SAMU", "Ambulance / SAMU", "سيارة الإسعاف");
["Fajr:الفجر:Fajr:Fajr", "Sunrise:الشروق:Sunrise:Lever du soleil", "Dhuhr:الظهر:Dhuhr:Dhuhr", "Asr:العصر:Asr:Asr", "Maghrib:المغرب:Maghrib:Maghrib", "Isha:العشاء:Isha:Isha"].forEach(x => {
    const [k, ar, en, fr] = x.split(":");
    ajoutTrad("p_" + k, fr, en, ar);
});

const t = k => (traductions[langueActuelle] && traductions[langueActuelle][k]) ?? traductions.fr[k] ?? k;

function changerLangue(lang) {
    if (!traductions[lang]) lang = "fr";
    langueActuelle = lang;
    echecTrad = false;
    try { localStorage.setItem("langue", JSON.stringify(lang)); } catch (e) {}
    document.documentElement.lang = lang;
    document.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const v = traductions[lang][el.dataset.i18n];
        if (v) el.textContent = v;
    });
    const champ = $("champ-recherche");
    if (champ) champ.placeholder = t("placeholder_recherche");
    majTitresCategories();
    afficherStats();
    majUI();   // réaffiche flashs + annonces (avec traduction du contenu)
    majSousCatDepot();
    rendreDetail();
}

function afficherStats() { 
    $("txt-visites").textContent = `${t("visiteurs")} : ${nbVisites}`; 
}

/* ---------- Traduction automatique du contenu des annonces ----------
   Les données d'origine ne sont JAMAIS modifiées : on traduit seulement l'affichage.
   Service utilisé : MyMemory (gratuit, sans clé). Pour changer de service (DeepL, Google Cloud…),
   il suffit de modifier la fonction traduireMorceau() ci-dessous. */
const cacheTrad = new Map();
try { Object.entries(lireSession("cacheTrad", {})).forEach(([k, v]) => cacheTrad.set(k, v)); } catch (e) {}
const enCoursTrad = new Map();
let pauseTradJusqua = 0;   // après un échec, on attend 1 minute avant de réessayer
let echecTrad = false;

const hashTexte = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + "-" + s.length; };

/* Langue du texte : arabe si plus de lettres arabes que latines, sinon français (langue du site) */
function langueDuTexte(txt) {
    const ar = (String(txt).match(/[\u0600-\u06FF]/g) || []).length;
    const lat = (String(txt).match(/[A-Za-zÀ-ÿ]/g) || []).length;
    return ar > lat ? "ar" : "fr";
}

function sauverCacheTrad() {
    try { sessionStorage.setItem("cacheTrad", JSON.stringify(Object.fromEntries(Array.from(cacheTrad.entries()).slice(-300)))); } catch (e) {}
}

/* Découpe un long texte en morceaux (le service accepte ~500 octets par requête), sans perdre un seul caractère */
function decouper(texte, max = 450) {
    const octets = s => new TextEncoder().encode(s).length;
    const morceaux = [];
    let cur = "";
    const ajouter = s => {
        if (octets(cur + s) <= max) { cur += s; return; }
        if (cur) { morceaux.push(cur); cur = ""; }
        cur = s;
    };
    const phrases = texte.match(/[^.!?؟…\n]*[.!?؟…]+\s*|[^.!?؟…\n]+\s*|\s+/g) || [];
    for (const ph of phrases) {
        if (octets(ph) <= max) { ajouter(ph); continue; }
        for (const mot of ph.match(/\S+\s*|\s+/g) || []) {
            if (octets(mot) <= max) { ajouter(mot); continue; }
            for (let i = 0; i < mot.length; i += 100) ajouter(mot.slice(i, i + 100));
        }
    }
    if (cur) morceaux.push(cur);
    return morceaux;
}

const decoderHTML = s => { const d = document.createElement("textarea"); d.innerHTML = s; return d.value; };

/* Au plus 3 requêtes en même temps */
let tradActifs = 0;
const tradAttente = [];
function limiter(fn) {
    return new Promise(resolve => {
        const lancer = () => {
            tradActifs++;
            fn().then(resolve, () => resolve(null)).finally(() => {
                tradActifs--;
                if (tradAttente.length) tradAttente.shift()();
            });
        };
        if (tradActifs < 3) lancer(); else tradAttente.push(lancer);
    });
}

/* Traduit UN morceau. Retourne le texte traduit, ou null en cas d'échec (réseau, quota dépassé…) */
async function traduireMorceau(txt, src, cible) {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), 10000);
    try {
        const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(txt) + "&langpair=" + src + "|" + cible;
        const rep = await fetch(url, { signal: ctrl.signal });
        if (!rep.ok) return null;
        const j = await rep.json();
        const res = j && j.responseData && j.responseData.translatedText;
        if (Number(j.responseStatus) !== 200 || !res || /MYMEMORY WARNING|INVALID|QUERY LENGTH LIMIT/i.test(res)) return null;
        return decoderHTML(res);
    } catch (e) {
        return null;
    } finally {
        clearTimeout(minuteur);
    }
}

/* Traduction déjà connue (immédiate) ou null */
function traductionCachee(texte, cible) {
    if (!String(texte || "").trim() || langueDuTexte(texte) === cible) return null;
    const v = cacheTrad.get(cible + "|" + hashTexte(texte));
    return v === undefined ? null : v;
}

/* Traduit un texte vers la langue « cible » ; résout null si inutile ou impossible */
function traduireTexte(texte, cible) {
    texte = String(texte ?? "");
    if (!texte.trim()) return Promise.resolve(null);
    const src = langueDuTexte(texte);
    if (src === cible) return Promise.resolve(null);
    const cle = cible + "|" + hashTexte(texte);
    if (cacheTrad.has(cle)) return Promise.resolve(cacheTrad.get(cle));
    if (enCoursTrad.has(cle)) return enCoursTrad.get(cle);
    if (Date.now() < pauseTradJusqua) { echecTrad = true; return Promise.resolve(null); }

    const p = (async () => {
        const sortie = [];
        for (const m of decouper(texte)) {
            const coeur = m.trim();
            if (!coeur) { sortie.push(m); continue; }
            const tr = await limiter(() => traduireMorceau(coeur, src, cible));
            if (tr === null) { pauseTradJusqua = Date.now() + 60000; echecTrad = true; return null; }
            sortie.push(m.match(/^\s*/)[0] + tr + m.match(/\s*$/)[0]);
        }
        const resultat = sortie.join("");
        cacheTrad.set(cle, resultat);
        sauverCacheTrad();
        echecTrad = false;
        return resultat;
    })();
    enCoursTrad.set(cle, p);
    p.finally(() => enCoursTrad.delete(cle));
    return p;
}

/* Texte d'origine (français ou arabe, tel que saisi) d'un élément marqué data-trad */
const extraitTraduisible = a => {
    const d = String(a.description || "");
    return d.length > 100 ? d.substring(0, 100).replace(/\s+\S*$/, "") : d;
};

function texteOriginal(el) {
    const d = el.dataset;
    if (d.aid) {
        const a = trouver(d.aid);
        if (!a) return "";
        if (d.trad === "titre") return a.titre;
        if (d.trad === "desc") return a.description;
        if (d.trad === "extrait") return extraitTraduisible(a);
    } else if (d.fid) {
        const f = flashs.find(x => String(x.id) === String(d.fid));
        if (!f) return "";
        if (d.trad === "titre") return f.titre;
        if (d.trad === "contenu" && f.type !== "image" && f.type !== "video") return f.contenu;
    }
    return "";
}

function poserTraduction(el, texte) {
    el.textContent = texte;
    if (el.id === "det-desc") {
        const n = $("det-note-trad");
        if (n) { n.textContent = t("note_trad"); n.hidden = false; }
    }
}

function majMessageTraduction() {
    const m = $("msg-traduction");
    if (!m) return;
    const visible = langueActuelle !== "fr" || echecTrad;
    m.hidden = !visible;
    m.classList.toggle("alerte", echecTrad);
    m.textContent = echecTrad ? t("trad_indisponible") : t("trad_auto");
}

/* Traduit tous les éléments [data-trad] d'une zone : immédiatement si en cache, sinon dès que possible */
function appliquerTraductions(racine) {
    const cible = langueActuelle;
    const taches = [];
    racine.querySelectorAll("[data-trad]").forEach(el => {
        const orig = texteOriginal(el);
        if (!orig) return;
        const suffixe = el.dataset.suffix || "";
        const deja = traductionCachee(orig, cible);
        if (deja !== null) { poserTraduction(el, deja + suffixe); return; }
        if (langueDuTexte(orig) === cible) return;
        taches.push(traduireTexte(orig, cible).then(res => {
            if (res && langueActuelle === cible && el.isConnected) poserTraduction(el, res + suffixe);
        }));
    });
    majMessageTraduction();
    if (taches.length) Promise.all(taches).then(majMessageTraduction);
}

/* ---------- Modales & comptes ---------- */
function fermerModal(id) { $(id).close(); }
function ouvrirModalAdmin() { $("modal-admin").showModal(); }
function ouvrirModalUser() { $("modal-user").showModal(); }

function basculerModeUser() {
    modeInscription = !modeInscription;
    $("grp-user-nom").style.display = modeInscription ? "block" : "none";
    $("titre-user-modal").textContent = modeInscription ? "Inscription" : "Connexion Annonceur";
    $("btn-valider-user").textContent = modeInscription ? "S'inscrire" : "Se connecter";
    $("btn-toggle-auth").textContent = modeInscription ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire";
}

async function hacher(txt) {
    if (window.crypto && crypto.subtle) {
        const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
        return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
    }
    return btoa(unescape(encodeURIComponent(txt)));
}

$("form-user-auth").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("u-email").value.trim().toLowerCase();
    const hash = await hacher($("u-mdp").value);
    let u = utilisateurs.find(x => x.email === email);
    
    if (modeInscription) {
        if (u) return alert("Ce compte existe déjà.");
        u = { email, nom: $("u-nom").value.trim() || email.split("@")[0], hash };
        utilisateurs.push(u); 
        sauvegarder();
    } else if (!u || u.hash !== hash) {
        return alert("Email ou mot de passe incorrect.");
    }
    
    utilisateurConnecte = { email: u.email, nom: u.nom }; 
    estAdmin = false;
    sessionStorage.removeItem("admin"); 
    localStorage.setItem("session", JSON.stringify(utilisateurConnecte));
    $("form-user-auth").reset(); 
    fermerModal("modal-user"); 
    majUI();
});

function deconnexion() {
    estAdmin = false; 
    utilisateurConnecte = null; 
    sessionStorage.removeItem("admin"); 
    localStorage.removeItem("session"); 
    majUI();
}

function majUI() {
    const co = !!utilisateurConnecte;
    $("btn-admin-panel").style.display = estAdmin ? "inline-block" : "none";   // l'icône Admin n'est vue que par l'admin
    $("btn-login-user").style.display = co ? "none" : "inline-block";
    $("btn-logout").style.display = co ? "inline-block" : "none";
    $("btn-gerer-flash").style.display = estAdmin ? "inline-block" : "none";
    $("label-user-connecte").textContent = co ? `${estAdmin ? "🔑 " : ""}${t("bonjour")}, ${utilisateurConnecte.nom} ${estAdmin ? "(Admin)" : ""}` : "";
    afficherFlashs();
    afficherAnnonces();
    if (categorieActive === "infos pratiques") afficherInfosPratiques();
}

function ouvrirMenuAdmin() { if (estAdmin) $("modal-admin-menu").showModal(); }

/* L'accès à la connexion admin est discret (invisible pour les visiteurs) :
   5 clics rapides sur le titre du site, ou Ctrl+Maj+A, ou l'adresse …/index.html#admin */
function brancherAccesAdmin() {
    const titre = document.querySelector(".brand-title");
    let clics = 0, minuteur;
    if (titre) titre.addEventListener("click", () => {
        clics++;
        clearTimeout(minuteur);
        minuteur = setTimeout(() => { clics = 0; }, 2000);
        if (clics >= 5) { clics = 0; if (!estAdmin) ouvrirModalAdmin(); }
    });
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.shiftKey && String(e.key).toLowerCase() === "a") { e.preventDefault(); if (!estAdmin) ouvrirModalAdmin(); }
    });
    if (location.hash === "#admin") {
        history.replaceState(null, "", location.pathname + location.search);
        if (!estAdmin) ouvrirModalAdmin();
    }
}

/* ---------- Nous contacter ---------- */
function ouvrirContact() {
    const z = $("contact-actions");
    const msg = () => ($("ct-nom").value.trim() ? $("ct-nom").value.trim() + " : " : "") + $("ct-msg").value.trim();
    z.innerHTML = "";
    const bouton = (texte, action) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn"; b.textContent = texte; b.onclick = action;
        z.appendChild(b);
    };
    if (CONTACT.whatsapp) bouton(t("contact_wa"), () => window.open("https://wa.me/" + lienTel(CONTACT.whatsapp) + "?text=" + encodeURIComponent(msg()), "_blank", "noopener"));
    if (CONTACT.email) bouton(t("contact_mail"), () => { location.href = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent(t("contact_sujet")) + "&body=" + encodeURIComponent(msg()); });
    if (CONTACT.telephone) bouton(t("contact_tel") + " " + CONTACT.telephone, () => { location.href = "tel:+" + lienTel(CONTACT.telephone); });
    if (!z.children.length) z.innerHTML = `<p class="petit-info">${esc(t("contact_vide"))}</p>`;
    $("modal-contact").showModal();
}

/* ---------- Flash info ---------- */
/* Premier média d'un flash (nouveaux flashs : medias[], anciens : contenu) */
function flashMedia(f) {
    if (f.type === "image" || f.type === "video") return { type: f.type, url: f.contenu };
    return (f.medias || [])[0] || null;
}

/* Ordre d'apparition selon la priorité choisie par l'admin :
   urgente (3) = en premier ET répétée au milieu du tour ; haute (2) = en premier ; normale (1) = ensuite */
function sequenceFlash() {
    const p = f => Number(f.priorite) || 1;
    const tri = flashs.slice().sort((a, b) => p(b) - p(a));
    const urg = tri.filter(f => p(f) >= 3);
    const reste = tri.filter(f => p(f) < 3);
    if (!urg.length || reste.length < 2) return tri;
    const m = Math.ceil(reste.length / 2);
    return [...urg, ...reste.slice(0, m), ...urg, ...reste.slice(m)];
}

function creerItemFlash(f) {
    const item = document.createElement("div");
    item.className = "marquee-item" + ((Number(f.priorite) || 1) >= 2 ? " flash-prioritaire" : "");
    item.onclick = () => ouvrirDetailFlash(f.id);

    const m = flashMedia(f);
    if (m) {
        const vignette = document.createElement(m.type === "video" ? "video" : "img");
        vignette.className = "flash-thumb";
        vignette.src = m.url;
        if (m.type === "video") { vignette.muted = true; vignette.preload = "metadata"; }
        item.appendChild(vignette);
    }

    const texte = document.createElement("span");
    texte.className = "flash-texte";
    texte.textContent = f.titre;
    texte.dataset.fid = f.id;
    texte.dataset.trad = "titre";
    item.appendChild(texte);

    if (estAdmin) {   // boutons modifier / supprimer visibles seulement pour l'admin
        const bm = document.createElement("button");
        bm.className = "flash-act"; bm.type = "button"; bm.title = "Modifier"; bm.textContent = "✏️";
        bm.onclick = e => { e.stopPropagation(); ouvrirGestionFlash(f.id); };
        const bs = document.createElement("button");
        bs.className = "flash-act"; bs.type = "button"; bs.title = "Supprimer"; bs.textContent = "🗑️";
        bs.onclick = e => { e.stopPropagation(); supprimerFlash(f.id); };
        item.append(bm, bs);
    }
    return item;
}

function construireUniteFlash(seq, copies) {
    const u = document.createElement("div");
    u.className = "marquee-unite";
    for (let i = 0; i < copies; i++) seq.forEach(f => u.appendChild(creerItemFlash(f)));
    return u;
}

/* Bande en boucle continue : le même « tour » est répété deux fois, la bande glisse de la moitié de sa largeur puis recommence sans coupure */
function ajusterVitesseFlash() {
    const c = $("bande-flash");
    const u = c && c.firstElementChild;
    if (!u) return;
    c.style.animationDuration = Math.max(15, (u.offsetWidth || 600) / VITESSE_FLASH) + "s";
}

function afficherFlashs() {
    const c = $("bande-flash");
    c.innerHTML = "";
    const seq = sequenceFlash();
    if (!seq.length) return;

    let u = construireUniteFlash(seq, 1);
    c.appendChild(u);
    const largeurBande = c.parentElement.clientWidth || window.innerWidth;
    const l = u.offsetWidth;
    let copies = l > 1 ? Math.ceil(largeurBande / l) : 2;
    if (seq.some(f => flashMedia(f))) copies++;      // marge : les vignettes n'ont pas encore leur taille finale
    if (copies > 1) { c.innerHTML = ""; u = construireUniteFlash(seq, copies); c.appendChild(u); }
    c.appendChild(construireUniteFlash(seq, copies));

    ajusterVitesseFlash();
    c.querySelectorAll("img.flash-thumb").forEach(i => i.addEventListener("load", ajusterVitesseFlash));
    appliquerTraductions(c);
}

/* Tous les médias d'un flash (anciens flashs : média stocké dans « contenu ») */
function flashTousMedias(f) {
    const liste = [];
    if (f.type === "image" || f.type === "video") liste.push({ type: f.type, url: f.contenu });
    (f.medias || []).forEach(m => liste.push(m));
    return liste;
}

function ouvrirDetailFlash(id) {
    const f = flashs.find(x => String(x.id) === String(id));
    if (!f) return;
    afficherDetailFlash(f, false);
}

function afficherDetailFlash(f, relance) {
    detailCourant = { type: "f", id: f.id };
    const texte = (f.type !== "image" && f.type !== "video" && f.contenu)
        ? `<p class="detail-desc" style="white-space:pre-wrap;" data-fid="${esc(f.id)}" data-trad="contenu">${esc(f.contenu)}</p>` : "";
    const html = `<article class="detail-article">
        <h2 data-fid="${esc(f.id)}" data-trad="titre">${esc(f.titre)}</h2>
        ${texte}
        ${galerieHTML(flashTousMedias(f), i => `ouvrirZoomFlash('${esc(f.id)}', ${i})`)}
    </article>`;
    ouvrirPageDetail(html, t("det_flash"), "flash-" + f.id, relance);
    appliquerTraductions($("contenu-page-detail"));
}

let flashEnEdition = null;   // id du flash en cours de modification (null = ajout)

function rafraichirListeFlash() {
    $("liste-flashs-admin").innerHTML = flashs.length ? flashs.map(f => `
        <div class="flash-admin-ligne${String(f.id) === String(flashEnEdition) ? " en-edition" : ""}">
            <span>${(Number(f.priorite) || 1) >= 3 ? "🔥 " : (Number(f.priorite) || 1) === 2 ? "⬆️ " : ""}${esc(f.titre)}</span>
            <button type="button" onclick="modifierFlash('${esc(f.id)}')" title="Modifier">✏️</button>
            <button type="button" onclick="supprimerFlash('${esc(f.id)}')" title="Supprimer">🗑️</button>
        </div>
    `).join("") : "<p>Aucun flash pour le moment.</p>";
}

function modeFlash(edition) {
    $("titre-gerer-flash").textContent = edition ? "Modifier le Flash Info (Admin)" : "Ajouter un Flash Info (Admin)";
    $("btn-valider-flash").textContent = edition ? "Enregistrer les modifications" : "Ajouter au Flash";
    $("btn-annuler-flash").style.display = edition ? "inline-block" : "none";
}

function annulerEditionFlash() {
    flashEnEdition = null;
    $("form-ajouter-flash").reset();
    mediasFlash.length = 0;
    dessinerFlash();
    modeFlash(false);
    rafraichirListeFlash();
}

function ouvrirGestionFlash(id) {
    if (!estAdmin) return;
    annulerEditionFlash();
    $("modal-gerer-flash").showModal();
    if (id !== undefined) modifierFlash(id);
}

function modifierFlash(id) {
    const f = flashs.find(x => String(x.id) === String(id));
    if (!estAdmin || !f) return;
    flashEnEdition = f.id;
    $("f-titre").value = f.titre || "";
    $("f-priorite").value = String(Number(f.priorite) || 1);
    $("f-contenu").value = (f.type === "image" || f.type === "video") ? "" : (f.contenu || "");
    mediasFlash.length = 0;
    // anciens flashs dont le média était stocké dans « contenu »
    if (f.type === "image" || f.type === "video") mediasFlash.push({ type: f.type, url: f.contenu });
    (f.medias || []).forEach(m => mediasFlash.push(m));
    dessinerFlash();
    modeFlash(true);
    rafraichirListeFlash();
    $("f-titre").focus();
}

$("form-ajouter-flash").addEventListener("submit", e => {
    e.preventDefault();
    if (!estAdmin) return;
    const champs = { titre: $("f-titre").value.trim(), type: "texte", contenu: $("f-contenu").value, medias: mediasFlash.slice(), priorite: Number($("f-priorite").value) || 1 };

    if (flashEnEdition !== null) {
        const f = flashs.find(x => String(x.id) === String(flashEnEdition));
        const avant = { ...f };
        Object.assign(f, champs);
        if (!sauvegarder()) { Object.assign(f, avant); return; }
    } else {
        flashs.push({ id: Date.now(), ...champs });
        if (!sauvegarder()) { flashs.pop(); return; }
    }

    afficherFlashs();
    annulerEditionFlash();
    fermerModal("modal-gerer-flash");
});

function supprimerFlash(id) {
    if (!estAdmin) return;
    if (!confirm("Supprimer ce flash ?")) return;
    flashs = flashs.filter(f => String(f.id) !== String(id));
    sauvegarder();
    afficherFlashs();
    if (String(flashEnEdition) === String(id)) annulerEditionFlash(); else rafraichirListeFlash();
}

/* ---------- Médias du Flash (admin) ---------- */
const mediasFlash = [];
const dessinerFlash = brancherZone("drop-flash", "f-fichiers", "apercu-flash", mediasFlash, 10);

/* ---------- Catégories ---------- */
const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const CATS_CONNUES = ["immobilier", "vehicules", "emploi", "commerce", "services", "formation", "telephones et informatique", "infos pratiques"];
const ALIAS_CATS = { "high-tech": "telephones et informatique", "hightech": "telephones et informatique", "divers": "autres" };

/* Ramène une catégorie (ancienne ou saisie librement) à une clé connue ; le reste tombe dans « autres » */
function cleCategorie(c) {
    const n = norm(c);
    const k = ALIAS_CATS[n] || n;
    return CATS_CONNUES.includes(k) ? k : "autres";
}

/* Sous-catégories : [français (valeur enregistrée), anglais, arabe] */
const SOUS_CATS = {
    "immobilier": [["Vente", "For sale", "بيع"], ["Location", "For rent", "كراء"], ["Location vacances", "Holiday rentals", "كراء العطل"], ["Terrains", "Land", "أراضي"], ["Locaux commerciaux", "Commercial premises", "محلات تجارية"], ["Colocation", "Flatshare", "سكن مشترك"]],
    "vehicules": [["Voitures", "Cars", "سيارات"], ["Motos", "Motorbikes", "دراجات نارية"], ["Camions et utilitaires", "Trucks & vans", "شاحنات وسيارات نفعية"], ["Pièces et accessoires", "Parts & accessories", "قطع غيار وملحقات"], ["Vélos", "Bikes", "دراجات هوائية"]],
    "emploi": [["Offres d'emploi", "Job offers", "عروض الشغل"], ["Demandes d'emploi", "Job seekers", "طلبات الشغل"], ["Stages", "Internships", "تداريب"], ["Freelance", "Freelance", "عمل حر"]],
    "commerce": [["Mode et vêtements", "Fashion & clothing", "أزياء وملابس"], ["Maison et meubles", "Home & furniture", "المنزل والأثاث"], ["Électroménager", "Appliances", "أجهزة كهرومنزلية"], ["Alimentation", "Food", "مواد غذائية"], ["Artisanat", "Crafts", "صناعة تقليدية"]],
    "services": [["Bâtiment et travaux", "Construction & works", "بناء وأشغال"], ["Transport et déménagement", "Transport & moving", "نقل وترحيل"], ["Santé et beauté", "Health & beauty", "صحة وجمال"], ["Réparation", "Repairs", "إصلاح"], ["Événements", "Events", "مناسبات"]],
    "formation": [["Cours particuliers", "Private lessons", "دروس خصوصية"], ["Langues", "Languages", "لغات"], ["Informatique", "Computing", "إعلاميات"], ["Formation professionnelle", "Vocational training", "تكوين مهني"]],
    "telephones et informatique": [["Téléphones", "Phones", "هواتف"], ["Ordinateurs", "Computers", "حواسيب"], ["Tablettes", "Tablets", "لوحات إلكترونية"], ["Accessoires", "Accessories", "ملحقات"], ["Réparation", "Repairs", "إصلاح"]],
    "infos pratiques": [["Horaires de prière", "Prayer times", "أوقات الصلاة"], ["Trains", "Trains", "القطارات"], ["Pharmacies de garde", "On-duty pharmacies", "الصيدليات المداومة"], ["Météo", "Weather", "الطقس"], ["Numéros utiles", "Useful numbers", "أرقام مفيدة"], ["Sites officiels", "Official websites", "مواقع رسمية"]]
};

const idxLangue = () => ({ fr: 0, en: 1, ar: 2 }[langueActuelle] ?? 0);

function nomSousCat(catCle, fr) {
    const l = (SOUS_CATS[catCle] || []).find(x => norm(x[0]) === norm(fr));
    return l ? l[idxLangue()] : fr;
}

function filtrerParCategorie(liste) {
    if (categorieActive === "toutes") return liste;
    let r = liste.filter(a => cleCategorie(a.categorie) === categorieActive);
    // « Infos pratiques » : les sous-catégories pilotent les blocs d'infos, pas le filtre des annonces
    if (sousCategorieActive && categorieActive !== "infos pratiques") r = r.filter(a => norm(a.sousCategorie) === norm(sousCategorieActive));
    return r;
}

/* Noms de catégories affichés selon la langue (les clés internes restent en français) */
const CATS_AFFICHAGE = {
    fr: { "toutes": "Toutes", "immobilier": "Immobilier", "vehicules": "Véhicules", "emploi": "Emploi", "commerce": "Commerce", "services": "Services", "formation": "Formation", "telephones et informatique": "Téléphones et informatique", "infos pratiques": "Infos pratiques", "autres": "Autres" },
    en: { "toutes": "All", "immobilier": "Real estate", "vehicules": "Vehicles", "emploi": "Jobs", "commerce": "Commerce", "services": "Services", "formation": "Training", "telephones et informatique": "Phones & computing", "infos pratiques": "Useful info", "autres": "Other" },
    ar: { "toutes": "الكل", "immobilier": "عقارات", "vehicules": "مركبات", "emploi": "وظائف", "commerce": "تجارة", "services": "خدمات", "formation": "تكوين", "telephones et informatique": "هواتف وإعلاميات", "infos pratiques": "معلومات مفيدة", "autres": "أخرى" }
};
const ICONES_CATS = { "toutes": "🏠", "immobilier": "🏠", "vehicules": "🚗", "emploi": "💼", "commerce": "🛒", "services": "🛠️", "formation": "🎓", "telephones et informatique": "💻", "infos pratiques": "ℹ️", "autres": "📢" };

const nomCategorie = c => langueActuelle === "fr" ? c : (CATS_AFFICHAGE[langueActuelle][cleCategorie(c)] || c);

function majTitresCategories() {
    document.querySelectorAll(".categorie-btn").forEach(b => {
        const cle = b.dataset.categorie === "toutes" ? "toutes" : cleCategorie(b.dataset.categorie);
        const libelle = ICONES_CATS[cle] + " " + CATS_AFFICHAGE[langueActuelle][cle];
        const n = b.firstChild;
        if (n && n.nodeType === 3) n.nodeValue = libelle;
        else b.insertBefore(document.createTextNode(libelle), b.firstChild);
    });
}

/* ---------- Recherche ---------- */
/* Garde les annonces contenant tous les mots saisis (sans accents ni majuscules) */
function rechercher(liste) {
    const mots = norm(termeRecherche).split(/\s+/).filter(Boolean);
    if (!mots.length) return liste;
    return liste.filter(a => {
        const texte = norm([a.titre, a.description, a.ville, a.categorie, a.sousCategorie].join(" "));
        return mots.every(m => texte.includes(m));
    });
}

function brancherRecherche() {
    const champ = $("champ-recherche"), effacer = $("btn-effacer-recherche");
    const barre = $("recherche-bar"), ouvrir = $("btn-rechercher");
    if (!champ || !effacer || !barre || !ouvrir) return;

    function majRecherche() {
        termeRecherche = champ.value;
        effacer.style.display = champ.value ? "block" : "none";
        afficherAnnonces();
    }

    // Ouvre / ferme la barre ; en la fermant, la recherche est annulée
    function basculerBarre(afficher) {
        barre.hidden = !afficher;
        ouvrir.setAttribute("aria-expanded", afficher);
        ouvrir.classList.toggle("ouvert", afficher);
        if (afficher) champ.focus();
        else if (champ.value) { champ.value = ""; majRecherche(); }
    }

    ouvrir.addEventListener("click", () => basculerBarre(barre.hidden));
    champ.addEventListener("input", majRecherche);
    champ.addEventListener("keydown", e => { if (e.key === "Escape") basculerBarre(false); });
    effacer.addEventListener("click", () => { champ.value = ""; majRecherche(); champ.focus(); });
}

function choisirCategorie(cle, sous) {
    categorieActive = cle === "toutes" ? "toutes" : cleCategorie(cle);
    sousCategorieActive = categorieActive === "toutes" ? null : (sous || null);
    document.querySelectorAll(".categorie-btn").forEach(b => {
        const actif = b.dataset.categorie === "toutes" ? categorieActive === "toutes" : cleCategorie(b.dataset.categorie) === categorieActive;
        b.classList.toggle("active", actif);
        b.setAttribute("aria-pressed", actif);
    });
    fermerMenuSousCat();
    afficherInfosPratiques();
    afficherAnnonces();
}

/* Remplace l'ancien compteur : une flèche ▾ apparaît sur les catégories qui ont des sous-catégories */
function majFleches() {
    document.querySelectorAll(".categorie-btn").forEach(b => {
        const old = b.querySelector(".cat-count");
        if (old) old.remove();
        const cle = b.dataset.categorie === "toutes" ? "toutes" : cleCategorie(b.dataset.categorie);
        if (!SOUS_CATS[cle] || b.querySelector(".cat-arrow")) return;
        const f = document.createElement("span");
        f.className = "cat-arrow";
        f.setAttribute("role", "button");
        f.setAttribute("aria-haspopup", "true");
        f.setAttribute("aria-expanded", "false");
        f.title = t("sous_aria");
        f.textContent = "▾";
        b.appendChild(f);
    });
}

let menuSousCat = null;

function fermerMenuSousCat() {
    if (menuSousCat) menuSousCat.hidden = true;
    document.querySelectorAll(".cat-arrow.ouvert").forEach(a => { a.classList.remove("ouvert"); a.setAttribute("aria-expanded", "false"); });
}

function ouvrirMenuSousCat(btn) {
    const cle = cleCategorie(btn.dataset.categorie);
    const subs = SOUS_CATS[cle];
    if (!subs) return;
    if (!menuSousCat) {
        menuSousCat = document.createElement("div");
        menuSousCat.id = "menu-souscat";
        menuSousCat.className = "souscat-menu";
        menuSousCat.setAttribute("role", "menu");
        menuSousCat.hidden = true;
        document.body.appendChild(menuSousCat);
        menuSousCat.addEventListener("click", e => {
            const b = e.target.closest("button");
            if (b) choisirCategorie(menuSousCat.dataset.cat, b.dataset.sous || null);
        });
    }
    const dejaOuvert = !menuSousCat.hidden && menuSousCat.dataset.cat === cle;
    fermerMenuSousCat();
    if (dejaOuvert) return;

    menuSousCat.dataset.cat = cle;
    const actifSous = categorieActive === cle ? sousCategorieActive : null;
    menuSousCat.innerHTML = `<button type="button" role="menuitem" class="souscat-tout${!actifSous ? " actif" : ""}" data-sous="">${esc(t("sous_tout"))}</button>` +
        subs.map(x => `<button type="button" role="menuitem" class="${actifSous && norm(actifSous) === norm(x[0]) ? "actif" : ""}" data-sous="${esc(x[0])}">${esc(x[idxLangue()])}</button>`).join("");

    const fl = btn.querySelector(".cat-arrow");
    if (fl) { fl.classList.add("ouvert"); fl.setAttribute("aria-expanded", "true"); }
    menuSousCat.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = menuSousCat.offsetWidth;
    let left = document.dir === "rtl" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    menuSousCat.style.left = left + "px";
    menuSousCat.style.top = (r.bottom + 6) + "px";
}

function majFiltreActif() {
    const z = $("filtre-actif");
    if (!z) return;
    if (categorieActive === "toutes" || !sousCategorieActive) { z.hidden = true; z.innerHTML = ""; return; }
    z.hidden = false;
    z.innerHTML = `${esc(t("filtre"))} : <strong>${esc(CATS_AFFICHAGE[langueActuelle][categorieActive])} › ${esc(nomSousCat(categorieActive, sousCategorieActive))}</strong> ` +
        `<button type="button" onclick="choisirCategorie(categorieActive)" title="${esc(t("retirer_filtre"))}" aria-label="${esc(t("retirer_filtre"))}">&times;</button>`;
}

function brancherCategories() {
    const barre = document.querySelector(".categories-container");
    if (!barre) return;
    barre.addEventListener("click", e => {
        const b = e.target.closest(".categorie-btn");
        if (!b) return;
        if (e.target.closest(".cat-arrow")) { e.stopPropagation(); ouvrirMenuSousCat(b); return; }
        choisirCategorie(b.dataset.categorie);
    });
    barre.addEventListener("keydown", e => {
        const b = e.target.closest(".categorie-btn");
        if (b && e.key === "ArrowDown" && SOUS_CATS[cleCategorie(b.dataset.categorie)]) { e.preventDefault(); ouvrirMenuSousCat(b); }
    });
    barre.addEventListener("scroll", fermerMenuSousCat);
    document.addEventListener("click", e => { if (!e.target.closest(".souscat-menu, .cat-arrow")) fermerMenuSousCat(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") fermerMenuSousCat(); });
    window.addEventListener("resize", fermerMenuSousCat);
    majFleches();
}

/* ---------- Affichage des annonces ---------- */
function mediaHTML(m, id) {
    if (!m) return `<div style="color:#fff;font-size:13px;">${t("pas_image")}</div>`;
    return m.type === "video"
        ? `<video src="${esc(m.url)}" class="carrousel-media" id="media-${esc(id)}" controls></video>`
        : `<img src="${esc(m.url)}" class="carrousel-media" id="media-${esc(id)}" alt="" style="object-fit:cover;">`;
}

const formatPrix = p => (p || p === 0) && p !== ""
    ? Number(p).toLocaleString(langueActuelle === "en" ? "en-US" : "fr-FR") + " " + t("devise")
    : t("prix_non_specifie");

function afficherAnnonces() {
    const c = $("grille-annonces");
    c.innerHTML = "";
    majFleches();
    majFiltreActif();

    const triees = rechercher(filtrerParCategorie(annonces)).sort(
        (a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0) || (b.date || 0) - (a.date || 0)
    );

    if (!triees.length) {
        const msg = !annonces.length ? t("aucune_annonce")
            : termeRecherche.trim() ? t("aucun_resultat").replace("{q}", () => esc(termeRecherche.trim()))
            : t("aucune_categorie");
        c.innerHTML = `<p class="msg-vide">${msg}</p>`;
        return;
    }

    let sepAjoute = false;
    triees.forEach((a, i) => {
        if (a.premium && i === 0) c.insertAdjacentHTML("beforeend", `<div class="titre-premium">${t("prem_titre")}</div>`);
        if (!a.premium && !sepAjoute && i > 0 && triees[0].premium) {
            c.insertAdjacentHTML("beforeend", `<div class="titre-premium" style="color:#475569;">${t("autres_annonces")}</div>`);
            sepAjoute = true;
        }

        const id = `'${esc(a.id)}'`;
        const carte = document.createElement("div");
        carte.className = "carte-annonce" + (a.premium ? " premium" : "");
        const n = a.medias.length;
        const desc = String(a.description || "");

        carte.innerHTML = `
            ${a.premium ? '<span class="badge-premium">⭐ PREMIUM</span>' : ""}
            <div class="carrousel-container" id="car-${esc(a.id)}" onclick="clicImageAnnonce(event, ${id})">
                ${mediaHTML(a.medias[0], a.id)}
                ${n > 1 ? `<button class="nav-arrow left" onclick="event.stopPropagation();changerMedia(${id},-1)">‹</button><button class="nav-arrow right" onclick="event.stopPropagation();changerMedia(${id},1)">›</button>` : ""}
            </div>
            <div class="annonce-body">
                <span class="annonce-cat">${esc(nomCategorie(a.categorie))}${a.sousCategorie ? " › " + esc(nomSousCat(cleCategorie(a.categorie), a.sousCategorie)) : ""}</span>
                <h3 data-aid="${esc(a.id)}" data-trad="titre">${esc(a.titre)}</h3>
                <div class="annonce-prix">${esc(formatPrix(a.prix))}</div>
                <div class="annonce-meta"><span>📍 ${esc(a.ville)}</span><span>👁️ ${a.vues} ${t("vues")}</span></div>
                <p style="font-size:14px;color:#475569;margin-bottom:15px;" data-aid="${esc(a.id)}" data-trad="extrait"${desc.length > 100 ? ' data-suffix="..."' : ""}>${esc(desc.substring(0, 100))}${desc.length > 100 ? "..." : ""}</p>
                <div class="annonce-actions">
                    <button type="button" class="lien-voir-plus" onclick="voirDetailAnnonce(${id})">${t("voir_plus")}</button>
                    ${estAdmin ? `<button class="btn" style="background:#f59e0b;" onclick="togglePremium(${id})" title="Premium">${a.premium ? "★" : "☆"}</button>` : ""}
                    ${estAutoriseAModifier(a) ? `<button class="btn btn-secondary" onclick="modifierAnnonce(${id})">✏️</button><button class="btn" style="background:#ef4444;" onclick="supprimerAnnonce(${id})">🗑️</button>` : ""}
                </div>
            </div>`;
        c.appendChild(carte);
    });
    appliquerTraductions(c);
}

/* Clic sur la photo d'une annonce = ouvre ses détails (les flèches et les vidéos gardent leur rôle) */
function clicImageAnnonce(e, id) {
    if (e.target.closest("video, .nav-arrow")) return;
    voirDetailAnnonce(id);
}

function changerMedia(id, dir) {
    const a = trouver(id);
    if (!a || a.medias.length < 2) return;
    const i = ((indexCarrousel[id] || 0) + dir + a.medias.length) % a.medias.length;
    indexCarrousel[id] = i;
    const old = $("media-" + id), tmp = document.createElement("div");
    if (!old) return;
    tmp.innerHTML = mediaHTML(a.medias[i], id);
    old.replaceWith(tmp.firstElementChild);
}

/* Analyse la localisation saisie : lien Maps/Waze, coordonnées ou adresse libre.
   Retourne le texte à afficher + les boutons (nom, lien). Seuls les liens http(s) sont acceptés. */
function infosLocalisation(a) {
    const loc = String(a.localisation || "").trim();
    const ville = String(a.ville || "");
    const gmaps = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    const waze = q => "https://waze.com/ul?q=" + encodeURIComponent(q) + "&navigate=yes";

    // Rien saisi : on propose la ville sur Google Maps
    if (!loc) return { texte: ville + ", " + t("maroc"), liens: [["🗺️ Google Maps", gmaps(ville + ", Maroc")]] };

    // Coordonnées GPS (ex : 35.1681, -2.9335)
    const coord = loc.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (coord) {
        const ll = coord[1] + "," + coord[2];
        return { texte: ville + " (" + ll + ")", liens: [
            ["🗺️ Google Maps", gmaps(ll)],
            ["🚗 Waze", "https://waze.com/ul?ll=" + encodeURIComponent(ll) + "&navigate=yes"]
        ] };
    }

    // Lien (avec ou sans « https:// » au début)
    let lien = loc;
    if (/^(www\.|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com|(?:[a-z]+\.)?google\.[a-z.]+\/maps)/i.test(lien)) lien = "https://" + lien;
    try {
        const u = new URL(lien);
        if (u.protocol === "https:" || u.protocol === "http:") {
            const h = u.hostname.toLowerCase();
            const nom = h.includes("waze") ? "🚗 " + t("loc_waze")
                : (h.includes("google") || h.includes("goo.gl")) ? "🗺️ " + t("loc_gmaps")
                : "📍 " + t("loc_autre");
            return { texte: ville + ", " + t("maroc"), liens: [[nom, u.href]] };
        }
    } catch (e) { /* pas un lien : on le traite comme une adresse */ }

    // Adresse écrite librement
    const q = loc + ", " + ville + ", Maroc";
    return { texte: loc, liens: [["🗺️ Google Maps", gmaps(q)], ["🚗 Waze", waze(q)]] };
}

function lienTel(tel) {
    let n = String(tel).replace(/[^\d+]/g, "");
    if (n.startsWith("+")) n = n.slice(1);
    else if (n.startsWith("00")) n = n.slice(2);
    else if (n.startsWith("0")) n = "212" + n.slice(1);
    return n;
}

/* ----- Compteur de vues : +1 à CHAQUE clic sur une annonce (photo ou « Voir plus »).
   Seul un double-clic accidentel (moins de 2 secondes sur la même annonce) n'est compté qu'une fois. ----- */
let derniereVue = { id: null, t: 0 };

function compterVue(a) {
    const maintenant = Date.now();
    if (derniereVue.id === String(a.id) && maintenant - derniereVue.t < 2000) return;
    derniereVue = { id: String(a.id), t: maintenant };
    a.vues = (Number(a.vues) || 0) + 1;
    sauvegarder();
    try { if (typeof window.enregistrerVueDistante === "function") window.enregistrerVueDistante(a); } catch (e) { console.error(e); }
}

/* Affiche le nombre de vues mis à jour (appelé aussi par supabase-data.js une fois la base mise à jour) */
function rafraichirVuesAffichees(a) {
    const s = $("det-vues");
    if (s && detailCourant && detailCourant.type === "a" && String(detailCourant.id) === String(a.id)) s.textContent = a.vues;
}

/* ----- Page de détail plein écran (annonce ou flash) : l'en-tête du site reste, retour à gauche, croix à droite ----- */
let detailOuvert = false, detailCourant = null;

function ouvrirPageDetail(html, titreBarre, cle, relance) {
    $("contenu-page-detail").innerHTML = html;
    $("detail-titre-barre").textContent = titreBarre;
    $("page-detail").hidden = false;
    document.body.classList.add("mode-detail");
    if (!detailOuvert) {
        try { history.pushState({ detail: true }, "", location.pathname + location.search + "#" + cle); } catch (e) {}
    }
    detailOuvert = true;
    if (!relance) window.scrollTo(0, 0);
}

function fermerPageDetail(viaPopstate) {
    if (!detailOuvert) return;
    detailOuvert = false;
    detailCourant = null;
    $("page-detail").hidden = true;
    document.body.classList.remove("mode-detail");
    $("contenu-page-detail").innerHTML = "";
    if (!viaPopstate && history.state && history.state.detail) history.back();
    afficherFlashs();       // la bande était cachée : on la remesure
    afficherAnnonces();     // met à jour les compteurs de vues dans la liste
}

function rendreDetail() {
    if (!detailOuvert || !detailCourant) return;
    if (detailCourant.type === "a") { const a = trouver(detailCourant.id); if (a) afficherDetailAnnonce(a, true); }
    else { const f = flashs.find(x => String(x.id) === String(detailCourant.id)); if (f) afficherDetailFlash(f, true); }
}

function brancherPageDetail() {
    $("detail-retour").addEventListener("click", retourAccueil);
    $("detail-fermer").addEventListener("click", retourAccueil);
    window.addEventListener("popstate", () => { if (detailOuvert) fermerPageDetail(true); });   // bouton « retour » du téléphone / navigateur
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && detailOuvert && !document.querySelector("dialog[open]")) retourAccueil();
    });
}

/* Galerie : autant de photos/vidéos que l'annonce en contient */
function galerieHTML(medias, codeClic) {
    if (!medias.length) return "";
    return `<h4 class="detail-sous-titre">${esc(t("lbl_galerie"))} <small>${esc(t("galerie_astuce"))}</small></h4>
        <div class="detail-galerie">${medias.map((m, i) => m.type === "video"
            ? `<video src="${esc(m.url)}" controls preload="metadata"></video>`
            : `<img src="${esc(m.url)}" alt="Photo ${i + 1}" title="${esc(t("cliquer_agrandir"))}" class="galerie-img" loading="lazy" onclick="${codeClic(i)}">`).join("")}</div>`;
}

function voirDetailAnnonce(id) {
    const a = trouver(id);
    if (!a) return;
    compterVue(a);
    afficherDetailAnnonce(a, false);
}

function afficherDetailAnnonce(a, relance) {
    detailCourant = { type: "a", id: a.id };
    const ref = `'${esc(a.id)}'`;
    const loc = infosLocalisation(a);
    const catCle = cleCategorie(a.categorie);
    const contact = a.telephone ? `
        <div class="detail-contact">
            <p><strong>${t("lbl_contact")} :</strong> ${esc(a.telephone)}</p>
            <a class="btn btn-tel" href="tel:+${lienTel(a.telephone)}">📞 ${t("btn_appeler")}</a>
            <a class="btn btn-wa" href="https://wa.me/${lienTel(a.telephone)}" target="_blank" rel="noopener">💬 WhatsApp</a>
        </div>` : "";

    const html = `<article class="detail-article">
        <h2><span data-aid="${esc(a.id)}" data-trad="titre">${esc(a.titre)}</span> ${a.premium ? "⭐" : ""}</h2>
        <p class="detail-prix">${esc(formatPrix(a.prix))}</p>
        <p class="detail-meta"><span><strong>${t("lbl_categorie")} :</strong> ${esc(nomCategorie(a.categorie))}${a.sousCategorie ? " › " + esc(nomSousCat(catCle, a.sousCategorie)) : ""}</span>
            <span><strong>${t("ville_det")} :</strong> ${esc(a.ville)}</span>
            <span><strong>👁️ ${t("lbl_vues")} :</strong> <span id="det-vues">${Number(a.vues) || 0}</span></span></p>
        ${galerieHTML(a.medias, i => `ouvrirZoom('${esc(a.id)}', ${i})`)}
        <hr style="margin:18px 0;">
        <p id="det-desc" class="detail-desc" style="white-space:pre-wrap;" data-aid="${esc(a.id)}" data-trad="desc">${esc(a.description)}</p>
        <p id="det-note-trad" class="note-trad" hidden></p>
        <p class="detail-localisation" style="margin-top:14px;"><strong>📍 ${t("lbl_localisation")} :</strong> ${esc(loc.texte)}</p>
        <div class="loc-liens">${loc.liens.map(([nom, url]) => `<a class="btn btn-loc" href="${esc(url)}" target="_blank" rel="noopener">${esc(nom)}</a>`).join("")}</div>
        ${contact}
        ${estAutoriseAModifier(a) ? `<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;"><button class="btn btn-secondary" onclick="modifierAnnonce(${ref})">✏️ ${t("modifier")}</button><button class="btn" style="background:#ef4444;" onclick="supprimerAnnonce(${ref})">🗑️ ${t("supprimer")}</button></div>` : ""}
    </article>`;

    ouvrirPageDetail(html, t("det_annonce"), "annonce-" + a.id, relance);
    appliquerTraductions($("contenu-page-detail"));
}

/* ---------- Agrandissement des photos & retour accueil ---------- */
let zoomListe = [], zoomIndex = 0;

function afficherZoom() {
    const m = zoomListe[zoomIndex];
    if (!m) return;
    $("zoom-contenu").innerHTML = m.type === "video"
        ? `<video src="${esc(m.url)}" controls autoplay></video>`
        : `<img src="${esc(m.url)}" alt="">`;
    const plusieurs = zoomListe.length > 1;
    document.querySelectorAll("#modal-zoom .zoom-nav").forEach(b => b.style.display = plusieurs ? "block" : "none");
    $("zoom-compteur").textContent = plusieurs ? `${zoomIndex + 1} / ${zoomListe.length}` : "";
}

function ouvrirZoomListe(liste, i) {
    if (!liste || !liste[i]) return;
    zoomListe = liste;
    zoomIndex = i;
    afficherZoom();
    $("modal-zoom").showModal();
}

function ouvrirZoom(id, i) { const a = trouver(id); if (a) ouvrirZoomListe(a.medias, i); }
function ouvrirZoomFlash(id, i) { const f = flashs.find(x => String(x.id) === String(id)); if (f) ouvrirZoomListe(flashTousMedias(f), i); }

function changerZoom(dir) {
    if (zoomListe.length < 2) return;
    zoomIndex = (zoomIndex + dir + zoomListe.length) % zoomListe.length;
    afficherZoom();
}

function fermerZoom() { $("modal-zoom").close(); }

function brancherZoom() {
    const z = $("modal-zoom");
    if (!z) return;
    z.addEventListener("click", e => { if (e.target === z) fermerZoom(); });          // clic à côté de la photo = fermer
    z.addEventListener("close", () => { $("zoom-contenu").innerHTML = ""; });          // arrête une vidéo éventuelle
    z.addEventListener("keydown", e => {
        if (e.key === "ArrowRight") changerZoom(1);
        else if (e.key === "ArrowLeft") changerZoom(-1);
    });
}

/* Icône « actualiser » : petit tour d'animation puis rechargement de la page */
function brancherActualiser() {
    const b = $("btn-actualiser");
    if (!b) return;
    b.addEventListener("click", () => {
        b.classList.add("tourne");
        setTimeout(() => {
            if (location.search) location.replace(location.pathname);   // repart de l'accueil propre
            else location.reload();
        }, 450);
    });
}

function retourAccueil() {
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    if (detailOuvert) { fermerPageDetail(); return; }
    if (location.search) history.replaceState(null, "", location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Premium / droits / édition ---------- */
function togglePremium(id) {
    const a = trouver(id);
    if (a) {
        a.premium = !a.premium;
        sauvegarder();
        afficherAnnonces();
    }
}

function estAutoriseAModifier(a) {
    return estAdmin || (utilisateurConnecte && utilisateurConnecte.email === a.auteurEmail);
}

function supprimerAnnonce(id) {
    if (confirm("Voulez-vous vraiment supprimer cette annonce ?")) {
        annonces = annonces.filter(a => String(a.id) !== String(id));
        sauvegarder();
        fermerPageDetail();
        afficherAnnonces();
    }
}

function modifierAnnonce(id) {
    location.href = "deposer.html?edit=" + encodeURIComponent(id);
}

/* ---------- Dépôt d'annonce en 2 étapes ---------- */
const mediasDepot = fichiersUploades;   // fichiers de l'étape 2
const dessinerDepot = brancherZone("dep-drop", "dep-fichiers", "dep-apercu", mediasDepot, 0);   // 0 = aucune limite de photos

/* Liste des sous-catégories du formulaire selon la catégorie choisie */
function majSousCatDepot() {
    const cat = $("dep-categorie"), grp = $("grp-souscat"), sel = $("dep-souscat");
    if (!cat || !grp || !sel) return;
    const cle = cat.value ? cleCategorie(cat.value) : null;
    const subs = cle && cle !== "autres" ? SOUS_CATS[cle] : null;
    const avant = sel.value;
    grp.hidden = !subs;
    sel.innerHTML = subs ? `<option value="">${esc(t("sous_aucune"))}</option>` + subs.map(x => `<option value="${esc(x[0])}">${esc(x[idxLangue()])}</option>`).join("") : "";
    if (subs && avant) sel.value = avant;
}

function brancherSousCatDepot() {
    $("dep-categorie").addEventListener("change", majSousCatDepot);
}

/* Localisation : bouton « Ma position », ouverture de Google Maps, et extraction automatique du lien dans un texte partagé */
function extraireLienLocalisation(txt) {
    txt = String(txt || "").trim();
    const m = txt.match(/https?:\/\/[^\s]+/i) || txt.match(/\b(?:maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com|(?:www\.)?google\.[a-z.]+\/maps)[^\s]*/i);
    return m ? m[0].replace(/[),.;]+$/, "") : txt;
}

function brancherOutilsLocalisation() {
    const champ = $("dep-localisation"), btn = $("dep-loc-gps"), msg = $("dep-loc-msg");
    if (!champ || !btn || !msg) return;
    btn.addEventListener("click", () => {
        if (!navigator.geolocation) { msg.textContent = t("loc_gps_non"); return; }
        msg.textContent = t("loc_gps_attente");
        btn.disabled = true;
        navigator.geolocation.getCurrentPosition(pos => {
            champ.value = pos.coords.latitude.toFixed(6) + ", " + pos.coords.longitude.toFixed(6);
            msg.textContent = t("loc_gps_ok");
            btn.disabled = false;
        }, () => {
            msg.textContent = t("loc_gps_err");
            btn.disabled = false;
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });
    const nettoyer = () => {
        const v = extraireLienLocalisation(champ.value);
        if (v !== champ.value) { champ.value = v; msg.textContent = t("loc_lien_extrait"); }
    };
    champ.addEventListener("change", nettoyer);
    champ.addEventListener("paste", () => setTimeout(nettoyer, 0));
}

function afficherEtape(n) {
    $("dep-etape1").hidden = n !== 1;
    $("dep-etape2").hidden = n !== 2;
    $("dep-indic").textContent = n + " / 2";
}

function ouvrirDepot() {
    remplirVilles($("dep-ville"), "Nador");
    $("dep-info-compte").innerHTML = utilisateurConnecte
        ? `Connecté en tant que <b>${esc(utilisateurConnecte.nom)}</b> : vous pourrez modifier ou supprimer cette annonce.`
        : `Aucun compte n'est nécessaire pour publier. Connectez-vous seulement si vous voulez pouvoir modifier ou supprimer votre annonce plus tard.`;
    majSousCatDepot();
    $("dep-loc-msg").textContent = "";
    afficherEtape(1);
    $("modal-deposer").showModal();
}

function etape1Valide() {
    const champs = ["dep-titre", "dep-categorie", "dep-ville", "dep-description", "dep-telephone", "dep-prix"].map($);
    for (const el of champs) {
        el.classList.remove("invalide");
        if (!el.checkValidity() || (el.required && !el.value.trim())) {
            el.classList.add("invalide");
            el.reportValidity();
            el.focus();
            return false;
        }
    }
    return true;
}

$("dep-suivant").addEventListener("click", () => { if (etape1Valide()) afficherEtape(2); });
$("dep-retour").addEventListener("click", () => afficherEtape(1));

$("form-deposer").addEventListener("submit", e => {
    e.preventDefault();
    if ($("dep-etape2").hidden) { if (etape1Valide()) afficherEtape(2); return; }   // Entrée à l'étape 1 = Suivant
    if (!etape1Valide()) { afficherEtape(1); return; }

    const prix = $("dep-prix").value;
    const nouvelle = {
        id: Date.now(),
        date: Date.now(),
        titre: $("dep-titre").value.trim(),
        categorie: $("dep-categorie").value,
        ville: $("dep-ville").value,
        prix: prix ? parseFloat(prix) : null,
        description: $("dep-description").value.trim(),
        telephone: $("dep-telephone").value.trim(),
        localisation: $("dep-localisation").value.trim(),
        sousCategorie: $("dep-souscat").value || "",
        medias: mediasDepot.slice(),
        auteurEmail: utilisateurConnecte ? utilisateurConnecte.email : "anonyme",
        premium: false,
        vues: 0
    };

    annonces.unshift(nouvelle);
    if (!sauvegarder()) { annonces.shift(); return; }   // stockage plein : on annule

    $("form-deposer").reset();
    mediasDepot.length = 0;
    dessinerDepot();
    majSousCatDepot();
    fermerModal("modal-deposer");
    choisirCategorie("toutes");
    alert("Annonce publiée avec succès !");
});

/* ---------- Infos pratiques (catégorie « Infos pratiques ») ----------
   Automatiques : horaires de prière (Aladhan, méthode Maroc) et météo (Open-Meteo), sans clé ni compte.
   Saisies par l'admin : trains et pharmacies de garde (aucun service gratuit officiel n'existe pour ces deux-là). */
let infosPratiques = lire("infosPratiques", null) || { trains: { texte: "", majLe: 0 }, pharmacies: { texte: "", majLe: 0 } };
let minuteurInfos = null;
const pad2 = n => String(n).padStart(2, "0");
const localeLangue = () => ({ fr: "fr-FR", en: "en-GB", ar: "ar-MA" }[langueActuelle] || "fr-FR");
const PRIERES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const hm = x => { const [h, m] = String(x).split(":"); return (+h) * 60 + (+m); };

const NUMEROS = [["👮", "num_police", "19"], ["🛡️", "num_gendarmerie", "177"], ["🚒", "num_pompiers", "15"], ["🚑", "num_samu", "141"]];
const LIENS_INFOS = {
    trains: [["🚆 ONCF", "https://www.oncf-voyages.ma"]],
    pharmacies: [["💊 med.ma", "https://www.med.ma/pharmacie/garde-24-24/nador"], ["📋 annuaire-gratuit.ma", "https://www.annuaire-gratuit.ma/pharmacie-garde-nador.html"]]
};

/* ---------- Sites officiels marocains (saisie manuelle) ----------
   Pour ajouter un site : copiez une ligne  ["Nom", "https://adresse", "description FR", "description EN", "description AR"]
   dans le bon groupe (ou créez un nouveau groupe : ["icône", "FR", "EN", "AR", [ ...sites... ]]). */
const SITES_MAROC = [
    ["🏛️", "Administration et papiers", "Administration & documents", "الإدارة والوثائق", [
        ["Service-public.ma", "https://www.service-public.ma", "Portail national des démarches administratives", "National portal for administrative procedures", "البوابة الوطنية للمساطر والخدمات الإدارية"],
        ["Idarati", "https://www.idarati.ma", "Démarches et services en ligne de l'administration", "Online administrative services", "خدمات ومساطر الإدارة عن بعد"],
        ["CNIE", "https://www.cnie.ma", "Carte nationale d'identité électronique : demande et rendez-vous", "National ID card: application and appointments", "البطاقة الوطنية للتعريف الإلكترونية: الطلب والمواعيد"],
        ["Passeport", "https://www.passeport.ma", "Demande de passeport et prise de rendez-vous", "Passport application and appointments", "طلب جواز السفر وحجز الموعد"],
        ["Casier judiciaire", "https://www.casierjudiciaire.gov.ma", "Extrait de casier judiciaire en ligne", "Criminal record extract online", "السجل العدلي عن بعد"],
        ["Watiqa", "https://www.watiqa.ma", "Actes d'état civil (naissance, mariage…)", "Civil status records (birth, marriage…)", "وثائق الحالة المدنية (عقد الازدياد، الزواج…)"]
    ]],
    ["🚆", "Transport et voyage", "Transport & travel", "النقل والسفر", [
        ["ONCF", "https://www.oncf-voyages.ma", "Trains : horaires et réservation", "Trains: timetables and booking", "القطارات: الأوقات والحجز"],
        ["CTM", "https://www.ctm.ma", "Autocars : horaires et billets", "Coaches: timetables and tickets", "الحافلات: الأوقات والتذاكر"],
        ["Royal Air Maroc", "https://www.royalairmaroc.com", "Vols nationaux et internationaux", "Domestic and international flights", "الرحلات الوطنية والدولية"],
        ["ONDA", "https://www.onda.ma", "Aéroports du Maroc (dont Nador – Al Aroui)", "Moroccan airports (incl. Nador – Al Aroui)", "مطارات المغرب (ومنها الناظور – العروي)"],
        ["ANP", "https://www.anp.org.ma", "Agence nationale des ports (Nador, Béni Ansar)", "National ports agency (Nador, Beni Ansar)", "الوكالة الوطنية للموانئ (الناظور، بني أنصار)"],
        ["NARSA", "https://www.narsa.ma", "Permis, carte grise, amendes routières", "Driving licence, vehicle registration, fines", "رخصة السياقة، البطاقة الرمادية، المخالفات"]
    ]],
    ["💰", "Impôts, douane et foncier", "Taxes, customs & land registry", "الضرائب والجمارك والعقار", [
        ["DGI (impôts)", "https://www.tax.gov.ma", "Déclarations, paiements et attestations fiscales", "Tax returns, payments and certificates", "التصاريح والأداءات والشهادات الضريبية"],
        ["Douane (ADII)", "https://www.douane.gov.ma", "Réglementation douanière, import/export, voyageurs", "Customs rules, import/export, travellers", "المساطر الجمركية، الاستيراد والتصدير، المسافرون"],
        ["ANCFCC", "https://www.ancfcc.gov.ma", "Conservation foncière, titres fonciers, cadastre", "Land registry, titles, cadastre", "المحافظة العقارية والرسوم العقارية والمسح العقاري"]
    ]],
    ["⚖️", "Justice", "Justice", "العدالة", [
        ["Mahakim", "https://www.mahakim.ma", "Suivi des dossiers et affaires judiciaires", "Court case tracking", "تتبع القضايا والملفات القضائية"],
        ["Ministère de la Justice", "https://www.justice.gov.ma", "Informations et services judiciaires", "Information and judicial services", "معلومات وخدمات قضائية"]
    ]],
    ["🩺", "Santé et protection sociale", "Health & social security", "الصحة والحماية الاجتماعية", [
        ["CNSS", "https://www.cnss.ma", "Sécurité sociale, AMO, allocations familiales", "Social security, AMO health cover, family allowances", "الضمان الاجتماعي، التأمين الإجباري عن المرض، التعويضات العائلية"],
        ["CNOPS", "https://www.cnops.org.ma", "Assurance maladie des fonctionnaires", "Health insurance for civil servants", "التأمين الصحي لموظفي القطاع العام"],
        ["Ministère de la Santé", "https://www.sante.gov.ma", "Hôpitaux, vaccination, informations de santé", "Hospitals, vaccination, health information", "المستشفيات، التلقيح، معلومات صحية"]
    ]],
    ["💼", "Emploi et formation", "Jobs & training", "الشغل والتكوين", [
        ["ANAPEC", "https://www.anapec.org", "Offres d'emploi et inscription demandeur d'emploi", "Job offers and job-seeker registration", "عروض الشغل والتسجيل كباحث عن عمل"],
        ["Emploi-public.ma", "https://www.emploi-public.ma", "Concours et recrutements dans la fonction publique", "Public-sector exams and recruitment", "مباريات وتوظيف الوظيفة العمومية"],
        ["OFPPT", "https://www.ofppt.ma", "Formation professionnelle : inscriptions et filières", "Vocational training: enrolment and programmes", "التكوين المهني: التسجيل والمسالك"],
        ["Université Mohammed Ier", "https://www.ump.ma", "Université de la région (Oujda, Nador)", "Regional university (Oujda, Nador)", "جامعة محمد الأول (وجدة، الناظور)"],
        ["Massar", "https://massar.men.gov.ma", "Espace parents et élèves (scolarité)", "Parents' and pupils' school portal", "فضاء أولياء الأمور والتلاميذ"]
    ]],
    ["💡", "Eau, électricité, poste et télécom", "Utilities, post & telecom", "الماء والكهرباء والبريد والاتصالات", [
        ["ONEE", "https://www.onee.ma", "Électricité et eau potable : factures et services", "Electricity and water: bills and services", "الكهرباء والماء الصالح للشرب: الفواتير والخدمات"],
        ["Barid Al-Maghrib", "https://www.poste.ma", "Poste : suivi de colis, services financiers", "Post: parcel tracking, financial services", "البريد: تتبع الطرود والخدمات المالية"],
        ["Maroc Telecom", "https://www.iam.ma", "Téléphonie, internet et factures", "Phone, internet and bills", "الهاتف والإنترنت والفواتير"],
        ["Orange Maroc", "https://www.orange.ma", "Téléphonie, internet et factures", "Phone, internet and bills", "الهاتف والإنترنت والفواتير"],
        ["inwi", "https://www.inwi.ma", "Téléphonie, internet et factures", "Phone, internet and bills", "الهاتف والإنترنت والفواتير"]
    ]],
    ["🌍", "Marocains du monde", "Moroccans abroad", "مغاربة العالم", [
        ["Marocains du monde", "https://www.marocainsdumonde.gov.ma", "Services et informations pour les MRE", "Services and information for Moroccans abroad", "خدمات ومعلومات لمغاربة العالم"]
    ]]
];

function blocSites() {
    const l = idxLangue();
    return SITES_MAROC.map(([ic, ...reste], i) => {
        const noms = reste.slice(0, 3), sites = reste[3];
        const lis = sites.map(s => `<li style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:6px 0"><a class="btn btn-loc" href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a><small>${esc(s[2 + l])}</small></li>`).join("");
        return `<details class="sites-groupe"${i === 0 ? " open" : ""} style="margin:6px 0"><summary style="cursor:pointer;font-weight:600">${ic} ${esc(noms[l])}</summary><ul style="list-style:none;padding:0;margin:4px 0 0">${lis}</ul></details>`;
    }).join("");
}

/* [codes météo, icône, français, anglais, arabe] */
const METEO = [
    [[0], "☀️", "Ciel dégagé", "Clear sky", "سماء صافية"],
    [[1], "🌤️", "Plutôt dégagé", "Mostly clear", "صافية في الغالب"],
    [[2], "⛅", "Partiellement nuageux", "Partly cloudy", "غائم جزئيا"],
    [[3], "☁️", "Couvert", "Overcast", "غائم"],
    [[45, 48], "🌫️", "Brouillard", "Fog", "ضباب"],
    [[51, 53, 55, 56, 57], "🌦️", "Bruine", "Drizzle", "رذاذ"],
    [[61, 63, 65, 66, 67], "🌧️", "Pluie", "Rain", "مطر"],
    [[71, 73, 75, 77, 85, 86], "❄️", "Neige", "Snow", "ثلوج"],
    [[80, 81, 82], "🌦️", "Averses", "Showers", "زخات"],
    [[95, 96, 99], "⛈️", "Orage", "Thunderstorm", "عاصفة رعدية"]
];
const infoMeteo = code => METEO.find(m => m[0].includes(Number(code))) || [[], "🌡️", "—", "—", "—"];

async function recupererJSON(url) {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), 10000);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
    } finally { clearTimeout(minuteur); }
}

async function donneesPriere() {
    const d = new Date();
    const jour = `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
    const c = lire("cachePriere", null);
    if (c && c.jour === jour && c.timings) return c;
    try {
        const j = await recupererJSON(`https://api.aladhan.com/v1/timings/${jour}?latitude=${VILLE_INFO.lat}&longitude=${VILLE_INFO.lon}&method=21&timezonestring=Africa%2FCasablanca`);
        if (!j || j.code !== 200) throw new Error("réponse invalide");
        const tm = {};
        PRIERES.forEach(k => { tm[k] = String(j.data.timings[k]).slice(0, 5); });
        const o = { jour, timings: tm };
        try { localStorage.setItem("cachePriere", JSON.stringify(o)); } catch (e) {}
        return o;
    } catch (e) { return c && c.timings ? { ...c, ancien: true } : null; }
}

async function majPriere() {
    if (!document.querySelector("#info-priere .info-corps")) return;
    const o = await donneesPriere();
    const zone = document.querySelector("#info-priere .info-corps");
    if (!zone) return;
    if (!o) { zone.innerHTML = `<p class="info-alerte">${esc(t("info_erreur"))}</p>`; return; }
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    const prochain = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].find(k => hm(o.timings[k]) > min) || "Fajr";
    zone.innerHTML = `<ul class="priere-liste">${PRIERES.map(k => `<li class="${k === prochain ? "prochaine" : ""}"><span>${esc(t("p_" + k))}${k === prochain ? ` <em>(${esc(t("info_prochaine"))})</em>` : ""}</span><strong>${esc(o.timings[k])}</strong></li>`).join("")}</ul>` +
        `<p class="info-source">${esc(t("info_source_priere"))}</p>` + (o.ancien ? `<p class="info-alerte">${esc(t("info_hors_ligne"))}</p>` : "");
}

async function donneesMeteo() {
    const c = lire("cacheMeteo", null);
    if (c && c.cur && Date.now() - c.t < 30 * 60 * 1000) return c;
    try {
        const j = await recupererJSON(`https://api.open-meteo.com/v1/forecast?latitude=${VILLE_INFO.lat}&longitude=${VILLE_INFO.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Africa%2FCasablanca&forecast_days=4`);
        if (!j || !j.current || !j.daily) throw new Error("réponse invalide");
        const o = { t: Date.now(), cur: j.current, daily: j.daily };
        try { localStorage.setItem("cacheMeteo", JSON.stringify(o)); } catch (e) {}
        return o;
    } catch (e) { return c && c.cur ? { ...c, ancien: true } : null; }
}

async function majMeteo() {
    if (!document.querySelector("#info-meteo .info-corps")) return;
    const o = await donneesMeteo();
    const zone = document.querySelector("#info-meteo .info-corps");
    if (!zone) return;
    if (!o) { zone.innerHTML = `<p class="info-alerte">${esc(t("info_erreur"))}</p>`; return; }
    const m = infoMeteo(o.cur.weather_code);
    const jours = [1, 2, 3].filter(i => o.daily.time[i]).map(i => {
        const mj = infoMeteo(o.daily.weather_code[i]);
        const nom = new Date(o.daily.time[i] + "T12:00:00").toLocaleDateString(localeLangue(), { weekday: "short" });
        return `<li><span>${esc(nom)}</span><span title="${esc(mj[2 + idxLangue()])}">${mj[1]}</span><strong>${Math.round(o.daily.temperature_2m_max[i])}° <small>/ ${Math.round(o.daily.temperature_2m_min[i])}°</small></strong></li>`;
    }).join("");
    zone.innerHTML = `<div class="meteo-actuelle"><span class="meteo-icone">${m[1]}</span><div><div class="meteo-temp">${Math.round(o.cur.temperature_2m)}°C</div><div>${esc(m[2 + idxLangue()])}</div>` +
        `<small>${esc(t("info_humidite"))} : ${Math.round(o.cur.relative_humidity_2m)}% · ${esc(t("info_vent"))} : ${Math.round(o.cur.wind_speed_10m)} km/h</small></div></div>` +
        `<ul class="meteo-jours">${jours}</ul><p class="info-source">${esc(t("info_source_meteo"))}</p>` + (o.ancien ? `<p class="info-alerte">${esc(t("info_hors_ligne"))}</p>` : "");
}

function blocTexteInfo(cle) {
    const d = infosPratiques[cle] || { texte: "", majLe: 0 };
    const corps = d.texte
        ? `<div class="info-texte">${esc(d.texte)}</div><p class="info-source">${esc(t("info_maj"))} ${esc(new Date(d.majLe || Date.now()).toLocaleString(localeLangue()))}</p>`
        : `<p class="info-attente">${esc(t("info_aucune"))}</p>`;
    const liens = (LIENS_INFOS[cle] || []).map(([nom, url]) => `<a class="btn btn-loc" href="${esc(url)}" target="_blank" rel="noopener">${esc(nom)}</a>`).join("");
    return corps + `<div class="loc-liens">${liens}${estAdmin ? `<button type="button" class="btn btn-secondary" onclick="ouvrirModalInfos()">${esc(t("info_modifier"))}</button>` : ""}</div>`;
}

function blocNumeros() {
    return `<ul class="numeros-liste">${NUMEROS.map(([ic, k, n]) => `<li><span>${ic} ${esc(t(k))}</span><a class="btn btn-tel" href="tel:${n}">${n}</a></li>`).join("")}</ul>`;
}

function afficherInfosPratiques() {
    const zone = $("infos-pratiques");
    if (!zone) return;
    if (minuteurInfos) { clearInterval(minuteurInfos); minuteurInfos = null; }
    const actif = categorieActive === "infos pratiques";
    zone.hidden = !actif;
    if (!actif) { zone.innerHTML = ""; return; }
    const veut = nom => !sousCategorieActive || sousCategorieActive === nom;
    const attente = `<p class="info-attente">${esc(t("info_chargement"))}</p>`;
    const carte = (id, titre, corps) => `<div class="info-carte" id="${id}"><h3>${titre}</h3><div class="info-corps">${corps}</div></div>`;
    zone.innerHTML = `<h2 class="infos-titre">${esc(t("info_titre"))}</h2><div class="infos-grille">` +
        (veut("Horaires de prière") ? carte("info-priere", "🕌 " + esc(t("info_priere")), attente) : "") +
        (veut("Météo") ? carte("info-meteo", "🌤️ " + esc(t("info_meteo")), attente) : "") +
        (veut("Trains") ? carte("info-trains", "🚆 " + esc(t("info_trains")), blocTexteInfo("trains")) : "") +
        (veut("Pharmacies de garde") ? carte("info-pharmacies", "💊 " + esc(t("info_pharmacies")), blocTexteInfo("pharmacies")) : "") +
        (veut("Numéros utiles") ? carte("info-numeros", "☎️ " + esc(t("info_numeros")), blocNumeros()) : "") +
        (veut("Sites officiels") ? `<div class="info-carte" id="info-sites" style="grid-column:1/-1"><h3>🔗 ${esc(t("info_sites"))}</h3><div class="info-corps">${blocSites()}</div></div>` : "") + `</div>`;
    majPriere();
    majMeteo();
    minuteurInfos = setInterval(() => { majPriere(); majMeteo(); }, 60000);   // l'heure de la « prochaine prière » et la météo se mettent à jour seules
}

function sauvegarderInfos() {
    try { localStorage.setItem("infosPratiques", JSON.stringify(infosPratiques)); } catch (e) {}
    try { if (typeof window.sauvegarderInfosDistant === "function") window.sauvegarderInfosDistant(infosPratiques); } catch (e) { console.error(e); }
}

function ouvrirModalInfos() {
    if (!estAdmin) return;
    $("inf-trains").value = (infosPratiques.trains && infosPratiques.trains.texte) || "";
    $("inf-pharmacies").value = (infosPratiques.pharmacies && infosPratiques.pharmacies.texte) || "";
    $("modal-infos").showModal();
}

$("form-infos").addEventListener("submit", e => {
    e.preventDefault();
    if (!estAdmin) return;
    const maj = (cle, v) => {
        if (((infosPratiques[cle] || {}).texte || "") !== v) infosPratiques[cle] = { texte: v, majLe: Date.now() };
    };
    maj("trains", $("inf-trains").value.trim());
    maj("pharmacies", $("inf-pharmacies").value.trim());
    sauvegarderInfos();
    fermerModal("modal-infos");
    afficherInfosPratiques();
});

/* ---------- Démarrage ---------- */
document.addEventListener("DOMContentLoaded", () => {
    brancherCategories();
    brancherRecherche();
    brancherZoom();
    brancherActualiser();
    brancherPageDetail();
    brancherAccesAdmin();
    brancherOutilsLocalisation();
    brancherSousCatDepot();
    afficherStats();
    afficherFlashs();
    majUI();

    const langueSauvee = lire("langue", "fr");   // la langue choisie survit à l'actualisation de la page
    if (langueSauvee !== "fr" && traductions[langueSauvee]) changerLangue(langueSauvee);

    const p = new URLSearchParams(location.search);
    if (p.get("connexion")) ouvrirModalUser();
    if (p.get("depot")) ouvrirDepot();
    if (p.get("annonce")) voirDetailAnnonce(p.get("annonce"));
});
