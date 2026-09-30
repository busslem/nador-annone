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