/* ===== Nador-Annonces&Pub : script unifié ===== */

const MDP_ADMIN = "admin123"; 
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
});

let flashs = lire("flashs", null) || [{ 
    id: 1, 
    titre: "🔥 Grande Solde d'Été sur les véhicules !", 
    type: "texte", 
    contenu: "Profitez de réductions jusqu'à -20% tout ce mois-ci !" 
}];
let utilisateurs = lire("utilisateurs", []);

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
    fr: { flash_title: "⚡ Fash", deposer_titre: "📢 Déposer une annonce", lbl_titre: "Titre de l'annonce *", lbl_ville: "Ville *", lbl_cat: "Catégorie *", lbl_tel: "Téléphone *", lbl_loc: "Localisation (Google Maps, Waze…) — facultatif", lbl_prix: "Prix (Optionnel)", lbl_desc: "Description courte *", btn_suivant: "Suivant ➔", lbl_medias: "Glissez ou sélectionnez vos fichiers (Photos, Vidéos)", btn_retour: "⬅️ Retour", btn_publier: "Publier l'annonce", annonces_titre: "🛒 Annonces récentes", visiteurs: "Visiteurs", vues: "vues" },
    en: { flash_title: "⚡ Featured Listings", deposer_titre: "📢 Post an Ad", lbl_titre: "Ad Title *", lbl_ville: "City *", lbl_cat: "Category *", lbl_tel: "Phone *", lbl_loc: "Location (Google Maps, Waze…) — optional", lbl_prix: "Price (Optional)", lbl_desc: "Short Description *", btn_suivant: "Next ➔", lbl_medias: "Drag & drop your files (Photos, Videos)", btn_retour: "⬅️ Back", btn_publier: "Publish Ad", annonces_titre: "🛒 Recent Ads", visiteurs: "Visitors", vues: "views" },
    ar: { flash_title: "⚡ الإعلانات المميزة", deposer_titre: "📢 نشر إعلان", lbl_titre: "عنوان الإعلان *", lbl_ville: "المدينة *", lbl_cat: "الفئة *", lbl_tel: "الهاتف *", lbl_loc: "الموقع (Google Maps، Waze…) — اختياري", lbl_prix: "الثمن (اختياري)", lbl_desc: "وصف قصير *", btn_suivant: "التالي ➔", lbl_medias: "اسحب الملفات هنا (صور، فيديو)", btn_retour: "⬅️ عودة", btn_publier: "نشر الإعلان", annonces_titre: "🛒 الإعلانات الحديثة", visiteurs: "الزوار", vues: "مشاهدة" }
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

$("form-admin-login").addEventListener("submit", e => {
    e.preventDefault();
    if ($("admin-pass").value === MDP_ADMIN) {
        estAdmin = true; 
        utilisateurConnecte = { email: "admin@system", nom: "Administrateur" };
        sessionStorage.setItem("admin", "true"); 
        localStorage.setItem("session", JSON.stringify(utilisateurConnecte));
        $("admin-pass").value = ""; 
        fermerModal("modal-admin"); 
        majUI();
    } else alert("Mot de passe incorrect !");
});

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
    $("btn-login-admin").style.display = co ? "none" : "inline-block";
    $("btn-login-user").style.display = co ? "none" : "inline-block";
    $("btn-logout").style.display = co ? "inline-block" : "none";
    $("btn-gerer-flash").style.display = estAdmin ? "inline-block" : "none";
    $("label-user-connecte").textContent = co ? `${t("bonjour")}, ${utilisateurConnecte.nom} ${estAdmin ? "(Admin)" : ""}` : "";
    afficherFlashs();
    afficherAnnonces();
}

/* ---------- Flash info ---------- */
/* Premier média d'un flash (nouveaux flashs : medias[], anciens : contenu) */
function flashMedia(f) {
    if (f.type === "image" || f.type === "video") return { type: f.type, url: f.contenu };
    return (f.medias || [])[0] || null;
}

function afficherFlashs() {
    const c = $("bande-flash");
    c.innerHTML = "";
    flashs.forEach(f => {
        const item = document.createElement("div");
        item.className = "marquee-item";
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
        c.appendChild(item);
    });
    appliquerTraductions(c);
}

function ouvrirDetailFlash(id) {
    const f = flashs.find(x => String(x.id) === String(id)); 
    if (!f) return;
    
    let m = f.contenu ? `<p style="white-space:pre-wrap;" data-fid="${esc(f.id)}" data-trad="contenu">${esc(f.contenu)}</p>` : "";
    if (f.type === "image") m = `<img src="${esc(f.contenu)}" style="max-width:100%;border-radius:8px;">`;
    else if (f.type === "video") m = `<video src="${esc(f.contenu)}" controls style="max-width:100%;"></video>`;
    
    m += (f.medias || []).map(x => x.type === "video" 
        ? `<video src="${esc(x.url)}" controls style="max-width:100%;margin-top:10px;"></video>` 
        : `<img src="${esc(x.url)}" style="max-width:100%;border-radius:8px;margin-top:10px;">`).join("");
    
    $("contenu-detail-flash").innerHTML = `<h2 data-fid="${esc(f.id)}" data-trad="titre">${esc(f.titre)}</h2><hr style="margin:10px 0;">${m}`;
    appliquerTraductions($("contenu-detail-flash"));
    $("modal-detail-flash").showModal();
}

let flashEnEdition = null;   // id du flash en cours de modification (null = ajout)

function rafraichirListeFlash() {
    $("liste-flashs-admin").innerHTML = flashs.length ? flashs.map(f => `
        <div class="flash-admin-ligne${String(f.id) === String(flashEnEdition) ? " en-edition" : ""}">
            <span>${esc(f.titre)}</span>
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
    const champs = { titre: $("f-titre").value.trim(), type: "texte", contenu: $("f-contenu").value, medias: mediasFlash.slice() };

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

function filtrerParCategorie(liste) {
    return categorieActive === "toutes" ? liste : liste.filter(a => cleCategorie(a.categorie) === categorieActive);
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
        const texte = norm([a.titre, a.description, a.ville, a.categorie].join(" "));
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

function choisirCategorie(cle) {
    categorieActive = cle === "toutes" ? "toutes" : cleCategorie(cle);
    document.querySelectorAll(".categorie-btn").forEach(b => {
        const actif = b.dataset.categorie === "toutes" ? categorieActive === "toutes" : cleCategorie(b.dataset.categorie) === categorieActive;
        b.classList.toggle("active", actif);
        b.setAttribute("aria-pressed", actif);
    });
    afficherAnnonces();
}

function majCompteurs() {
    document.querySelectorAll(".categorie-btn").forEach(b => {
        const cle = b.dataset.categorie;
        const n = cle === "toutes" ? annonces.length : annonces.filter(a => cleCategorie(a.categorie) === cleCategorie(cle)).length;
        let s = b.querySelector(".cat-count");
        if (!s) { s = document.createElement("span"); s.className = "cat-count"; b.appendChild(s); }
        s.textContent = n;
    });
}

function brancherCategories() {
    const barre = document.querySelector(".categories-container");
    if (!barre) return;
    barre.addEventListener("click", e => {
        const b = e.target.closest(".categorie-btn");
        if (b) choisirCategorie(b.dataset.categorie);
    });
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
    majCompteurs();

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
                <span class="annonce-cat">${esc(nomCategorie(a.categorie))}</span>
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

function voirDetailAnnonce(id) {
    const a = trouver(id);
    if (!a) return;

    const vus = lireSession("vus", []);
    if (!vus.includes(String(a.id))) {
        a.vues++;
        vus.push(String(a.id));
        sessionStorage.setItem("vus", JSON.stringify(vus));
        sauvegarder();
        afficherAnnonces();
    }

    const ref = `'${esc(a.id)}'`;
    const loc = infosLocalisation(a);
    const contact = a.telephone ? `
        <p><strong>${t("lbl_contact")} :</strong> ${esc(a.telephone)}</p>
        <a class="btn btn-tel" href="tel:+${lienTel(a.telephone)}">📞 ${t("btn_appeler")}</a>
        <a class="btn btn-wa" href="https://wa.me/${lienTel(a.telephone)}" target="_blank" rel="noopener">💬 WhatsApp</a>
    ` : "";

    $("contenu-detail-annonce").innerHTML = `
        <button type="button" class="btn btn-secondary btn-retour" onclick="retourAccueil()">⬅️ ${t("retour_accueil")}</button>
        <h2><span data-aid="${esc(a.id)}" data-trad="titre">${esc(a.titre)}</span> ${a.premium ? "⭐" : ""}</h2>
        <p style="color:#16a34a;font-size:22px;font-weight:bold;">${esc(formatPrix(a.prix))}</p>
        <p><strong>${t("lbl_categorie")} :</strong> ${esc(nomCategorie(a.categorie))} | <strong>${t("ville_det")} :</strong> ${esc(a.ville)} | <strong>👁️ ${t("lbl_vues")} :</strong> ${a.vues}</p>
        <hr style="margin:15px 0;">
        <p id="det-desc" style="line-height:1.6;white-space:pre-wrap;" data-aid="${esc(a.id)}" data-trad="desc">${esc(a.description)}</p>
        <p id="det-note-trad" class="note-trad" hidden></p>
        <p class="detail-localisation" style="margin-top:12px;"><strong>📍 ${t("lbl_localisation")} :</strong> ${esc(loc.texte)}</p>
        <div class="loc-liens">${loc.liens.map(([nom, url]) => `<a class="btn btn-loc" href="${esc(url)}" target="_blank" rel="noopener">${esc(nom)}</a>`).join("")}</div>
        ${a.medias.length ? `<h4 style="margin-top:15px;">${t("lbl_galerie")} : <small style="font-weight:normal;color:#64748b;">${t("galerie_astuce")}</small></h4><div style="display:flex;gap:10px;overflow-x:auto;margin-top:10px;">${a.medias.map((m, i) => m.type === "video" ? `<video src="${esc(m.url)}" controls style="height:120px;"></video>` : `<img src="${esc(m.url)}" alt="Photo ${i + 1}" title="${t("cliquer_agrandir")}" class="galerie-img" style="height:120px;border-radius:6px;cursor:zoom-in;" onclick="ouvrirZoom('${esc(a.id)}', ${i})">`).join("")}</div>` : ""}
        ${contact}
        <div style="margin-top:18px;"><button type="button" class="btn btn-secondary" onclick="retourAccueil()">⬅️ ${t("retour_accueil")}</button></div>
        ${estAutoriseAModifier(a) ? `<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;"><button class="btn btn-secondary" onclick="modifierAnnonce(${ref})">✏️ ${t("modifier")}</button><button class="btn" style="background:#ef4444;" onclick="supprimerAnnonce(${ref})">🗑️ ${t("supprimer")}</button></div>` : ""}
    `;
    appliquerTraductions($("contenu-detail-annonce"));
    $("modal-detail-annonce").showModal();
}

/* ---------- Agrandissement des photos & retour accueil ---------- */
let zoomId = null, zoomIndex = 0;

function afficherZoom() {
    const a = trouver(zoomId);
    if (!a || !a.medias[zoomIndex]) return;
    const m = a.medias[zoomIndex];
    $("zoom-contenu").innerHTML = m.type === "video"
        ? `<video src="${esc(m.url)}" controls autoplay></video>`
        : `<img src="${esc(m.url)}" alt="">`;
    const plusieurs = a.medias.length > 1;
    document.querySelectorAll("#modal-zoom .zoom-nav").forEach(b => b.style.display = plusieurs ? "block" : "none");
    $("zoom-compteur").textContent = plusieurs ? `${zoomIndex + 1} / ${a.medias.length}` : "";
}

function ouvrirZoom(id, i) {
    const a = trouver(id);
    if (!a || !a.medias[i]) return;
    zoomId = id;
    zoomIndex = i;
    afficherZoom();
    $("modal-zoom").showModal();
}

function changerZoom(dir) {
    const a = trouver(zoomId);
    if (!a || a.medias.length < 2) return;
    zoomIndex = (zoomIndex + dir + a.medias.length) % a.medias.length;
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
        $("modal-detail-annonce").close();
        afficherAnnonces();
    }
}

function modifierAnnonce(id) {
    location.href = "deposer.html?edit=" + encodeURIComponent(id);
}

/* ---------- Dépôt d'annonce en 2 étapes ---------- */
const mediasDepot = fichiersUploades;   // fichiers de l'étape 2
const dessinerDepot = brancherZone("dep-drop", "dep-fichiers", "dep-apercu", mediasDepot, 5);

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
    fermerModal("modal-deposer");
    choisirCategorie("toutes");
    alert("Annonce publiée avec succès !");
});

/* ---------- Démarrage ---------- */
document.addEventListener("DOMContentLoaded", () => {
    brancherCategories();
    brancherRecherche();
    brancherZoom();
    brancherActualiser();
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

