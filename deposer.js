const $ = id => document.getElementById(id);
const lire = (k, d) => { 
    try { 
        return JSON.parse(localStorage.getItem(k)) ?? d; 
    } catch (e) { 
        return d; 
    } 
};

const session = lire("session", null);
const estAdmin = sessionStorage.getItem("admin") === "true";
const editId = new URLSearchParams(location.search).get("edit");

let annonces = lire("annonces", []);
const medias = [];

remplirVilles($("d-ville"));
const dessiner = brancherZone("drop-zone", "d-fichiers", "apercu-fichiers", medias, 5);

const ann = editId ? annonces.find(a => String(a.id) === editId) : null;

if (editId && (!ann || !(estAdmin || (session && session.email === ann.auteurEmail)))) {
    alert("Vous n'êtes pas autorisé à modifier cette annonce.");
    location.href = "index.html";
} else if (ann) {
    $("titre-page").textContent = "✏️ Modifier l'annonce";
    $("btn-pub").textContent = "Enregistrer les modifications";
    $("d-titre").value = ann.titre;
    $("d-categorie").value = ann.categorie;
    remplirVilles($("d-ville"), ann.ville);
    $("d-prix").value = ann.prix ?? "";
    $("d-description").value = ann.description;
    $("d-telephone").value = ann.telephone || "";
    (ann.medias || []).forEach(m => medias.push(typeof m === "string" ? { type: "image", url: m } : m));
    dessiner();
} else {
    $("d-ville").value = "Nador";
}

$("info-compte").innerHTML = session
    ? `Connecté en tant que <b>${session.nom.replace(/[<>&]/g, "")}</b> : vous pourrez modifier ou supprimer cette annonce.`
    : `Aucun compte n'est nécessaire pour publier. Pour pouvoir modifier ou supprimer votre annonce plus tard, <a href="index.html?connexion=1">connectez-vous ou créez un compte</a>.`;

$("form-depot").addEventListener("submit", e => {
    e.preventDefault();
    const prix = $("d-prix").value;
    const champs = { 
        titre: $("d-titre").value.trim(), 
        categorie: $("d-categorie").value, 
        ville: $("d-ville").value, 
        prix: prix ? parseFloat(prix) : null, 
        description: $("d-description").value.trim(), 
        telephone: $("d-telephone").value.trim(), 
        medias: medias.slice() 
    };
    
    const avant = JSON.stringify(annonces);
    
    if (ann) {
        Object.assign(ann, champs);
    } else {
        annonces.unshift({ 
            id: Date.now(), 
            date: Date.now(), 
            ...champs, 
            auteurEmail: session ? session.email : "anonyme", 
            premium: false, 
            vues: 0 
        });
    }
    
    try { 
        localStorage.setItem("annonces", JSON.stringify(annonces)); 
    } catch (err) { 
        annonces = JSON.parse(avant); 
        return alert("Stockage plein : réduisez le nombre/la taille des médias."); 
    }
    
    alert(ann ? "Annonce modifiée !" : "Annonce publiée avec succès !"); 
    location.href = "index.html";
});