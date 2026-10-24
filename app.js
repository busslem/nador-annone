/* Nador-Service : application unique (utilitaires, interface, sécurité, données Supabase, extensions).
   L'ordre des sections compte : ne pas les réarranger. À charger après la bibliothèque Supabase. */

/* ==================================================================
   1. UTILITAIRES MÉDIAS (photos, vidéos, villes)
   ================================================================== */
/* Utilitaires médias partagés (compression photos, lecture fichiers) */

function compresserImage(dataUrl) {
    return new Promise(res => {
        const img = new Image();
        img.onload = () => {
            const r = Math.min(1, 900 / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * r);
            c.height = Math.round(img.height * r);
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#fff";              // fond blanc (évite le noir des PNG transparents)
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            res(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => res(dataUrl); 
        img.src = dataUrl;
    });
}

function lireFichier(file) {
    return new Promise(res => {
        const video = file.type.startsWith("video");
        if (!video && !file.type.startsWith("image")) return res(null);
        if (video && file.size > 2 * 1024 * 1024) { 
            alert(`« ${file.name} » dépasse 2 Mo : vidéo trop lourde.`); 
            return res(null); 
        }
        const r = new FileReader();
        r.onload = async e => res({ 
            type: video ? "video" : "image", 
            url: video ? e.target.result : await compresserImage(e.target.result) 
        });
        r.onerror = () => res(null);
        r.readAsDataURL(file);
    });
}

/* Zone glisser-déposer + clic. liste = tableau modifiable, maxPhotos = limite */
function brancherZone(zoneId, inputId, apercuId, liste, maxPhotos) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const g = document.getElementById(apercuId);
    
    const dessiner = () => {
        g.innerHTML = "";
        liste.forEach((f, i) => {
            const el = document.createElement(f.type === "image" ? "img" : "video");
            el.src = f.url; 
            el.title = "Cliquer pour retirer";
            el.onclick = () => { liste.splice(i, 1); dessiner(); }; 
            g.appendChild(el);
        });
    };
    
    const ajouter = async files => {
        for (const file of Array.from(files)) {
            if (file.type.startsWith("image") && maxPhotos && liste.filter(x => x.type === "image").length >= maxPhotos) { 
                alert(maxPhotos + " photos maximum."); 
                continue; 
            }
            const m = await lireFichier(file); 
            if (m) { liste.push(m); dessiner(); }
        }
    };
    
    zone.onclick = () => input.click();
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.style.background = "#e2e8f0"; });
    zone.addEventListener("dragleave", () => zone.style.background = "#f8fafc");
    zone.addEventListener("drop", e => { e.preventDefault(); zone.style.background = "#f8fafc"; ajouter(e.dataTransfer.files); });
    input.addEventListener("change", e => { ajouter(e.target.files); input.value = ""; });
    
    return dessiner;
}

const VILLES_MAROC = "Casablanca,Rabat,Fès,Marrakech,Tanger,Salé,Meknès,Agadir,Oujda,Kénitra,Tétouan,Témara,Safi,Mohammédia,Khouribga,El Jadida,Béni Mellal,Aït Melloul,Nador,Dar Bouazza,Taza,Settat,Berrechid,Khémisset,Inezgane,Ksar El Kébir,Larache,Guelmim,Khénifra,Berkane,Taourirt,Bouskoura,Fquih Ben Salah,Oued Zem,El Kelaa des Sraghna,Sidi Slimane,Errachidia,Guercif,Oulad Teima,Ben Guerir,Tifelt,Taroudant,Sefrou,Essaouira,Fnideq,Sidi Kacem,Tiznit,Tan-Tan,Ouarzazate,Souk El Arbaa,Youssoufia,Martil,Ain Harrouda,Skhirat,Ouazzane,Benslimane,Al Hoceima,Beni Ansar,M'diq,Sidi Bennour,Midelt,Azrou,Laâyoune,Dakhla,Smara,Boujdour,Tarfaya,Assilah,Chefchaouen,Ifrane,Zagora,Tinghir,Azilal,Kasba Tadla,Sidi Ifni,Bouarfa,Figuig,Jerada,Al Aroui,Selouane,Zeghanghane,Ras El Ma,Driouch,Midar,Imzouren,Ajdir,Bni Bouayach,Targuist,Rissani,Erfoud,Goulmima,Kelaat M'Gouna,Boumalne Dades,Sidi Yahya El Gharb,Mechra Bel Ksiri,Moulay Bousselham,Sidi Rahal,Bouznika,Mediouna,Nouaceur,El Hajeb,Moulay Yacoub,Boulemane,Missour,Outat El Haj,Tahla,Aknoul,Ahfir,Saïdia,Zaio,Oulad Ayad,Demnate,Chichaoua,Imintanoute,Tamanar,Sidi Bouzid,Oualidia,Azemmour,Had Soualem,Ouled Frej,Beni Mellal,Fkih Ben Salah,Assa,Tata,Akhfennir,Bir Gandouz,Guerguerat".split(",");

function remplirVilles(select, valeur) {
    const l = [...new Set(VILLES_MAROC)].sort((a, b) => a.localeCompare(b, "fr")); 
    l.push("Autre");
    select.innerHTML = '<option value="">— Choisir une ville —</option>' + l.map(v => `<option>${v}</option>`).join("");
    if (valeur) select.value = valeur;
}

/* ==================================================================
   2. INTERFACE (langues, annonces, flash, détail, dépôt, infos pratiques)
   ================================================================== */
/* ===== Nador-Service : script unifié ===== */

const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lire = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } };
const trouver = id => annonces.find(a => String(a.id) === String(id));
const lireSession = (k, def) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? def; } catch (e) { return def; } };

let estAdmin = false;   // l'accès admin est accordé uniquement par Supabase (supabase-data.js)
let utilisateurConnecte = null;
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

/* ---------- Données (chargées depuis Supabase en fin de fichier) ---------- */
let annonces = [], flashs = [];
let nbVisites = 0;

/* ---------- Langues ---------- */
const traductions = {
    fr: { flash_title: "⚡ Flash", deposer_titre: "📝 Déposer une annonce", lbl_titre: "Titre de l'annonce *", lbl_ville: "Ville *", lbl_cat: "Catégorie *", lbl_tel: "Téléphone *", lbl_loc: "Localisation (Google Maps, Waze…) — facultatif", lbl_prix: "Prix (Optionnel)", lbl_desc: "Description détaillée *", btn_suivant: "Suivant →", lbl_medias: "Glissez ou sélectionnez vos fichiers (Photos, Vidéos)", btn_retour: "⬅️ Retour", btn_publier: "Publier l'annonce", annonces_titre: "📢 Annonces récentes", visiteurs: "Visiteurs", vues: "vues" },
    en: { flash_title: "⚡ Featured Listings", deposer_titre: "📝 Post an Ad", lbl_titre: "Ad Title *", lbl_ville: "City *", lbl_cat: "Category *", lbl_tel: "Phone *", lbl_loc: "Location (Google Maps, Waze…) — optional", lbl_prix: "Price (Optional)", lbl_desc: "Detailed Description *", btn_suivant: "Next →", lbl_medias: "Drag & drop your files (Photos, Videos)", btn_retour: "⬅️ Back", btn_publier: "Publish Ad", annonces_titre: "📢 Recent Ads", visiteurs: "Visitors", vues: "views" },
    ar: { flash_title: "⚡ الإعلانات العاجلة", deposer_titre: "📝 أضف إعلانًا", lbl_titre: "عنوان الإعلان *", lbl_ville: "المدينة *", lbl_cat: "الفئة *", lbl_tel: "الهاتف *", lbl_loc: "الموقع (Google Maps، Waze…) — اختياري", lbl_prix: "السعر (اختياري)", lbl_desc: "وصف مفصل *", btn_suivant: "التالي →", lbl_medias: "اسحب ملفاتك أو اخترها (صور، فيديوهات)", btn_retour: "⬅️ رجوع", btn_publier: "نشر الإعلان", annonces_titre: "📢 أحدث الإعلانات", visiteurs: "الزوار", vues: "مشاهدة" }
};

/* Textes supplémentaires de l'interface (cartes, détails, boutons du haut, messages) */
Object.assign(traductions.fr, {
    tagline: "Votre portail des services, annonces, publicités et opportunités à Nador et sa région",
    btn_login: "👤 Se Connecter", btn_publier_top: "➕ Publier", btn_admin: "🔧 Admin", btn_logout: "Déconnexion",
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
    tagline: "Your gateway to services, classified ads, advertising and opportunities in Nador and the region",
    btn_login: "👤 Log in", btn_publier_top: "➕ Post", btn_admin: "🔧 Admin", btn_logout: "Log out",
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
    tagline: "بوابتك للخدمات والإعلانات والفرص في الناظور وجهتها",
    btn_login: "👤 تسجيل الدخول", btn_publier_top: "➕ انشر", btn_admin: "🔧 المسؤول", btn_logout: "تسجيل الخروج",
    btn_rechercher: "🔍 بحث", placeholder_recherche: "ابحث عن إعلان (العنوان، الوصف، المدينة، الفئة)...",
    bonjour: "مرحبا", voir_plus: "عرض المزيد", prix_non_specifie: "السعر غير محدد", devise: "درهم", pas_image: "لا توجد صورة",
    prem_titre: "⭐ إعلانات مميزة (Premium)", autres_annonces: "إعلانات أخرى",
    aucune_annonce: "لا توجد إعلانات حاليا.", aucune_categorie: "لا توجد إعلانات في هذه الفئة.", aucun_resultat: "لا توجد نتائج عن «{q}».",
    lbl_categorie: "الفئة", ville_det: "المدينة", lbl_vues: "المشاهدات", lbl_contact: "الاتصال", lbl_galerie: "المعرض",
    galerie_astuce: "(اضغط على الصورة لتكبيرها)", cliquer_agrandir: "اضغط للتكبير", lbl_localisation: "الموقع",
    btn_appeler: "اتصال", retour_accueil: "العودة إلى الرئيسية", modifier: "تعديل", supprimer: "حذف",
    loc_waze: "افتح في 🚗 Waze", loc_gmaps: "افتح في خرائط Google", loc_autre: "افتح الرابط", maroc: "المغرب",
    trad_auto: "🌐 يتم ترجمة محتوى الإعلانات تلقائيا (قد توجد أخطاء).",
    trad_indisponible: "⚠️ الترجمة التلقائية غير متاحة حاليا: يتم عرض النص الأصلي.",
    note_trad: "🌐 مترجم تلقائيا"
});

/* ===== Textes des nouvelles fonctions (contact, sous-catégories, infos pratiques, localisation, page de détail) ===== */
function ajoutTrad(cle, fr, en, ar) { traductions.fr[cle] = fr; traductions.en[cle] = en; traductions.ar[cle] = ar; }
ajoutTrad("btn_contact", "✉️ Nous contacter", "✉️ Contact us", "✉️ اتصل بنا");
ajoutTrad("contact_titre", "✉️ Nous contacter", "✉️ Contact us", "✉️ اتصل بنا");
ajoutTrad("contact_intro", "Écrivez-nous : choisissez le moyen qui vous convient.", "Write to us: pick the way that suits you.", "راسلنا: اختر الوسيلة التي تناسبك.");
ajoutTrad("contact_nom", "Votre nom", "Your name", "اسمك");
ajoutTrad("contact_msg", "Votre message", "Your message", "رسالتك");
ajoutTrad("contact_wa", "💬 Envoyer par WhatsApp", "💬 Send via WhatsApp", "💬 إرسال عبر واتساب");
ajoutTrad("contact_mail", "📧 Envoyer par e-mail", "📧 Send by e-mail", "📧 إرسال عبر البريد الإلكتروني");
ajoutTrad("contact_tel", "📞 Appeler", "📞 Call", "📞 اتصال");
ajoutTrad("contact_vide", "Les coordonnées de contact seront bientôt disponibles.", "Contact details will be available soon.", "ستتوفر بيانات الاتصال قريبا.");
ajoutTrad("contact_sujet", "Message depuis Nador-Service", "Message from Nador-Service", "رسالة من Nador-Service");
ajoutTrad("lbl_souscat", "Sous-catégorie (facultatif)", "Subcategory (optional)", "الفئة الفرعية (اختياري)");
ajoutTrad("sous_aucune", "— Aucune —", "— None —", "— لا شيء —");
ajoutTrad("sous_tout", "Toute la catégorie", "Whole category", "كل الفئة");
ajoutTrad("sous_aria", "Sous-catégories", "Subcategories", "الفئات الفرعية");
ajoutTrad("filtre", "Filtre", "Filter", "تصفية");
ajoutTrad("retirer_filtre", "Retirer le filtre", "Remove filter", "إزالة التصفية");
ajoutTrad("info_medias", "Autant de photos que vous voulez · vidéos 2 Mo max · facultatif", "As many photos as you like · videos 2 MB max · optional", "عدد غير محدود من الصور · فيديوهات 2 ميغابايت كحد أقصى · اختياري");
ajoutTrad("det_annonce", "📄 Annonce", "📄 Ad", "📄 إعلان");
ajoutTrad("det_flash", "⚡ Flash info", "⚡ Flash news", "⚡ خبر عاجل");
ajoutTrad("loc_gps", "📍 Ma position actuelle", "📍 My current location", "📍 موقعي الحالي");
ajoutTrad("loc_choisir", "🗺️ Choisir sur Google Maps", "🗺️ Pick on Google Maps", "🗺️ اختيار على خرائط Google");
ajoutTrad("loc_gps_attente", "Recherche de votre position…", "Finding your position…", "جارٍ البحث عن موقعك…");
ajoutTrad("loc_gps_ok", "✅ Position ajoutée.", "✅ Position added.", "✅ تمت إضافة الموقع.");
ajoutTrad("loc_gps_err", "Position impossible : autorisez la localisation dans votre navigateur.", "Could not get your position: please allow location access.", "تعذر تحديد الموقع: اسمح بالوصول إلى الموقع في المتصفح.");
ajoutTrad("loc_gps_non", "La localisation n'est pas disponible sur cet appareil.", "Location is not available on this device.", "خدمة الموقع غير متوفرة على هذا الجهاز.");
ajoutTrad("loc_lien_extrait", "✅ Lien détecté dans le texte partagé.", "✅ Link detected in the shared text.", "✅ تم اكتشاف رابط في النص المشارك.");
ajoutTrad("info_titre", "ℹ️ Infos pratiques — Nador", "ℹ️ Useful info — Nador", "ℹ️ معلومات مفيدة — الناظور");
ajoutTrad("info_priere", "Horaires de prière", "Prayer times", "أوقات الصلاة");
ajoutTrad("info_meteo", "Météo", "Weather", "الطقس");
ajoutTrad("info_trains", "Trains", "Trains", "القطارات");
ajoutTrad("info_pharmacies", "Pharmacies de garde", "On-duty pharmacies", "الصيدليات المناوبة");
ajoutTrad("info_numeros", "Numéros utiles", "Useful numbers", "أرقام مفيدة");
ajoutTrad("info_chargement", "Chargement…", "Loading…", "جارٍ التحميل…");
ajoutTrad("info_erreur", "Informations indisponibles pour le moment.", "Information unavailable right now.", "المعلومات غير متاحة حاليا.");
ajoutTrad("info_hors_ligne", "Connexion indisponible : dernières données enregistrées.", "No connection: last saved data shown.", "لا يوجد اتصال: عرض آخر البيانات المحفوظة.");
ajoutTrad("info_prochaine", "prochaine", "next", "التالية");
ajoutTrad("info_source_priere", "Mise à jour automatique chaque jour (source : Aladhan, méthode Maroc).", "Updated automatically every day (source: Aladhan, Morocco method).", "تحديث تلقائي كل يوم (المصدر: Aladhan، طريقة المغرب).");
ajoutTrad("info_source_meteo", "Actualisée automatiquement toutes les 30 minutes (source : Open-Meteo).", "Updated automatically every 30 minutes (source: Open-Meteo).", "تحديث تلقائي كل 30 دقيقة (المصدر: Open-Meteo).");
ajoutTrad("info_humidite", "Humidité", "Humidity", "الرطوبة");
ajoutTrad("info_vent", "Vent", "Wind", "الرياح");
ajoutTrad("info_maj", "Mis à jour le", "Updated on", "آخر تحديث");
ajoutTrad("info_aucune", "Aucune information enregistrée pour le moment. Consultez les sites officiels ci-dessous.", "Nothing saved yet. See the official sites below.", "لا توجد معلومات محفوظة حاليا. راجع المواقع الرسمية أدناه.");
ajoutTrad("info_modifier", "🔄 Mettre à jour", "🔄 Update", "🔄 تحديث");
ajoutTrad("info_sites", "Sites officiels marocains", "Official Moroccan websites", "مواقع مغربية رسمية");
ajoutTrad("num_police", "Police", "Police", "الشرطة");
ajoutTrad("num_gendarmerie", "Gendarmerie Royale", "Royal Gendarmerie", "الدرك الملكي");
ajoutTrad("num_pompiers", "Protection civile (pompiers)", "Civil protection (fire brigade)", "الوقاية المدنية (الإطفاء)");
ajoutTrad("num_samu", "Ambulance / SAMU", "Ambulance / SAMU", "الإسعاف / سامو");
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
    const phrases = texte.match(/[^.!?\u061F…\n]*[.!?\u061F…]+\s*|[^.!?\u061F…\n]+\s*|\s+/g) || [];
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

function majUI() {
    const co = !!utilisateurConnecte;
    $("btn-admin-panel").style.display = estAdmin ? "inline-block" : "none";   // l'icône Admin n'est vue que par l'admin
    $("btn-login-user").style.display = co ? "none" : "inline-block";
    $("btn-logout").style.display = co ? "inline-block" : "none";
    $("btn-gerer-flash").style.display = estAdmin ? "inline-block" : "none";
    $("label-user-connecte").textContent = co ? `${estAdmin ? "👑 " : ""}${t("bonjour")}, ${utilisateurConnecte.nom} ${estAdmin ? "(Admin)" : ""}` : "";
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
            <span>${(Number(f.priorite) || 1) >= 3 ? "🔴 " : (Number(f.priorite) || 1) === 2 ? "🟠 " : ""}${esc(f.titre)}</span>
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
    "immobilier": [["Vente", "For sale", "بيع"], ["Location", "For rent", "كراء"], ["Location vacances", "Holiday rentals", "كراء العطل"], ["Terrains", "Land", "أراضٍ"], ["Locaux commerciaux", "Commercial premises", "محلات تجارية"], ["Colocation", "Flatshare", "سكن مشترك"]],
    "vehicules": [["Voitures", "Cars", "سيارات"], ["Motos", "Motorbikes", "دراجات نارية"], ["Camions et utilitaires", "Trucks & vans", "شاحنات وسيارات نفعية"], ["Pièces et accessoires", "Parts & accessories", "قطع غيار وإكسسوارات"], ["Vélos", "Bikes", "دراجات هوائية"]],
    "emploi": [["Offres d'emploi", "Job offers", "عروض عمل"], ["Demandes d'emploi", "Job seekers", "طلبات عمل"], ["Stages", "Internships", "تدريب"], ["Freelance", "Freelance", "عمل حر"]],
    "commerce": [["Mode et vêtements", "Fashion & clothing", "أزياء وملابس"], ["Maison et meubles", "Home & furniture", "منزل وأثاث"], ["Électroménager", "Appliances", "أجهزة كهرومنزلية"], ["Alimentation", "Food", "مواد غذائية"], ["Artisanat", "Crafts", "حِرَف تقليدية"]],
    "services": [["Bâtiment et travaux", "Construction & works", "بناء وأشغال"], ["Transport et déménagement", "Transport & moving", "نقل وترحيل"], ["Santé et beauté", "Health & beauty", "صحة وجمال"], ["Réparation", "Repairs", "إصلاح"], ["Événements", "Events", "مناسبات"]],
    "formation": [["Cours particuliers", "Private lessons", "دروس خصوصية"], ["Langues", "Languages", "لغات"], ["Informatique", "Computing", "معلوميات"], ["Formation professionnelle", "Vocational training", "تكوين مهني"]],
    "telephones et informatique": [["Téléphones", "Phones", "هواتف"], ["Ordinateurs", "Computers", "حواسيب"], ["Tablettes", "Tablets", "أجهزة لوحية"], ["Accessoires", "Accessories", "إكسسوارات"], ["Réparation", "Repairs", "إصلاح"]],
    "infos pratiques": [["Horaires de prière", "Prayer times", "أوقات الصلاة"], ["Trains", "Trains", "القطارات"], ["Pharmacies de garde", "On-duty pharmacies", "الصيدليات المناوبة"], ["Météo", "Weather", "الطقس"], ["Numéros utiles", "Useful numbers", "أرقام مفيدة"], ["Sites officiels", "Official websites", "مواقع رسمية"]]
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
    ar: { "toutes": "الكل", "immobilier": "عقارات", "vehicules": "مركبات", "emploi": "شغل", "commerce": "تجارة", "services": "خدمات", "formation": "تكوين", "telephones et informatique": "هواتف ومعلوميات", "infos pratiques": "معلومات مفيدة", "autres": "أخرى" }
};
const ICONES_CATS = { "toutes": "🏠", "immobilier": "🏢", "vehicules": "🚗", "emploi": "💼", "commerce": "🛍️", "services": "🛠️", "formation": "🎓", "telephones et informatique": "📱", "infos pratiques": "ℹ️", "autres": "📦" };

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

/* Remplace l'ancien compteur : une flèche ? apparaît sur les catégories qui ont des sous-catégories */
function majFleches() {
    document.querySelectorAll(".categorie-btn").forEach(b => {
        const cle = b.dataset.categorie === "toutes" ? "toutes" : cleCategorie(b.dataset.categorie);
        if (!SOUS_CATS[cle] || b.querySelector(".cat-arrow")) return;
        const f = document.createElement("span");
        f.className = "cat-arrow";
        f.setAttribute("role", "button");
        f.setAttribute("aria-haspopup", "true");
        f.setAttribute("aria-expanded", "false");
        f.title = t("sous_aria");
        f.textContent = "\u25BE";
        b.appendChild(f);
    });
}

let menuSousCat = null;

let fondSousCat = null;
function fermerMenuSousCat() {
    if (menuSousCat) menuSousCat.hidden = true;
    if (fondSousCat) fondSousCat.hidden = true;
    document.documentElement.classList.remove("souscat-ouvert");
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
    menuSousCat.innerHTML = subs.map(x => `<button type="button" role="menuitem" class="${actifSous && norm(actifSous) === norm(x[0]) ? "actif" : ""}" data-sous="${esc(x[0])}">${esc(x[idxLangue()])}</button>`).join("");

    const fl = btn.querySelector(".cat-arrow");
    if (fl) { fl.classList.add("ouvert"); fl.setAttribute("aria-expanded", "true"); }
    if (!fondSousCat) {
        fondSousCat = document.createElement("div");
        fondSousCat.className = "souscat-fond";
        fondSousCat.addEventListener("click", fermerMenuSousCat);
        fondSousCat.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
        document.body.insertBefore(fondSousCat, menuSousCat);
    }
    fondSousCat.hidden = false;
    document.documentElement.classList.add("souscat-ouvert");
    menuSousCat.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = menuSousCat.offsetWidth;
    let left = document.dir === "rtl" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    menuSousCat.style.left = left + "px";
    menuSousCat.style.top = (r.bottom + 6) + "px";
    menuSousCat.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 20) + "px";
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
                    ${estAdmin ? `<button class="btn" style="background:#f59e0b;" onclick="togglePremium(${id})" title="Premium">${a.premium ? "⭐" : "☆"}</button>` : ""}
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
                : "🔗 " + t("loc_autre");
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

/* ---------- Dépôt d'annonce en 2 étapes ---------- */
const mediasDepot = fichiersUploades;   // fichiers de l'étape 2
const dessinerDepot = brancherZone("dep-drop", "dep-fichiers", "dep-apercu", mediasDepot, 7);   // 7 photos maximum

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
    pharmacies: [["💊 med.ma", "https://www.med.ma/pharmacie/garde-24-24/nador"], ["💊 annuaire-gratuit.ma", "https://www.annuaire-gratuit.ma/pharmacie-garde-nador.html"]]
};

/* ---------- Sites officiels marocains (saisie manuelle) ----------
   Pour ajouter un site : copiez une ligne  ["Nom", "https://adresse", "description FR", "description EN", "description AR"]
   dans le bon groupe (ou créez un nouveau groupe : ["icône", "FR", "EN", "AR", [ ...sites... ]]). */
const SITES_MAROC = [
    ["🏛️", "Administration et papiers", "Administration & documents", "الإدارة والوثائق", [
        ["Service-public.ma", "https://www.service-public.ma", "Portail national des démarches administratives", "National portal for administrative procedures", "البوابة الوطنية للمساطر والخدمات الإدارية"],
        ["Idarati", "https://www.idarati.ma", "Démarches et services en ligne de l'administration", "Online administrative services", "المساطر والخدمات الإدارية عبر الإنترنت"],
        ["CNIE", "https://www.cnie.ma", "Carte nationale d'identité électronique : demande et rendez-vous", "National ID card: application and appointments", "البطاقة الوطنية للتعريف الإلكترونية: الطلب وأخذ الموعد"],
        ["Passeport", "https://www.passeport.ma", "Demande de passeport et prise de rendez-vous", "Passport application and appointments", "طلب جواز السفر وأخذ موعد"],
        ["Casier judiciaire", "https://www.casierjudiciaire.gov.ma", "Extrait de casier judiciaire en ligne", "Criminal record extract online", "مستخرج السجل العدلي عبر الإنترنت"],
        ["Watiqa", "https://www.watiqa.ma", "Actes d'état civil (naissance, mariage…)", "Civil status records (birth, marriage…)", "عقود الحالة المدنية (الولادة، الزواج…)"]
    ]],
    ["🚌", "Transport et voyage", "Transport & travel", "النقل والسفر", [
        ["ONCF", "https://www.oncf-voyages.ma", "Trains : horaires et réservation", "Trains: timetables and booking", "القطارات: المواعيد والحجز"],
        ["CTM", "https://www.ctm.ma", "Autocars : horaires et billets", "Coaches: timetables and tickets", "الحافلات: المواعيد والتذاكر"],
        ["Royal Air Maroc", "https://www.royalairmaroc.com", "Vols nationaux et internationaux", "Domestic and international flights", "رحلات جوية داخلية ودولية"],
        ["ONDA", "https://www.onda.ma", "Aéroports du Maroc (dont Nador – Al Aroui)", "Moroccan airports (incl. Nador – Al Aroui)", "مطارات المغرب (ومنها الناظور – العروي)"],
        ["ANP", "https://www.anp.org.ma", "Agence nationale des ports (Nador, Béni Ansar)", "National ports agency (Nador, Beni Ansar)", "الوكالة الوطنية للموانئ (الناظور، بني أنصار)"],
        ["NARSA", "https://www.narsa.ma", "Permis, carte grise, amendes routières", "Driving licence, vehicle registration, fines", "رخص السياقة والبطاقة الرمادية والمخالفات الطرقية"]
    ]],
    ["💰", "Impôts, douane et foncier", "Taxes, customs & land registry", "الضرائب والجمارك والعقار", [
        ["DGI (impôts)", "https://www.tax.gov.ma", "Déclarations, paiements et attestations fiscales", "Tax returns, payments and certificates", "التصريحات والأداءات والشهادات الضريبية"],
        ["Douane (ADII)", "https://www.douane.gov.ma", "Réglementation douanière, import/export, voyageurs", "Customs rules, import/export, travellers", "الأنظمة الجمركية والاستيراد والتصدير والمسافرون"],
        ["ANCFCC", "https://www.ancfcc.gov.ma", "Conservation foncière, titres fonciers, cadastre", "Land registry, titles, cadastre", "المحافظة العقارية والرسوم العقارية والمسح الطبوغرافي"]
    ]],
    ["⚖️", "Justice", "Justice", "العدالة", [
        ["Mahakim", "https://www.mahakim.ma", "Suivi des dossiers et affaires judiciaires", "Court case tracking", "تتبع الملفات والقضايا القضائية"],
        ["Ministère de la Justice", "https://www.justice.gov.ma", "Informations et services judiciaires", "Information and judicial services", "معلومات وخدمات قضائية"]
    ]],
    ["🏥", "Santé et protection sociale", "Health & social security", "الصحة والحماية الاجتماعية", [
        ["CNSS", "https://www.cnss.ma", "Sécurité sociale, AMO, allocations familiales", "Social security, AMO health cover, family allowances", "الضمان الاجتماعي والتأمين الإجباري عن المرض والتعويضات العائلية"],
        ["CNOPS", "https://www.cnops.org.ma", "Assurance maladie des fonctionnaires", "Health insurance for civil servants", "التأمين الصحي للموظفين"],
        ["Ministère de la Santé", "https://www.sante.gov.ma", "Hôpitaux, vaccination, informations de santé", "Hospitals, vaccination, health information", "المستشفيات والتلقيح والمعلومات الصحية"]
    ]],
    ["💼", "Emploi et formation", "Jobs & training", "الشغل والتكوين", [
        ["ANAPEC", "https://www.anapec.org", "Offres d'emploi et inscription demandeur d'emploi", "Job offers and job-seeker registration", "عروض العمل وتسجيل طالبي الشغل"],
        ["Emploi-public.ma", "https://www.emploi-public.ma", "Concours et recrutements dans la fonction publique", "Public-sector exams and recruitment", "المباريات والتوظيف في الوظيفة العمومية"],
        ["OFPPT", "https://www.ofppt.ma", "Formation professionnelle : inscriptions et filières", "Vocational training: enrolment and programmes", "التكوين المهني: التسجيل والشعب"],
        ["Université Mohammed Ier", "https://www.ump.ma", "Université de la région (Oujda, Nador)", "Regional university (Oujda, Nador)", "جامعة الجهة (وجدة، الناظور)"],
        ["Massar", "https://massar.men.gov.ma", "Espace parents et élèves (scolarité)", "Parents' and pupils' school portal", "فضاء الآباء والتلاميذ (الدراسة)"]
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
    [[1], "🌤️", "Plutôt dégagé", "Mostly clear", "صافٍ غالبا"],
    [[2], "⛅", "Partiellement nuageux", "Partly cloudy", "غائم جزئيا"],
    [[3], "☁️", "Couvert", "Overcast", "غائم"],
    [[45, 48], "🌫️", "Brouillard", "Fog", "ضباب"],
    [[51, 53, 55, 56, 57], "🌦️", "Bruine", "Drizzle", "رذاذ"],
    [[61, 63, 65, 66, 67], "🌧️", "Pluie", "Rain", "مطر"],
    [[71, 73, 75, 77, 85, 86], "❄️", "Neige", "Snow", "ثلج"],
    [[80, 81, 82], "🌧️", "Averses", "Showers", "زخات مطر"],
    [[95, 96, 99], "⛈️", "Orage", "Thunderstorm", "عواصف رعدية"]
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
        (veut("Numéros utiles") ? carte("info-numeros", "📞 " + esc(t("info_numeros")), blocNumeros()) : "") +
        (veut("Sites officiels") ? `<div class="info-carte" id="info-sites" style="grid-column:1/-1"><h3>🌐 ${esc(t("info_sites"))}</h3><div class="info-corps">${blocSites()}</div></div>` : "") + `</div>`;
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

/* ==================================================================
   3. SÉCURITÉ NAVIGATEUR (filtre de contenu, anti-spam, anti force brute)
   ================================================================== */
/* ===== Nador-Service : couche de sécurité (à charger APRÈS script.js et AVANT supabase-data.js) =====
   1. Filtre de contenu : insultes, vulgarité, racisme, contenu sexuel, drogues, arnaques (FR / EN / AR / darija)
   2. Détection de code malveillant (HTML/script, SQL) dans les textes saisis
   3. Anti-spam : piège à robots (honeypot), délai minimal, limite de dépôts
   4. Anti force brute : verrouillage temporaire après trop d'échecs de connexion
   Pour ajouter un mot interdit : complétez MOTS_EXACTS (mot entier ou expression) ou MOTS_CONTENUS (fragment).
   IMPORTANT : ce contrôle côté navigateur est contournable ; le vrai blocage est assuré côté serveur par SECURITE_SUPABASE.sql. */
(function () {
    "use strict";

    const MOTS_EXACTS = ["pute", "putes", "salope", "salaud", "connard", "connasse", "encule", "enculee", "enculer", "nique", "niquer", "niquez", "ntm", "fdp", "merde", "couille", "pede", "enfoire", "trouduc", "ta gueule", "ferme ta gueule", "fils de pute", "sale arabe", "sale noir", "sale juif", "sale juive", "sale blanc", "sale negre", "sale race", "sous race", "sous homme", "negre", "bougnoule", "bicot", "youpin", "chinetoque", "mort aux arabes", "mort aux juifs", "mort aux noirs", "mort aux amazighs", "mort aux berberes", "mort aux chretiens", "mort aux musulmans", "mort aux blancs", "heil hitler", "sieg heil", "xxx", "escort", "escorte", "prostituee", "prostitue", "prostitution", "baise", "branler", "branlette", "suceuse", "sodomie", "fellation", "nude", "nudes", "sexcam", "onlyfans", "erotique", "plan cul", "massage erotique", "massage sexuel", "rencontre coquine", "sugar daddy", "viagra", "cialis", "levitra", "cocaine", "heroine", "ecstasy", "mdma", "captagon", "karkoubi", "chira", "hachich", "haschich", "faux billets", "faux dirhams", "faux papiers", "carte clonee", "pirater un compte", "pirater compte", "hacker compte", "hack compte", "hack facebook", "hack instagram", "hack whatsapp", "espionner whatsapp", "ddos", "shit", "shits", "bullshit", "bitch", "bitches", "bastard", "asshole", "dickhead", "pussy", "cunt", "whore", "slut", "faggot", "fag", "blowjob", "handjob", "white power", "death to arabs", "death to jews", "zebi", "zbi", "zeb", "zamel", "zaml", "kahlouch", "kahlush", "mnayk", "mnayak", "mnaik", "nik mok", "nik omak", "nik ommek", "wld lhram", "ould lhram", "قحبة", "شرموطة", "عاهرة", "زانية", "ابن الزانية", "ولد القحبة", "ولد الحرام", "ابن الحرام", "زامل", "زبي", "كس امك", "كسمك", "نيك امك", "منيوك", "منايك", "عرص", "ديوث", "كحلوش", "ابن الكلب", "الموت للعرب", "الموت لليهود", "الموت للأمازيغ", "الموت للسود", "سكس", "سكس مغربي", "دعارة", "عاهرات", "قحاب"];
    /* Fragments comparés AVANT suppression des lettres doublées (évite de confondre « nigger » avec « Niger ») */
    const MOTS_BRUTS = ["nigger", "nigga", "niggr"];
    const MOTS_CONTENUS = ["putain", "salope", "connard", "enculer", "fuck", "porno", "pornographie", "porn", "sexcam", "motherfucker", "qahba", "kahba", "gahba", "nikmok", "niqmok", "nikomak", "niqomak", "bougnoule", "merde"];

    /* ---------- Normalisation (accents, arabe, chiffres/symboles utilisés pour tricher : f*ck, p3te, 9a7ba…) ---------- */
    const remplacer = (v, de, vers) => v.replace(/[\s\S]/g, c => { const i = de.indexOf(c); return i < 0 ? c : vers[i]; });
    const LEET_DE = "013457@$!", LEET_VERS = "oieastasi";
    const DAR_DE = "973258", DAR_VERS = "qhaakg";

    function base(t) {
        let v = String(t == null ? "" : t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return v.replace(/[\u064B-\u065F\u0640]/g, "").replace(/[\u0623\u0625\u0622]/g, "\u0627").replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647");
    }
    const brut = v => " " + v.replace(/[^a-z\u0621-\u064A]+/g, " ").trim() + " ";
    function finir(v) {
        v = v.replace(/[^a-z\u0621-\u064A]+/g, " ").replace(/(.)\1+/g, "$1").trim();
        // « f u c k » ou « f.u.c.k » : on recolle les suites de lettres isolées
        const jetons = v.split(" "), sortie = [];
        for (let i = 0; i < jetons.length;) {
            if (jetons[i].length === 1) {
                let j = i; while (j < jetons.length && jetons[j].length === 1) j++;
                if (j - i >= 3) { sortie.push(jetons.slice(i, j).join("")); i = j; continue; }
            }
            sortie.push(jetons[i++]);
        }
        return " " + sortie.join(" ") + " ";
    }
    const normaliser = t => finir(base(t));
    const variantes = t => { const b = base(t); return [finir(b), finir(remplacer(b, LEET_DE, LEET_VERS)), finir(remplacer(b, DAR_DE, DAR_VERS))]; };

    const EXACTS = MOTS_EXACTS.map(m => normaliser(m).trim()).filter(Boolean);
    const CONTENUS = MOTS_CONTENUS.map(m => normaliser(m).trim()).filter(Boolean);

    function motInterdit(texte) {
        const b = base(texte);
        for (const s of [brut(b), brut(remplacer(b, LEET_DE, LEET_VERS))]) for (const m of MOTS_BRUTS) if (s.includes(m)) return m;
        for (const s of variantes(texte)) {
            for (const m of EXACTS) if (s.includes(" " + m + " ") || s.includes(" " + m + "s ")) return m;
            for (const m of CONTENUS) if (s.includes(m)) return m;
        }
        return null;
    }

    /* ---------- Code malveillant ---------- */
    const MOTIFS_CODE = [
        /<\s*\/?\s*(script|iframe|object|embed|svg|style|link|meta|form|img|video|audio|base)\b/i,
        /\bjavascript\s*:/i, /\bvbscript\s*:/i, /data\s*:\s*text\/html/i,
        /\bon[a-z]{3,}\s*=/i,
        /\bunion\s+(all\s+)?select\b/i, /\bdrop\s+(table|database)\b/i, /'\s*or\s*'?\d+'?\s*=\s*'?\d+/i, /;\s*(delete|insert|update)\s+/i,
        /\bdocument\s*\.\s*(cookie|write)\b/i, /\beval\s*\(/i
    ];
    const codeSuspect = t => MOTIFS_CODE.some(r => r.test(String(t || "")));

    /* ---------- Vérification d'un ensemble de champs ---------- */
    function verifierChamps(champs) {
        for (const [nom, valeur] of champs) {
            const v = String(valeur || "");
            if (codeSuspect(v)) { alert("« " + nom + " » contient du code ou des caractères non autorisés."); return false; }
            if ((v.match(/https?:\/\/|www\./gi) || []).length > 3) { alert("« " + nom + " » contient trop de liens."); return false; }
            if (/(.)\1{14,}/.test(v)) { alert("« " + nom + " » contient trop de caractères répétés."); return false; }
            const m = motInterdit(v);
            if (m) { alert("« " + nom + " » contient un terme interdit (« " + m + " »).\nLes insultes, propos vulgaires, racistes ou à caractère sexuel ne sont pas acceptés. Merci de reformuler."); return false; }
        }
        return true;
    }

    /* ---------- Limiteur (anti-spam / anti force brute), mémorisé dans ce navigateur ---------- */
    function limiteur(cle, max, fenetreMs) {
        const lire = () => { try { return (JSON.parse(localStorage.getItem(cle)) || []).filter(x => Date.now() - x < fenetreMs); } catch (e) { return []; } };
        const ecrire = l => { try { localStorage.setItem(cle, JSON.stringify(l)); } catch (e) {} };
        return {
            bloque: () => lire().length >= max,
            attenteMin: () => { const l = lire(); return l.length ? Math.max(1, Math.ceil((fenetreMs - (Date.now() - l[0])) / 60000)) : 0; },
            ajouter: () => { const l = lire(); l.push(Date.now()); ecrire(l); },
            vider: () => ecrire([]),
            dernier: () => { const l = lire(); return l.length ? l[l.length - 1] : 0; }
        };
    }
    const limAdmin = limiteur("sec_admin", 5, 10 * 60000);
    const limUser = limiteur("sec_user", 8, 10 * 60000);
    const limDepot = limiteur("sec_depots", 5, 60 * 60000);

    const g = id => document.getElementById(id);
    function bloquer(e) { e.preventDefault(); e.stopImmediatePropagation(); }
    function piegeRobot(form, id) {
        const h = document.createElement("input");
        h.type = "text"; h.id = id; h.name = "site_web"; h.tabIndex = -1; h.autocomplete = "off"; h.setAttribute("aria-hidden", "true");
        h.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
        form.appendChild(h); return h;
    }

    const brancherSecurite = () => {
        /* --- Connexion admin : verrouillage après 5 échecs --- */
        const fAdmin = g("form-admin-login");
        if (fAdmin) fAdmin.addEventListener("submit", e => {
            if (limAdmin.bloque()) { bloquer(e); alert("Trop de tentatives. Réessayez dans " + limAdmin.attenteMin() + " minute(s)."); }
        }, true);

        /* --- Connexion / inscription utilisateur --- */
        const fUser = g("form-user-auth");
        if (fUser) {
            const hp = piegeRobot(fUser, "hp-user");
            fUser.addEventListener("submit", e => {
                if (hp.value) return bloquer(e);
                if (limUser.bloque()) { bloquer(e); return alert("Trop de tentatives. Réessayez dans " + limUser.attenteMin() + " minute(s)."); }
                if (typeof modeInscription !== "undefined" && modeInscription) {
                    const nom = g("u-nom").value.trim();
                    if (nom.length > 60 || !verifierChamps([["Nom", nom]])) return bloquer(e);
                    const mdp = g("u-mdp").value;
                    if (mdp.length < 8 || !/[a-zA-Z]/.test(mdp) || !/\d/.test(mdp)) { bloquer(e); alert("Mot de passe trop faible : 8 caractères minimum, avec au moins une lettre et un chiffre."); }
                }
            }, true);
        }

        /* --- Dépôt d'annonce --- */
        const fDepot = g("form-deposer");
        if (fDepot) {
            const hp = piegeRobot(fDepot, "hp-depot");
            const champs = () => [["Titre", g("dep-titre").value], ["Description", g("dep-description").value], ["Localisation", g("dep-localisation").value]];
            const prixOk = () => { const p = g("dep-prix").value; return !p || (Number(p) >= 0 && Number(p) <= 999999999); };

            const suivant = g("dep-suivant");
            if (suivant) suivant.addEventListener("click", e => {
                if (!verifierChamps(champs()) || !prixOk()) bloquer(e);
            }, true);

            fDepot.addEventListener("submit", e => {
                if (hp.value) return bloquer(e);
                if (!verifierChamps(champs())) return bloquer(e);
                if (!prixOk()) { bloquer(e); return alert("Prix invalide."); }
                const publication = g("dep-etape2") && !g("dep-etape2").hidden;
                if (!publication) return;
                if (Date.now() - ouvertLe < 5000) { bloquer(e); return alert("Veuillez patienter quelques secondes avant de publier."); }
                if (Date.now() - limDepot.dernier() < 20000) { bloquer(e); return alert("Veuillez patienter avant de publier une autre annonce."); }
                if (limDepot.bloque()) { bloquer(e); return alert("Limite atteinte : 5 annonces par heure. Réessayez dans " + limDepot.attenteMin() + " minute(s)."); }
                limDepot.ajouter();
            }, true);
        }
    };

    /* Heure d'ouverture du formulaire de dépôt (un robot remplit tout instantanément) */
    let ouvertLe = Date.now();
    if (typeof window.ouvrirDepot === "function") {
        const _ouvrir = window.ouvrirDepot;
        window.ouvrirDepot = function () { ouvertLe = Date.now(); return _ouvrir.apply(this, arguments); };
    }

    window.Securite = {
        motInterdit, verifierChamps, codeSuspect,
        admin: { echec: limAdmin.ajouter, succes: limAdmin.vider },
        user: { echec: limUser.ajouter, succes: limUser.vider }
    };
    /* Branché immédiatement : ces contrôles passent AVANT ceux de la couche Supabase (même élément, même ordre d'enregistrement) */
    brancherSecurite();
})();

/* ==================================================================
   4. DONNÉES ET COMPTES (Supabase)
   ================================================================== */
/* Couche Supabase pour Nador-Service : à charger APRÈS script.js */
const SEC = window.Securite || { admin: { echec() {}, succes() {} }, user: { echec() {}, succes() {} } };
const sb = supabase.createClient("https://lmcrljbcxjpwvbhoqtxw.supabase.co", "sb_publishable_NYhmeyCG7GPGZrJYsh0jFg_7V5YGrYE");

let catIds = {}, catNoms = {};
/* « telephone » est volontairement absent : il n'est lu que par obtenir_contact() (voir MIGRATION_NADOR.sql) */
const COLS_ANNONCE = "id,user_id,categorie_id,titre,description,ville,prix,localisation,sous_categorie,premium,vues,created_at,statut,quartier,region,secteur,attributs";
const erreur = (m, e) => { console.error(m, e); alert(m + (e && e.message ? "\n(" + e.message + ")" : "")); };

async function chargerCategories() {
    const { data } = await sb.from("categories").select("id,nom_fr");
    (data || []).forEach(c => { catIds[c.nom_fr] = c.id; catNoms[c.id] = c.nom_fr; });
}
async function chargerAnnonces() {
    const lire = cols => sb.from("annonces").select(cols + ", annonce_medias(url,type,ordre)").eq("statut", "active").order("created_at", { ascending: false });
    let { data, error } = await lire(COLS_ANNONCE);
    if (error) {   // migration SQL pas (entièrement) appliquée : on retente avec les colonnes de base
        console.warn("Lecture complète impossible, nouvel essai avec les colonnes de base :", error.message);
        ({ data, error } = await lire(COLS_ANNONCE.replace(/,quartier,region,secteur,attributs/, "")));
    }
    if (error) { console.error(error); return alert("Impossible de charger les annonces.\n(" + error.message + ")\nExécutez MIGRATION_NADOR.sql dans Supabase, ou voir l'aide donnée par Claude."); }
    annonces = data.map(a => ({
        id: a.id, user_id: a.user_id, titre: a.titre, categorie: catNoms[a.categorie_id] || "Autres",
        ville: a.ville, prix: a.prix, description: a.description, telephone: a.telephone || "",
        localisation: a.localisation || "", sousCategorie: a.sous_categorie || "", quartier: a.quartier || "", region: a.region || "", secteur: a.secteur || "", attributs: a.attributs || {}, premium: a.premium, vues: a.vues, date: Date.parse(a.created_at),
        medias: (a.annonce_medias || []).sort((x, y) => x.ordre - y.ordre).map(m => ({ type: m.type, url: m.url }))
    }));
}
async function chargerFlashs() {
    const { data, error } = await sb.from("flashs").select("*, flash_medias(url,type,ordre)")
        .eq("actif", true).order("created_at", { ascending: true });
    if (error) return console.error(error);
    flashs = data.map(f => ({ id: f.id, titre: f.titre, type: "texte", contenu: f.texte || "", priorite: Number(f.priorite) || 1,
        medias: (f.flash_medias || []).sort((x, y) => x.ordre - y.ordre).map(m => ({ type: m.type, url: m.url })) }));
}
async function chargerInfos() {
    const { data, error } = await sb.from("infos_pratiques").select("cle,texte,maj_le");
    if (error) return console.warn("Table infos_pratiques indisponible (non créée ?) :", error.message);
    (data || []).forEach(r => { infosPratiques[r.cle] = { texte: r.texte || "", majLe: Date.parse(r.maj_le) || 0 }; });
}
window.sauvegarderInfosDistant = async function (o) {
    const lignes = Object.keys(o).map(cle => ({ cle, texte: o[cle].texte || "", maj_le: new Date(o[cle].majLe || Date.now()).toISOString() }));
    const { error } = await sb.from("infos_pratiques").upsert(lignes);
    if (error) erreur("Enregistrement des infos pratiques impossible (la table infos_pratiques existe-t-elle ?).", error);
};

async function chargerVisites() {
    let n;
    if (!sessionStorage.getItem("visiteSb")) { n = (await sb.rpc("incrementer_visiteurs")).data; sessionStorage.setItem("visiteSb", "1"); }
    else n = ((await sb.from("stats").select("valeur").eq("cle", "visiteurs").single()).data || {}).valeur;
    if (n != null) { nbVisites = Number(n); afficherStats(); }
}

/* Envoi d'une photo/vidéo dans Storage (les données data: deviennent une URL publique) */
async function envoyerMedia(m, dossier) {
    if (!/^(data|blob):/.test(String(m.url))) return m.url;
    const blob = await (await fetch(m.url)).blob();
    const ext = (blob.type.split("/")[1] || "bin").split(";")[0];
    const chemin = `${dossier}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("medias").upload(chemin, blob, { contentType: blob.type });
    if (error) throw error;
    return sb.storage.from("medias").getPublicUrl(chemin).data.publicUrl;
}

/* ---------- Comptes ---------- */
async function appliquerSession(session) {
    if (!session) { estAdmin = false; utilisateurConnecte = null; return; }
    const { data: p } = await sb.from("profiles").select("nom_complet,is_admin").eq("id", session.user.id).maybeSingle();
    estAdmin = !!(p && p.is_admin);
    utilisateurConnecte = { id: session.user.id, email: session.user.email,
        nom: (p && p.nom_complet) || session.user.email.split("@")[0] };
}

$("form-admin-login").addEventListener("submit", async e => {
    e.stopImmediatePropagation(); e.preventDefault();
    const { data, error } = await sb.auth.signInWithPassword({ email: $("admin-email").value.trim(), password: $("admin-pass").value });
    if (error) { SEC.admin.echec(); return alert("Email ou mot de passe incorrect."); }
    await appliquerSession(data.session);
    if (!estAdmin) { SEC.admin.echec(); await sb.auth.signOut(); await appliquerSession(null); majUI(); return alert("Ce compte n'est pas administrateur."); }
    SEC.admin.succes(); $("admin-pass").value = ""; fermerModal("modal-admin"); majUI();
}, true);

$("form-user-auth").addEventListener("submit", async e => {
    e.stopImmediatePropagation(); e.preventDefault();
    const email = $("u-email").value.trim().toLowerCase(), password = $("u-mdp").value;
    let res;
    if (modeInscription) {
        res = await sb.auth.signUp({ email, password, options: { data: { nom_complet: $("u-nom").value.trim() } } });
        if (!res.error && !res.data.session) return alert("Compte créé. Vérifiez votre email pour confirmer votre inscription, puis connectez-vous.");
    } else res = await sb.auth.signInWithPassword({ email, password });
    if (res.error && !modeInscription) SEC.user.echec();
    if (res.error) return alert(modeInscription ? "Inscription impossible : " + res.error.message : "Email ou mot de passe incorrect.");
    SEC.user.succes();
    await appliquerSession(res.data.session);
    $("form-user-auth").reset(); fermerModal("modal-user"); majUI();
}, true);

async function deconnexion() { await sb.auth.signOut(); await appliquerSession(null); majUI(); };
function estAutoriseAModifier(a) { return estAdmin || (utilisateurConnecte && a.user_id === utilisateurConnecte.id); }
function modifierAnnonce() { alert("La modification d'annonce sera reconnectée à la prochaine étape. Vous pouvez la supprimer et la republier."); }

/* ---------- Annonces ---------- */
async function supprimerAnnonce(id) {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    const { error } = await sb.from("annonces").delete().eq("id", id);
    if (error) return erreur("Suppression impossible.", error);
    fermerPageDetail(); await chargerAnnonces(); afficherAnnonces();
};
async function togglePremium(id) {
    const a = trouver(id); if (!a) return;
    const { error } = await sb.rpc("basculer_premium", { p_id: id, p_val: !a.premium });
    if (error) return erreur("Action impossible.", error);
    await chargerAnnonces(); afficherAnnonces();
};
/* Compteur de vues : script.js appelle ce crochet à CHAQUE clic sur une annonce */
window.enregistrerVueDistante = async function (a) {
    const { data, error } = await sb.rpc("incrementer_vues", { p_id: a.id });
    if (error) { console.error("Compteur de vues : la fonction SQL incrementer_vues a échoué", error); return; }
    if (typeof data === "number") { a.vues = data; rafraichirVuesAffichees(a); }
};

$("form-deposer").addEventListener("submit", async e => {
    e.stopImmediatePropagation(); e.preventDefault();
    if ($("dep-etape2").hidden) { if (etape1Valide()) afficherEtape(2); return; }
    if (!etape1Valide()) { afficherEtape(1); return; }
    const btn = $("dep-publier"); btn.disabled = true;
    try {
        const prix = $("dep-prix").value;
        const ligne = {
            user_id: utilisateurConnecte ? utilisateurConnecte.id : null,
            categorie_id: catIds[$("dep-categorie").value] || catIds["Autres"],
            titre: $("dep-titre").value.trim(), description: $("dep-description").value.trim(),
            ville: $("dep-ville").value, prix: prix ? parseFloat(prix) : null,
            telephone: $("dep-telephone").value.trim(), localisation: $("dep-localisation").value.trim(),
            quartier: $("dep-quartier").value.trim(), region: $("dep-region").value, secteur: $("dep-secteur").value.trim(),
            attributs: window.lireAttributsDepot ? window.lireAttributsDepot() : {}
        };
        if ($("dep-souscat").value) ligne.sous_categorie = $("dep-souscat").value;
        const { data: a, error } = await sb.from("annonces").insert(ligne).select("id").single();
        if (error) throw error;
        const meds = [];
        for (const [i, m] of mediasDepot.entries()) meds.push({ annonce_id: a.id, type: m.type, url: await envoyerMedia(m, "annonces"), ordre: i });
        if (meds.length) { const r = await sb.from("annonce_medias").insert(meds); if (r.error) throw r.error; }
        $("form-deposer").reset(); mediasDepot.length = 0; dessinerDepot();
        fermerModal("modal-deposer");
        await chargerAnnonces(); choisirCategorie("toutes");
        alert("Annonce publiée avec succès !");
    } catch (err) { erreur("Publication impossible.", err); }
    finally { btn.disabled = false; }
}, true);

/* ---------- Flash info (admin) ---------- */
$("form-ajouter-flash").addEventListener("submit", async e => {
    e.stopImmediatePropagation(); e.preventDefault();
    if (!estAdmin) return;
    try {
        const champs = { titre: $("f-titre").value.trim(), texte: $("f-contenu").value };
        const prio = Number($("f-priorite").value) || 1, avant = flashEnEdition !== null ? flashs.find(x => String(x.id) === String(flashEnEdition)) : null;
        if (prio !== 1 || (avant && (Number(avant.priorite) || 1) !== 1)) champs.priorite = prio;
        let id = flashEnEdition;
        if (id !== null) { const r = await sb.from("flashs").update(champs).eq("id", id); if (r.error) throw r.error; await sb.from("flash_medias").delete().eq("flash_id", id); }
        else { const r = await sb.from("flashs").insert(champs).select("id").single(); if (r.error) throw r.error; id = r.data.id; }
        const meds = [];
        for (const [i, m] of mediasFlash.entries()) meds.push({ flash_id: id, type: m.type, url: await envoyerMedia(m, "flash"), ordre: i });
        if (meds.length) { const r = await sb.from("flash_medias").insert(meds); if (r.error) throw r.error; }
        await chargerFlashs(); afficherFlashs(); annulerEditionFlash(); fermerModal("modal-gerer-flash");
    } catch (err) { erreur("Enregistrement du flash impossible.", err); }
}, true);

async function supprimerFlash(id) {
    if (!estAdmin || !confirm("Supprimer ce flash ?")) return;
    const { error } = await sb.from("flashs").delete().eq("id", id);
    if (error) return erreur("Suppression impossible.", error);
    await chargerFlashs(); afficherFlashs();
    if (String(flashEnEdition) === String(id)) annulerEditionFlash(); else rafraichirListeFlash();
};

/* ---------- Démarrage ---------- */
(async () => {
    await chargerCategories();
    await appliquerSession((await sb.auth.getSession()).data.session);
    await Promise.all([chargerAnnonces(), chargerFlashs(), chargerVisites(), chargerInfos()]);
    majUI();
    const p = new URLSearchParams(location.search).get("annonce");
    if (p) voirDetailAnnonce(p);
})();

/* ==================================================================
   5. EXTENSIONS (filtres, demander un service, appareil photo, contact, PWA)
   ================================================================== */
/* Nador-Service : extensions — à charger APRÈS supabase-data.js
   1 catégories/sous-catégories · 2 appareil photo (7 photos) · 3 « Publier » · 4 appli installable
   6 contact masqué · 7 contrôle des numéros · 8 recherche avancée · 9 filtres dynamiques · 10 « Demander un service » */
(function () {
const T = (fr, en, ar) => [fr, en, ar][idxLangue()];

// CODE CORRIGÉ :
const nz = s => norm(s).replace(/[\u064B-\u065F\u0640]/g, "").replace(/[\u0622\u0623\u0625]/g, "a").replace(/\?/g, "");

/* darija écrite en chiffres : 7?h, 9?q, 3/2?a, 5?k, 8?g ; lettres doublées réduites */
const dz = s => nz(s).replace(/7/g, "h").replace(/9/g, "q").replace(/[23]/g, "a").replace(/5/g, "k").replace(/8/g, "g").replace(/(.)\1+/g, "$1").replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").trim();

/* ===== 1. Catégories : 4 principales + Infos pratiques ===== */
Object.keys(SOUS_CATS).forEach(k => { if (k !== "infos pratiques") delete SOUS_CATS[k]; });
Object.assign(SOUS_CATS, {
 "services": [["Bâtiment et travaux","Construction & works","بناء وأشغال"],["Transport et déménagement","Transport & moving","نقل وترحيل"],["Santé et beauté","Health & beauty","صحة وجمال"],["Réparation","Repairs","إصلاح"],["Événements","Events","مناسبات"],["Offres d'emploi","Job offers","عروض عمل"],["Demandes d'emploi","Job seekers","طلبات عمل"],["Stages","Internships","تدريب"],["Freelance","Freelance","عمل حر"]],
 "logement": [["Vente","For sale","بيع"],["Location","For rent","كراء"],["Location vacances","Holiday rentals","كراء العطل"],["Colocation","Flatshare","سكن مشترك"],["Terrains","Land","أراضٍ"],["Locaux commerciaux","Commercial premises","محلات تجارية"]],
 "formation": [["Cours particuliers","Private lessons","دروس خصوصية"],["Langues","Languages","لغات"],["Informatique","Computing","معلوميات"],["Formation professionnelle","Vocational training","تكوين مهني"]],
 "commerce": [["Mode et vêtements","Fashion & clothing","أزياء وملابس"],["Maison et meubles","Home & furniture","منزل وأثاث"],["Électroménager","Appliances","أجهزة كهرومنزلية"],["Alimentation","Food","مواد غذائية"],["Artisanat","Crafts","حِرَف تقليدية"],["Voitures","Cars","سيارات"],["Motos","Motorbikes","دراجات نارية"],["Camions et utilitaires","Trucks & vans","شاحنات وسيارات نفعية"],["Pièces et accessoires","Parts & accessories","قطع غيار وإكسسوارات"],["Vélos","Bikes","دراجات هوائية"],["Téléphones","Phones","هواتف"],["Ordinateurs","Computers","حواسيب"],["Tablettes","Tablets","أجهزة لوحية"],["Accessoires","Accessories","إكسسوارات"]]
});
CATS_CONNUES.length = 0; CATS_CONNUES.push("services", "logement", "formation", "commerce", "infos pratiques");
Object.assign(ALIAS_CATS, { "immobilier": "logement", "vehicules": "commerce", "telephones et informatique": "commerce", "emploi": "services", "autres": "services", "divers": "services" });
Object.assign(CATS_AFFICHAGE.fr, { logement: "Logement" }); Object.assign(CATS_AFFICHAGE.en, { logement: "Housing" }); Object.assign(CATS_AFFICHAGE.ar, { logement: "سكن" });
ICONES_CATS.logement = "🏠";
const CAT_ORDRE = [["Services", "services"], ["Logement", "logement"], ["Formation", "formation"], ["Commerce", "commerce"], ["Infos pratiques", "infos pratiques"]];

/* Sous-panneau : colonne claire à droite de la catégorie */
const _menu = ouvrirMenuSousCat;
ouvrirMenuSousCat = function (btn) {
    _menu(btn);
    if (!menuSousCat || menuSousCat.hidden) return;
    const r = btn.getBoundingClientRect(), w = menuSousCat.offsetWidth, rtl = document.dir === "rtl";
    let left = rtl ? r.left - w + 18 : r.right - 18;
    menuSousCat.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + "px";
    menuSousCat.style.top = (r.bottom + 4) + "px";
};

/* ===== Textes traduits ===== */
const TR = [
 ["btn_publier_top", "➕ Publier", "➕ Post", "➕ انشر"],
 ["deposer_titre", "📝 Publier une annonce", "📝 Post an ad", "📝 انشر إعلانًا"],
 ["btn_publier", "Publier", "Publish", "نشر"],
 ["btn_demander", "🙋 Demander un service", "🙋 Request a service", "🙋 اطلب خدمة"],
 ["btn_installer", "📲 Installer l'application", "📲 Install the app", "📲 تثبيت التطبيق"],
 ["lien_confid", "Politique de confidentialité", "Privacy policy", "سياسة الخصوصية"],
 ["lbl_region", "Région", "Region", "الجهة"], ["lbl_quartier", "Quartier", "Neighbourhood", "الحي"], ["lbl_secteur", "Secteur / domaine", "Sector / field", "القطاع / المجال"],
 ["info_medias", "7 photos maximum (appareil photo ou galerie) · vidéos 2 Mo max · facultatif", "7 photos max (camera or gallery) · videos 2 MB max · optional", "7 صور كحد أقصى (الكاميرا أو المعرض) · فيديوهات 2 ميغابايت كحد أقصى · اختياري"],
 ["placeholder_recherche", "Mot clé (titre, description, ville, quartier…) — français, English, العربية, darija", "Keyword (title, description, city, area…)", "كلمة مفتاحية (العنوان، الوصف، المدينة، الحي…) — فرنسية، إنجليزية، عربية، دارجة"]
];
TR.forEach(x => ajoutTrad(...x));

const REGIONS = ["Tanger-Tétouan-Al Hoceïma", "L'Oriental", "Fès-Meknès", "Rabat-Salé-Kénitra", "Béni Mellal-Khénifra", "Casablanca-Settat", "Marrakech-Safi", "Drâa-Tafilalet", "Souss-Massa", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab"];

/* ===== 9. Champs dynamiques par catégorie / sous-catégorie : [clé, fr, en, ar, type(n|t|s), options] ===== */
const MARQUE = ["marque", "Marque", "Brand", "الماركة", "t"], KM = ["km", "Kilométrage (km)", "Mileage (km)", "عدد الكيلومترات (كم)", "n"], ANNEE = ["annee", "Année", "Year", "السنة", "n"];
const ETAT = ["etat", "État", "Condition", "الحالة", "s", [["Neuf", "New", "جديد"], ["Occasion", "Used", "مستعمل"]]];
const F = {
 "logement": [["surface", "Surface (m²)", "Area (m²)", "المساحة (م²)", "n"], ["chambres", "Chambres", "Bedrooms", "الغرف", "n"], ["meuble", "Meublé", "Furnished", "مفروش", "s", [["Oui", "Yes", "نعم"], ["Non", "No", "لا"]]]],
 "voitures": [MARQUE, ["modele", "Modèle", "Model", "الطراز", "t"], ANNEE, KM, ["carburant", "Carburant", "Fuel", "الوقود", "s", [["Essence", "Petrol", "بنزين"], ["Diesel", "Diesel", "ديزل"], ["Hybride", "Hybrid", "هجين"], ["Électrique", "Electric", "كهربائي"]]], ["boite", "Boîte de vitesse", "Gearbox", "علبة السرعة", "s", [["Manuelle", "Manual", "يدوية"], ["Automatique", "Automatic", "أوتوماتيكية"]]]],
 "motos": [MARQUE, ANNEE, KM, ["cylindree", "Cylindrée (cc)", "Engine (cc)", "الحجم (سم³)", "n"]],
 "telephones": [MARQUE, ["stockage", "Stockage (Go)", "Storage (GB)", "التخزين (غيغا)", "n"], ETAT],
 "ordinateurs": [MARQUE, ["ram", "RAM (Go)", "RAM (GB)", "الذاكرة العشوائية (غيغا)", "n"], ETAT],
 "tablettes": [MARQUE, ETAT],
 "offres d'emploi": [["contrat", "Contrat", "Contract", "العقد", "s", [["CDI", "Permanent", "دائم"], ["CDD", "Fixed-term", "محدد المدة"], ["Temps partiel", "Part-time", "دوام جزئي"]]]],
 "formation": [["mode", "Mode", "Mode", "النمط", "s", [["Présentiel", "In person", "حضوري"], ["En ligne", "Online", "عبر الإنترنت"]]], ["niveau", "Niveau", "Level", "المستوى", "t"]]
};
const ALLF = {}; Object.values(F).flat().forEach(f => ALLF[f[0]] = f);
const champsPour = (sous, cat) => F[norm(sous || "")] || F[cat] || [];
const lib = f => f[1 + idxLangue()];
const optLib = (f, v) => { const o = (f[5] || []).find(x => x[0] === v); return o ? o[idxLangue()] : v; };
const $q = id => document.getElementById(id);

function champHTML(f, pre, vide) {
    const id = pre + f[0];
    if (f[4] === "s") return `<div class="form-group"><label for="${id}">${esc(lib(f))}</label><select id="${id}" data-f="${f[0]}" data-b="eq"><option value="">${vide}</option>${f[5].map(o => `<option value="${esc(o[0])}">${esc(o[idxLangue()])}</option>`).join("")}</select></div>`;
    if (f[4] === "n" && pre === "flt-") return `<div class="form-group"><label>${esc(lib(f))}</label><span class="plage"><input type="number" min="0" placeholder="min" data-f="${f[0]}" data-b="min"><input type="number" min="0" placeholder="max" data-f="${f[0]}" data-b="max"></span></div>`;
    return `<div class="form-group"><label for="${id}">${esc(lib(f))}</label><input id="${id}" type="${f[4] === "n" ? "number" : "text"}" ${f[4] === "n" ? 'min="0"' : 'maxlength="60"'} data-f="${f[0]}" data-b="has"></div>`;
}

/* Dépôt : champs facultatifs selon la sous-catégorie */
function champsDepotActuels() { const c = $q("dep-categorie").value; return champsPour($q("dep-souscat").value, c ? cleCategorie(c) : ""); }
window.lireAttributsDepot = function () {
    const o = {};
    champsDepotActuels().forEach(f => { const el = $q("dyn-" + f[0]); if (el && el.value.trim()) o[f[0]] = f[4] === "n" ? Number(el.value) : el.value.trim(); });
    return o;
};
function rendreChampsDepot() {
    const z = $q("dep-champs-dyn"); if (!z) return;
    const avant = window.lireAttributsDepot();
    z.innerHTML = champsDepotActuels().map(f => champHTML(f, "dyn-", "—")).join("");
    Object.entries(avant).forEach(([k, v]) => { const el = $q("dyn-" + k); if (el) el.value = v; });
}
function majCatDepot() {
    const s = $q("dep-categorie"), v = s.value;
    s.innerHTML = `<option value="">${T("— Choisir —", "— Choose —", "— اختر —")}</option>` + CAT_ORDRE.map(([n, k]) => `<option value="${n}">${esc(CATS_AFFICHAGE[langueActuelle][k])}</option>`).join("");
    s.value = v;
    const r = $q("dep-region"), rv = r.value;
    r.innerHTML = `<option value="">${T("— Choisir —", "— Choose —", "— اختر —")}</option>` + REGIONS.map(x => `<option>${esc(x)}</option>`).join(""); r.value = rv;
}
["dep-categorie", "dep-souscat"].forEach(id => $q(id).addEventListener("change", rendreChampsDepot));
$q("form-deposer").addEventListener("reset", () => setTimeout(() => { rendreChampsDepot(); majSousCatDepot(); }, 0));

/* Filtres dynamiques de la page d'accueil */
let FILT = {};
function rendreFiltres() {
    const z = $q("filtres-dyn"); if (!z) return;
    if (categorieActive === "toutes" || categorieActive === "infos pratiques") { z.innerHTML = ""; return; }
    const ouvert = z.querySelector("details") && z.querySelector("details").open;
    const ch = champsPour(sousCategorieActive, categorieActive);
    z.innerHTML = `<details class="fd"${ouvert ? " open" : ""}><summary>🔎 ${T("Filtres", "Filters", "تصفية متقدمة")}</summary><div class="fd-grille">
      <div class="form-group"><label>${T("Prix (DH)", "Price (MAD)", "السعر (درهم)")}</label><span class="plage"><input type="number" min="0" placeholder="min" data-f="prix" data-b="min"><input type="number" min="0" placeholder="max" data-f="prix" data-b="max"></span></div>
      ${ch.map(f => champHTML(f, "flt-", T("Tous", "All", "الكل"))).join("")}</div>
      <button type="button" class="btn btn-secondary fd-reset">${T("Effacer les filtres", "Clear filters", "مسح التصفية")}</button></details>`;
}
$q("filtres-dyn").addEventListener("input", e => {
    const el = e.target.closest("[data-f]"); if (!el) return;
    (FILT[el.dataset.f] = FILT[el.dataset.f] || {})[el.dataset.b] = el.value; afficherAnnonces();
});
$q("filtres-dyn").addEventListener("click", e => { if (e.target.closest(".fd-reset")) { FILT = {}; rendreFiltres(); afficherAnnonces(); } });
const plein = v => v !== undefined && v !== "";
function passeFiltres(a) {
    for (const [k, c] of Object.entries(FILT)) {
        const v = k === "prix" ? a.prix : (a.attributs || {})[k];
        if (plein(c.min) && !(v != null && Number(v) >= Number(c.min))) return false;
        if (plein(c.max) && !(v != null && Number(v) <= Number(c.max))) return false;
        if (plein(c.eq) && String(v) !== c.eq) return false;
        if (plein(c.has) && !nz(v).includes(nz(c.has))) return false;
    }
    return true;
}
const _fpc = filtrerParCategorie;
filtrerParCategorie = l => _fpc(l).filter(passeFiltres);
const _cc = choisirCategorie;
choisirCategorie = function (c, s) { FILT = {}; _cc(c, s); rendreFiltres(); };

/* ===== 8. Recherche : mots clés + ville, région, secteur, quartier ===== */
const adv = document.createElement("div");
adv.className = "recherche-avancee";
adv.innerHTML = `<select id="rv-ville"></select><input id="rv-quartier" type="text" maxlength="60">`;
$q("recherche-bar").appendChild(adv);
adv.addEventListener("input", () => afficherAnnonces());
function majRechercheAvancee() {
    const sv = $q("rv-ville").value;
    remplirVilles($q("rv-ville")); $q("rv-ville").options[0].textContent = T("Toutes les villes", "All cities", "كل المدن"); $q("rv-ville").value = sv;
    $q("rv-quartier").placeholder = T("Quartier", "Neighbourhood", "الحي");
}
rechercher = function (liste) {
    const on = !$q("recherche-bar").hidden, g = id => on ? nz($q(id).value) : "";
    const ville = g("rv-ville"), quartier = g("rv-quartier");
    const mots = nz(termeRecherche).split(/\s+/).filter(Boolean);
    return liste.filter(a => {
        if (ville && nz(a.ville) !== ville) return false;
        if (quartier && !nz(a.quartier).includes(quartier)) return false;
        if (!mots.length) return true;
        const txt = nz([a.titre, a.description, a.ville, a.region, a.secteur, a.quartier, a.categorie, a.sousCategorie, Object.values(a.attributs || {}).join(" ")].join(" "));
        return mots.every(m => txt.includes(m));
    });
};

/* ===== 10. « Demander un service » : mots clés français / English / العربية / darija ===== */
const DICO_BRUT = [
 ["services","Bâtiment et travaux","plombier, plomberie, plumber, plumbing, sebbak, sabbak, electricien, electricite, electrician, kahraba, kahrabaji, macon, builder, construction, bennay, peintre, painter, sbagh, sabbagh, peinture, carreleur, zellij, menuisier, carpenter, nejjar, travaux, renovation, bricolage, سباك, سباكة, كهربائي, كهرباء, بناء, بنّاي, صباغ, صباغة, زليج, نجار, أشغال, ترميم"],
 ["services","Transport et déménagement","demenagement, demenageur, transport, moving, mover, taxi, livraison, delivery, hammal, chauffeur, driver, نقل, ترحيل, شاحنة, سائق, توصيل, حمّال, طاكسي"],
 ["services","Santé et beauté","coiffeur, coiffure, hairdresser, barber, hallaq, coiffeuse, beaute, beauty, maquillage, makeup, esthetique, massage, medecin, doctor, docteur, tbib, dentiste, dentist, infirmier, nurse, clinique, clinic, حلاق, حلاقة, كوافور, تجميل, مساج, طبيب, دكتور, طبيبة, أسنان, ممرض, عيادة"],
 ["services","Réparation","reparation, repair, reparateur, depannage, tsliyh, mecanicien, mechanic, garage, mikanisien, إصلاح, تصليح, ميكانيكي, كراج, صيانة, تصليح هاتف, تصليح سيارة"],
 ["services","Événements","mariage, wedding, fete, party, traiteur, catering, photographe, photographer, negafa, animation, عرس, زفاف, حفل, حفلات, مناسبة, نكافة, مصور, تصوير, متعهد حفلات, تنشيط"],
 ["services","Offres d'emploi","emploi, job, jobs, work, travail, recrutement, hiring, vacancy, khedma, offre d'emploi, شغل, عمل, خدمة, وظيفة, توظيف, مطلوب"],
 ["services","Demandes d'emploi","cherche emploi, cherche travail, demande d'emploi, job seeker, looking for job, kanqlb 3la khedma, chomeur, كنقلب على خدمة, نبحث عن عمل, أبحث عن عمل, طالب عمل, عاطل"],
 ["services","Stages","stage, stages, internship, intern, stagiaire, تدريب, تداريب, متدرب"],
 ["services","Freelance","freelance, freelancer, independant, graphiste, designer, developpeur, developer, عمل حر, مستقل, مصمم, مبرمج"],
 ["logement","Vente","achat immobilier, acheter appartement, buy house, for sale, appartement a vendre, maison a vendre, vendre, bi3, بيع, شراء, للبيع, نبيع, شقة للبيع, منزل للبيع"],
 ["logement","Location","location, louer, rent, renting, for rent, kra, kri, kira, كراء, للكراء, إيجار, نكري, شقة للكراء, دار للكراء"],
 ["logement","Location vacances","vacances, holiday, vacation, gite, airbnb, عطلة, عطل, كراء العطل, شاليه, كراء الصيف"],
 ["logement","Colocation","colocation, roommate, flatshare, سكن مشترك, تقاسم السكن"],
 ["logement","Terrains","terrain, terrains, land, plot, ard, أرض, أراضي, بقعة, قطعة أرضية"],
 ["logement","Locaux commerciaux","local commercial, locaux, bureau, office, boutique, shop, hanout, hanut, محل, محلات, مكتب, حانوت, محل تجاري"],
 ["logement","","logement, housing, immobilier, appartement, villa, maison, studio, house, flat, dar, سكن, عقار, عقارات, شقة, فيلا, دار, منزل, استوديو"],
 ["formation","Cours particuliers","cours, soutien, lesson, lessons, tutor, tutoring, prof, professeur, teacher, dars, dros, دروس, دروس خصوصية, دعم, أستاذ, مدرس, تدريس"],
 ["formation","Langues","langue, langues, language, anglais, english, francais, french, espagnol, spanish, allemand, german, لغة, لغات, إنجليزية, فرنسية, إسبانية, ألمانية, تعلم اللغات"],
 ["formation","Informatique","informatique, computing, programmation, programming, coding, excel, bureautique, معلوميات, برمجة, حاسوب, إكسيل, مكتبية"],
 ["formation","Formation professionnelle","formation professionnelle, vocational, diplome, certificate, تكوين مهني, دبلوم, شهادة, تكوين"],
 ["formation","","formation, formations, training, course, ecole, school, تكوين, تكوينات, دورة, مدرسة, تعليم"],
 ["commerce","Voitures","voiture, voitures, car, cars, auto, automobile, tomobil, tonobil, سيارة, سيارات, طوموبيل, أوتو"],
 ["commerce","Motos","moto, motos, motorbike, scooter, motorcycle, motor, دراجة نارية, دراجات نارية, موطور, سكوتر"],
 ["commerce","Camions et utilitaires","camion, camionnette, utilitaire, truck, van, شاحنة, كاميون, سيارة نفعية"],
 ["commerce","Pièces et accessoires","pieces detachees, spare parts, pneu, tyre, tire, قطع غيار, عجلة, إطار"],
 ["commerce","Vélos","velo, velos, bike, bicycle, bicyclette, دراجة, دراجة هوائية, بسكليت"],
 ["commerce","Téléphones","telephone, telephones, phone, iphone, samsung, huawei, smartphone, mobile, portable, tilifoun, tilifon, هاتف, هواتف, تيليفون, موبايل, جوال, آيفون, سامسونغ"],
 ["commerce","Ordinateurs","ordinateur, ordinateurs, ordi, pc, laptop, computer, macbook, حاسوب, كمبيوتر, لابتوب, ماك"],
 ["commerce","Tablettes","tablette, tablet, ipad, لوح, لوحة إلكترونية, جهاز لوحي, آيباد"],
 ["commerce","Mode et vêtements","vetement, vetements, habits, clothes, fashion, robe, chaussures, shoes, djellaba, caftan, hwayej, ملابس, لباس, حوايج, جلابة, قفطان, أحذية, فستان"],
 ["commerce","Maison et meubles","meuble, meubles, furniture, canape, sofa, decoration, salon, أثاث, كنبة, ديكور, صالون, مفروشات"],
 ["commerce","Électroménager","electromenager, frigo, refrigerateur, machine a laver, washing machine, fridge, television, tele, كهرومنزلي, ثلاجة, غسالة, تلفاز, تلفزيون"],
 ["commerce","Alimentation","alimentation, food, nourriture, epicerie, grocery, makla, غذاء, مواد غذائية, بقالة, أكل"],
 ["commerce","Artisanat","artisanat, crafts, handmade, tapis, carpet, poterie, صناعة تقليدية, حرف, زربية, خزف, صناعة يدوية"],
 ["commerce","Accessoires","accessoire, accessoires, coque, chargeur, charger, casque, headphones, إكسسوار, إكسسوارات, غطاء, شاحن, سماعات"],
 ["infos pratiques","","pharmacie, pharmacy, train, trains, meteo, weather, priere, prayer, police, urgence, emergency, صيدلية, صيدليات, قطار, قطارات, طقس, صلاة, أوقات الصلاة, شرطة, استعجال, طوارئ"]
];
const DICO = DICO_BRUT.map(([c, s, k]) => ({ c, s, k: k.split(",").map(x => dz(x)).filter(x => x.length > 1) }));
function trouverService(q) {
    const h = dz(q), toks = h.split(" "); let best = null;
    DICO.forEach(e => e.k.forEach(k => {
        const ar = /[\u0600-\u06FF]/.test(k), multi = k.includes(" ");
        const ok = multi || ar ? h.includes(k) : (k.length <= 4 ? toks.includes(k) : toks.some(t => t.startsWith(k)));
        if (ok && (!best || k.length > best.n)) best = { c: e.c, s: e.s, n: k.length };
    }));
    return best;
}
function toast(msg) {
    let z = $q("toast"); if (!z) { z = document.createElement("div"); z.id = "toast"; document.body.appendChild(z); }
    z.textContent = msg; z.classList.add("on"); clearTimeout(z._t); z._t = setTimeout(() => z.classList.remove("on"), 4000);
}
const dlg = document.createElement("dialog");
dlg.id = "modal-demande";
dlg.innerHTML = `<div class="modal-content"><span class="close-btn" onclick="fermerModal('modal-demande')">&times;</span><h3 id="dm-titre"></h3><p class="petit-info" id="dm-aide"></p>
<form id="form-demande"><div class="form-group"><input type="text" id="dm-q" maxlength="100" autocomplete="off" required></div><button type="submit" class="btn" id="dm-ok"></button></form>
<div class="dm-exemples" id="dm-ex"></div></div>`;
document.body.appendChild(dlg);
function majDemande() {
    $q("dm-titre").textContent = T("🙋 Demander un service", "🙋 Request a service", "🙋 اطلب خدمة");
    $q("dm-aide").textContent = T("Écrivez ce que vous cherchez, dans votre langue (français, English, العربية, darija).", "Type what you need in your own language (French, English, Arabic, Darija).", "اكتب ما تبحث عنه بلغتك (الفرنسية، الإنجليزية، العربية، الدارجة).");
    $q("dm-q").placeholder = T("ex : plombier, kra dar, إصلاح هاتف…", "e.g. plumber, flat to rent, phone repair…", "مثال: سباك، كراء دار، إصلاح هاتف…");
    $q("dm-ok").textContent = T("Chercher", "Search", "بحث");
    $q("dm-ex").innerHTML = ["plombier", "kra dar", "dros", "phone repair", "سباك", "kanqlb 3la khedma"].map(x => `<button type="button" class="puce">${x}</button>`).join("");
}
dlg.addEventListener("click", e => { const p = e.target.closest(".puce"); if (p) { $q("dm-q").value = p.textContent; $q("form-demande").requestSubmit(); } });
$q("btn-demander").addEventListener("click", () => { majDemande(); $q("dm-q").value = ""; dlg.showModal(); $q("dm-q").focus(); });
$q("form-demande").addEventListener("submit", e => {
    e.preventDefault();
    const q = $q("dm-q").value.trim(); if (!q) return;
    const r = trouverService(q); dlg.close();
    FILT = {}; $q("champ-recherche").value = ""; termeRecherche = "";
    if (r) {
        choisirCategorie(r.c, r.s || undefined);
        toast(T("Résultats pour « ", "Results for “", "نتائج «") + q + T(" » ? ", "” ? ", "» → ") + CATS_AFFICHAGE[langueActuelle][r.c] + (r.s ? " › " + nomSousCat(r.c, r.s) : ""));
    } else {
        choisirCategorie("toutes");
        if ($q("recherche-bar").hidden) $q("btn-rechercher").click();
        $q("champ-recherche").value = q; $q("champ-recherche").dispatchEvent(new Event("input"));
        toast(T("Aucune catégorie évidente : recherche par mot clé.", "No obvious category: keyword search.", "لا توجد فئة واضحة: بحث بالكلمات المفتاحية."));
    }
    $q("grille-annonces").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ===== 7. Numéro de téléphone marocain valide ===== */
const telOK = v => /^(?:\+212|00212|0)[5-7]\d{8}$/.test(String(v).replace(/[\s.\-()]/g, ""));
const _e1 = etape1Valide;
etape1Valide = function () {
    if (!_e1()) return false;
    const el = $q("dep-telephone");
    if (!telOK(el.value)) {
        el.classList.add("invalide"); el.focus();
        alert(T("Numéro invalide. Exemple : 06 12 34 56 78 ou +212 6 12 34 56 78.", "Invalid number. Example: 06 12 34 56 78 or +212 6 12 34 56 78.", "رقم غير صالح. مثال: 06 12 34 56 78 أو +212 6 12 34 56 78."));
        return false;
    }
    return true;
};

/* ===== 6. Contact masqué : affiché seulement après clic ===== */
function detailsExtra(a) {
    const L = [[T("Quartier", "Neighbourhood", "الحي"), a.quartier], [T("Région", "Region", "الجهة"), a.region], [T("Secteur", "Sector", "القطاع"), a.secteur]];
    Object.entries(a.attributs || {}).forEach(([k, v]) => { const f = ALLF[k]; if (f) L.push([lib(f), optLib(f, v)]); });
    const l = L.filter(x => x[1]);
    return l.length ? `<ul class="det-extra">${l.map(([n, v]) => `<li><strong>${esc(n)} :</strong> ${esc(v)}</li>`).join("")}</ul>` : "";
}
const _det = afficherDetailAnnonce;
afficherDetailAnnonce = function (a, relance) {
    _det(a, relance);
    const art = document.querySelector("#contenu-page-detail .detail-article"); if (!art) return;
    art.querySelectorAll(".detail-contact").forEach(x => x.remove());
    art.insertAdjacentHTML("beforeend", detailsExtra(a) + `<div class="detail-contact contact-cache"><button type="button" class="btn" id="btn-voir-contact">📞 ${T("Afficher le contact", "Show contact", "إظهار رقم الاتصال")}</button><div id="zone-contact"></div></div>`);
    const montrer = tel => {
        $q("btn-voir-contact").hidden = true;
        $q("zone-contact").innerHTML = `<p><strong>${t("lbl_contact")} :</strong> ${esc(tel)}</p><a class="btn btn-tel" href="tel:+${lienTel(tel)}">📞 ${t("btn_appeler")}</a> <a class="btn btn-wa" href="https://wa.me/${lienTel(tel)}" target="_blank" rel="noopener">💬 WhatsApp</a>`;
    };
    if (a._tel) return montrer(a._tel);
    $q("btn-voir-contact").onclick = async () => {
        let tel = a.telephone || "";
        if (!tel && typeof sb !== "undefined") {
            let { data, error } = await sb.rpc("obtenir_contact", { p_id: a.id });
            if (error && /obtenir_contact|function/i.test(error.message || "")) {   // migration non appliquée (test) : lecture directe
                const r = await sb.from("annonces").select("telephone").eq("id", a.id).maybeSingle();
                if (r.data) { tel = r.data.telephone || ""; error = null; }
            }
            if (error) return alert(T("Contact indisponible pour le moment. Réessayez plus tard.", "Contact unavailable right now. Try again later.", "الاتصال غير متاح حاليا. حاول لاحقا."));
            if (!tel) tel = data || tel;
        }
        if (!tel) return alert(T("Aucun numéro renseigné.", "No number provided.", "لم يتم إدخال أي رقم."));
        a._tel = tel; montrer(tel);
    };
};

/* ===== 2. Appareil photo ===== */
const zoneMed = $q("dep-drop"), cam = document.createElement("input");
cam.type = "file"; cam.accept = "image/*"; cam.setAttribute("capture", "environment"); cam.hidden = true;
const bCam = document.createElement("button");
bCam.type = "button"; bCam.className = "btn btn-camera";
zoneMed.insertAdjacentElement("afterend", bCam); bCam.after(cam);
bCam.onclick = () => cam.click();
cam.onchange = () => {
    if (!cam.files.length) return;
    const dt = new DataTransfer(); [...cam.files].forEach(f => dt.items.add(f));
    const inp = $q("dep-fichiers"); inp.files = dt.files; inp.dispatchEvent(new Event("change")); cam.value = "";
};

/* ===== 4. Application installable (PWA) ===== */
let invite = null;
const btnInst = $q("btn-installer"), ios = /iphone|ipad|ipod/i.test(navigator.userAgent), autonome = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); invite = e; if (!autonome) btnInst.hidden = false; });
addEventListener("appinstalled", () => { btnInst.hidden = true; });
if (!autonome) btnInst.hidden = false;
btnInst.addEventListener("click", async () => {
    if (invite) { invite.prompt(); await invite.userChoice; invite = null; btnInst.hidden = true; }
    else alert(ios ? T("Sur iPhone : touchez « Partager » puis « Sur l'écran d'accueil ».", "On iPhone: tap “Share” then “Add to Home Screen”.", "على آيفون: اضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية».") : T("Ouvrez le menu du navigateur (⋮ ou l'icône d'installation de la barre d'adresse), puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».", "Open the browser menu (⋮ or the install icon in the address bar), then “Install app” or “Add to Home screen”.", "افتح قائمة المتصفح (⋮ أو أيقونة التثبيت في شريط العنوان) ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»."));
});
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});

/* ===== Changement de langue ===== */
function majExt() {
    majCatDepot(); majSousCatDepot(); rendreChampsDepot(); rendreFiltres(); majRechercheAvancee(); majDemande();
    bCam.textContent = T("📷 Prendre une photo (7 max)", "📷 Take a photo (7 max)", "📷 التقاط صورة (7 كحد أقصى)");
}
const _cl = changerLangue;
changerLangue = function (l) { _cl(l); majExt(); };
changerLangue(langueActuelle);
})();

/* ===== Sélecteur de langue : 🌐 (noms complets) + abréviations Fr/En/Ar ===== */
(function () {
    const globe = document.getElementById("lang-globe"), menu = document.getElementById("lang-menu");
    if (!globe || !menu) return;
    const fermer = () => { menu.hidden = true; globe.setAttribute("aria-expanded", "false"); };
    const marquer = () => document.querySelectorAll("#lang-bar [data-lang]").forEach(b => b.classList.toggle("actif", b.dataset.lang === langueActuelle));
    globe.addEventListener("click", e => { e.stopPropagation(); const ouvrir = menu.hidden; menu.hidden = !ouvrir; globe.setAttribute("aria-expanded", String(ouvrir)); });
    document.addEventListener("click", e => { if (!e.target.closest("#lang-bar")) fermer(); else if (e.target.closest("#lang-menu button")) fermer(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") fermer(); });
    const _prec = changerLangue;
    changerLangue = function (l) { _prec(l); marquer(); };
    marquer();
})();