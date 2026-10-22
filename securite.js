/* ===== Nador-Service : couche de sécurité (à charger APRÈS script.js et AVANT supabase-data.js) =====
   1. Filtre de contenu : insultes, vulgarité, racisme, contenu sexuel, drogues, arnaques (FR / EN / AR / darija)
   2. Détection de code malveillant (HTML/script, SQL) dans les textes saisis
   3. Anti-spam : piège à robots (honeypot), délai minimal, limite de dépôts
   4. Anti force brute : verrouillage temporaire après trop d'échecs de connexion
   Pour ajouter un mot interdit : complétez MOTS_EXACTS (mot entier ou expression) ou MOTS_CONTENUS (fragment).
   IMPORTANT : ce contrôle côté navigateur est contournable ; le vrai blocage est assuré côté serveur par SECURITE_SUPABASE.sql. */
(function () {
    "use strict";

    const MOTS_EXACTS = ["pute", "putes", "salope", "salaud", "connard", "connasse", "encule", "enculee", "enculer", "nique", "niquer", "niquez", "ntm", "fdp", "merde", "couille", "pede", "enfoire", "trouduc", "ta gueule", "ferme ta gueule", "fils de pute", "sale arabe", "sale noir", "sale juif", "sale juive", "sale blanc", "sale negre", "sale race", "sous race", "sous homme", "negre", "bougnoule", "bicot", "youpin", "chinetoque", "mort aux arabes", "mort aux juifs", "mort aux noirs", "mort aux amazighs", "mort aux berberes", "mort aux chretiens", "mort aux musulmans", "mort aux blancs", "heil hitler", "sieg heil", "xxx", "escort", "escorte", "prostituee", "prostitue", "prostitution", "baise", "branler", "branlette", "suceuse", "sodomie", "fellation", "nude", "nudes", "sexcam", "onlyfans", "erotique", "plan cul", "massage erotique", "massage sexuel", "rencontre coquine", "sugar daddy", "viagra", "cialis", "levitra", "cocaine", "heroine", "ecstasy", "mdma", "captagon", "karkoubi", "chira", "hachich", "haschich", "faux billets", "faux dirhams", "faux papiers", "carte clonee", "pirater un compte", "pirater compte", "hacker compte", "hack compte", "hack facebook", "hack instagram", "hack whatsapp", "espionner whatsapp", "ddos", "shit", "shits", "bullshit", "bitch", "bitches", "bastard", "asshole", "dickhead", "pussy", "cunt", "whore", "slut", "faggot", "fag", "blowjob", "handjob", "white power", "death to arabs", "death to jews", "زب", "زبي", "كس", "كسمك", "كسك", "نيك", "نيكمك", "ينيك", "عرص", "شرموط", "شرموطه", "منيوك", "متناك", "عاهر", "عاهره", "سكس", "اباحي", "اباحيه", "بورنو", "دعاره", "نودز", "ولد الحرام", "ولد الزنا", "ابن الزنا", "ابن الحرام", "كحلوش", "الموت لليهود", "الموت للعرب", "الموت للامازيغ", "الموت للسود", "الموت للمسلمين", "الموت للمسيحيين", "هيل هتلر", "zebi", "zbi", "zeb", "zamel", "zaml", "kahlouch", "kahlush", "mnayk", "mnayak", "mnaik", "nik mok", "nik omak", "nik ommek", "wld lhram", "ould lhram"];
    /* Fragments comparés AVANT suppression des lettres doublées (évite de confondre « nigger » avec « Niger ») */
    const MOTS_BRUTS = ["nigger", "nigga", "niggr"];
    const MOTS_CONTENUS = ["putain", "salope", "connard", "enculer", "fuck", "porno", "pornographie", "porn", "sexcam", "motherfucker", "qahba", "kahba", "gahba", "nikmok", "niqmok", "nikomak", "niqomak", "قحب", "bougnoule", "merde"];

    /* ---------- Normalisation (accents, arabe, chiffres/symboles utilisés pour tricher : f*ck, p3te, 9a7ba…) ---------- */
    const remplacer = (v, de, vers) => v.replace(/[\s\S]/g, c => { const i = de.indexOf(c); return i < 0 ? c : vers[i]; });
    const LEET_DE = "013457@$!", LEET_VERS = "oieastasi";
    const DAR_DE = "973258", DAR_VERS = "qhaakg";

    function base(t) {
        let v = String(t == null ? "" : t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return v.replace(/[\u064B-\u065F\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
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

    document.addEventListener("DOMContentLoaded", () => {
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
    });

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
})();
