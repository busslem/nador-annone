/* Couche Supabase pour Nador-Annonces : à charger APRÈS script.js */
const sb = supabase.createClient("https://lmcrljbcxjpwvbhoqtxw.supabase.co", "sb_publishable_NYhmeyCG7GPGZrJYsh0jFg_7V5YGrYE");

annonces = []; flashs = []; estAdmin = false; utilisateurConnecte = null;
sauvegarder = () => true;   // plus de localStorage : tout est dans Supabase

let catIds = {}, catNoms = {};
const erreur = (m, e) => { console.error(m, e); alert(m + (e && e.message ? "\n(" + e.message + ")" : "")); };

async function chargerCategories() {
    const { data } = await sb.from("categories").select("id,nom_fr");
    (data || []).forEach(c => { catIds[c.nom_fr] = c.id; catNoms[c.id] = c.nom_fr; });
}
async function chargerAnnonces() {
    const { data, error } = await sb.from("annonces").select("*, annonce_medias(url,type,ordre)")
        .eq("statut", "active").order("created_at", { ascending: false });
    if (error) return console.error(error);
    annonces = data.map(a => ({
        id: a.id, user_id: a.user_id, titre: a.titre, categorie: catNoms[a.categorie_id] || "Autres",
        ville: a.ville, prix: a.prix, description: a.description, telephone: a.telephone || "",
        localisation: a.localisation || "", sousCategorie: a.sous_categorie || "", premium: a.premium, vues: a.vues, date: Date.parse(a.created_at),
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
    if (error) return alert("Email ou mot de passe incorrect.");
    await appliquerSession(data.session);
    if (!estAdmin) { await sb.auth.signOut(); await appliquerSession(null); majUI(); return alert("Ce compte n'est pas administrateur."); }
    $("admin-pass").value = ""; fermerModal("modal-admin"); majUI();
}, true);

$("form-user-auth").addEventListener("submit", async e => {
    e.stopImmediatePropagation(); e.preventDefault();
    const email = $("u-email").value.trim().toLowerCase(), password = $("u-mdp").value;
    let res;
    if (modeInscription) {
        res = await sb.auth.signUp({ email, password, options: { data: { nom_complet: $("u-nom").value.trim() } } });
        if (!res.error && !res.data.session) return alert("Compte créé. Vérifiez votre email pour confirmer votre inscription, puis connectez-vous.");
    } else res = await sb.auth.signInWithPassword({ email, password });
    if (res.error) return alert(modeInscription ? "Inscription impossible : " + res.error.message : "Email ou mot de passe incorrect.");
    await appliquerSession(res.data.session);
    $("form-user-auth").reset(); fermerModal("modal-user"); majUI();
}, true);

deconnexion = async function () { await sb.auth.signOut(); await appliquerSession(null); majUI(); };
estAutoriseAModifier = a => estAdmin || (utilisateurConnecte && a.user_id === utilisateurConnecte.id);
modifierAnnonce = () => alert("La modification d'annonce sera reconnectée à la prochaine étape. Vous pouvez la supprimer et la republier.");

/* ---------- Annonces ---------- */
supprimerAnnonce = async function (id) {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    const { error } = await sb.from("annonces").delete().eq("id", id);
    if (error) return erreur("Suppression impossible.", error);
    fermerPageDetail(); await chargerAnnonces(); afficherAnnonces();
};
togglePremium = async function (id) {
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
            telephone: $("dep-telephone").value.trim(), localisation: $("dep-localisation").value.trim()
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

supprimerFlash = async function (id) {
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
