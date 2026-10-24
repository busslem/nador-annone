-- ===== Nador-Service : scripts Supabase regroupés =====
-- Exécutez les parties 1 puis 2 UNE FOIS dans Supabase > SQL Editor (relançables sans danger).
-- La partie 3 n'est utile qu'en cas de problème de lecture des annonces.


-- ######################################################################
-- 1. MIGRATION (à exécuter en premier)
-- ######################################################################
-- ===== MIGRATION Nador-Service — à exécuter UNE FOIS dans Supabase > SQL Editor, AVANT de mettre en ligne les nouveaux fichiers =====
-- Peut être relancée sans danger.

-- 1. Nouvelle catégorie principale « Logement » (les anciennes annonces « Immobilier » y sont rattachées par le site)
--    Les colonnes slug, nom_en et nom_ar sont obligatoires dans votre table categories.
insert into categories (slug, nom_fr, nom_en, nom_ar) select 'logement', 'Logement', 'Housing', 'سكن' where not exists (select 1 from categories where nom_fr = 'Logement' or slug = 'logement');

-- 2. Nouveaux champs : localisation fine et caractéristiques (prix, marque, kilométrage, chambres…)
alter table annonces add column if not exists quartier text;
alter table annonces add column if not exists region text;
alter table annonces add column if not exists secteur text;
alter table annonces add column if not exists attributs jsonb not null default '{}'::jsonb;
alter table annonces drop constraint if exists annonces_champs_longueur;
alter table annonces add constraint annonces_champs_longueur check (
  char_length(coalesce(quartier,'')) <= 80 and char_length(coalesce(region,'')) <= 80
  and char_length(coalesce(secteur,'')) <= 80 and length(attributs::text) <= 2000) not valid;

-- 3. Numéro marocain valide uniquement (05/06/07 + 8 chiffres, ou +212 / 00212) — nouvelles annonces
alter table annonces drop constraint if exists annonces_tel_maroc;
alter table annonces add constraint annonces_tel_maroc check (
  telephone is null or regexp_replace(telephone, '[ .()-]', '', 'g') ~ '^(\+212|00212|0)[5-7][0-9]{8}$') not valid;

-- 4. Téléphone MASQUÉ : la colonne n'est plus lisible publiquement, seule la fonction obtenir_contact() la renvoie
revoke select on annonces from anon, authenticated;
grant select (id, user_id, categorie_id, titre, description, ville, prix, localisation, sous_categorie, premium, vues, created_at, statut, quartier, region, secteur, attributs)
  on annonces to anon, authenticated;

create table if not exists contact_log (id bigserial primary key, ip text, annonce_id text, created_at timestamptz not null default now());
alter table contact_log enable row level security;   -- aucune policy : invisible pour le public

create or replace function obtenir_contact(p_id annonces.id%type) returns text
language plpgsql security definer set search_path = public as $$
declare v_ip text; v_tel text;
begin
  v_ip := coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', 'inconnu');
  if (select count(*) from contact_log where ip = v_ip and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Trop de demandes de contact. Réessayez plus tard.';
  end if;
  select telephone into v_tel from annonces where id = p_id and statut = 'active';
  insert into contact_log (ip, annonce_id) values (v_ip, p_id::text);
  return v_tel;
end $$;
grant execute on function obtenir_contact(annonces.id%type) to anon, authenticated;

-- 5. Maximum 7 photos par annonce (contrôle côté serveur)
create or replace function limiter_medias() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'image' and (select count(*) from annonce_medias where annonce_id = new.annonce_id and type = 'image') >= 7 then
    raise exception '7 photos maximum par annonce.';
  end if;
  return new;
end $$;
drop trigger if exists trg_limiter_medias on annonce_medias;
create trigger trg_limiter_medias before insert on annonce_medias for each row execute function limiter_medias();

-- 6. Vérification : doit renvoyer 'ok' et AUCUNE colonne telephone pour anon
-- select 'ok' where has_column_privilege('anon','annonces','id','select') and not has_column_privilege('anon','annonces','telephone','select');


-- ######################################################################
-- 2. SÉCURITÉ SERVEUR
-- ######################################################################
-- ===== SÉCURITÉ SERVEUR — Nador-Service =====
-- À exécuter UNE FOIS dans Supabase > SQL Editor. Peut être relancé sans danger.
-- Le navigateur peut être contourné par un pirate : ce script applique les mêmes règles DIRECTEMENT dans la base.

-- 1. Liste des mots interdits (modifiable : Table Editor > mots_interdits)
create table if not exists mots_interdits (
  mot text primary key,
  mode text not null default 'exact' check (mode in ('exact','contient','brut'))
);
alter table mots_interdits enable row level security;   -- aucune policy = invisible pour le public (le trigger y accède quand même)

insert into mots_interdits (mot, mode) values
  ('pute','exact'),
  ('putes','exact'),
  ('salope','exact'),
  ('salaud','exact'),
  ('connard','exact'),
  ('connasse','exact'),
  ('encule','exact'),
  ('enculee','exact'),
  ('enculer','exact'),
  ('nique','exact'),
  ('niquer','exact'),
  ('niquez','exact'),
  ('ntm','exact'),
  ('fdp','exact'),
  ('merde','exact'),
  ('couille','exact'),
  ('pede','exact'),
  ('enfoire','exact'),
  ('trouduc','exact'),
  ('ta gueule','exact'),
  ('ferme ta gueule','exact'),
  ('fils de pute','exact'),
  ('sale arabe','exact'),
  ('sale noir','exact'),
  ('sale juif','exact'),
  ('sale juive','exact'),
  ('sale blanc','exact'),
  ('sale negre','exact'),
  ('sale race','exact'),
  ('sous race','exact'),
  ('sous homme','exact'),
  ('negre','exact'),
  ('bougnoule','exact'),
  ('bicot','exact'),
  ('youpin','exact'),
  ('chinetoque','exact'),
  ('mort aux arabes','exact'),
  ('mort aux juifs','exact'),
  ('mort aux noirs','exact'),
  ('mort aux amazighs','exact'),
  ('mort aux berberes','exact'),
  ('mort aux chretiens','exact'),
  ('mort aux musulmans','exact'),
  ('mort aux blancs','exact'),
  ('heil hitler','exact'),
  ('sieg heil','exact'),
  ('xxx','exact'),
  ('escort','exact'),
  ('escorte','exact'),
  ('prostituee','exact'),
  ('prostitue','exact'),
  ('prostitution','exact'),
  ('baise','exact'),
  ('branler','exact'),
  ('branlette','exact'),
  ('suceuse','exact'),
  ('sodomie','exact'),
  ('fellation','exact'),
  ('nude','exact'),
  ('nudes','exact'),
  ('sexcam','exact'),
  ('onlyfans','exact'),
  ('erotique','exact'),
  ('plan cul','exact'),
  ('massage erotique','exact'),
  ('massage sexuel','exact'),
  ('rencontre coquine','exact'),
  ('sugar daddy','exact'),
  ('viagra','exact'),
  ('cialis','exact'),
  ('levitra','exact'),
  ('cocaine','exact'),
  ('heroine','exact'),
  ('ecstasy','exact'),
  ('mdma','exact'),
  ('captagon','exact'),
  ('karkoubi','exact'),
  ('chira','exact'),
  ('hachich','exact'),
  ('haschich','exact'),
  ('faux billets','exact'),
  ('faux dirhams','exact'),
  ('faux papiers','exact'),
  ('carte clonee','exact'),
  ('pirater un compte','exact'),
  ('pirater compte','exact'),
  ('hacker compte','exact'),
  ('hack compte','exact'),
  ('hack facebook','exact'),
  ('hack instagram','exact'),
  ('hack whatsapp','exact'),
  ('espionner whatsapp','exact'),
  ('ddos','exact'),
  ('shit','exact'),
  ('shits','exact'),
  ('bullshit','exact'),
  ('bitch','exact'),
  ('bitches','exact'),
  ('bastard','exact'),
  ('asshole','exact'),
  ('dickhead','exact'),
  ('pussy','exact'),
  ('cunt','exact'),
  ('whore','exact'),
  ('slut','exact'),
  ('faggot','exact'),
  ('fag','exact'),
  ('blowjob','exact'),
  ('handjob','exact'),
  ('white power','exact'),
  ('death to arabs','exact'),
  ('death to jews','exact'),
  ('قحبة','exact'),
  ('شرموطة','exact'),
  ('عاهرة','exact'),
  ('زانية','exact'),
  ('ابن الزانية','exact'),
  ('ولد القحبة','exact'),
  ('ولد الحرام','exact'),
  ('ابن الحرام','exact'),
  ('زامل','exact'),
  ('زبي','exact'),
  ('كس امك','exact'),
  ('كسمك','exact'),
  ('نيك امك','exact'),
  ('منيوك','exact'),
  ('منايك','exact'),
  ('عرص','exact'),
  ('ديوث','exact'),
  ('كحلوش','exact'),
  ('ابن الكلب','exact'),
  ('الموت للعرب','exact'),
  ('الموت لليهود','exact'),
  ('الموت للأمازيغ','exact'),
  ('الموت للسود','exact'),
  ('سكس','exact'),
  ('سكس مغربي','exact'),
  ('دعارة','exact'),
  ('عاهرات','exact'),
  ('قحاب','exact'),
  ('zebi','exact'),
  ('zbi','exact'),
  ('zeb','exact'),
  ('zamel','exact'),
  ('zaml','exact'),
  ('kahlouch','exact'),
  ('kahlush','exact'),
  ('mnayk','exact'),
  ('mnayak','exact'),
  ('mnaik','exact'),
  ('nik mok','exact'),
  ('nik omak','exact'),
  ('nik ommek','exact'),
  ('wld lhram','exact'),
  ('ould lhram','exact'),
  ('putain','contient'),
  ('salope','contient'),
  ('connard','contient'),
  ('enculer','contient'),
  ('fuck','contient'),
  ('porno','contient'),
  ('pornographie','contient'),
  ('porn','contient'),
  ('sexcam','contient'),
  ('motherfucker','contient'),
  ('qahba','contient'),
  ('kahba','contient'),
  ('gahba','contient'),
  ('nikmok','contient'),
  ('niqmok','contient'),
  ('nikomak','contient'),
  ('niqomak','contient'),
  ('bougnoule','contient'),
  ('merde','contient')
on conflict (mot) do nothing;
insert into mots_interdits (mot, mode) values ('nigger','brut'),('nigga','brut'),('niggr','brut') on conflict (mot) do nothing;

-- 2. Normalisation du texte (accents, arabe, chiffres/symboles de triche, lettres répétées)
create or replace function normaliser_texte(t text, variante int default 0, reduire boolean default true)
returns text language plpgsql immutable as $$
declare v text := lower(coalesce(t, ''));
begin
  v := translate(v, 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy');
  v := regexp_replace(v, '[' || chr(1611) || '-' || chr(1631) || chr(1600) || ']', '', 'g');
  v := translate(v, 'أإآىة', 'ااايه');
  if variante = 1 then v := translate(v, '013457@$!', 'oieastasi');
  elsif variante = 2 then v := translate(v, '973258', 'qhaakg');
  end if;
  v := regexp_replace(v, '[^a-z' || chr(1569) || '-' || chr(1610) || ']+', ' ', 'g');
  if reduire then v := regexp_replace(v, '(.)\1+', '\1', 'g'); end if;
  return ' ' || btrim(v) || ' ';
end $$;

-- 3. Renvoie le premier mot interdit trouvé (ou NULL)
create or replace function contient_interdit(t text)
returns text language plpgsql stable security definer set search_path = public as $$
declare r record; v text; m text; i int;
begin
  for i in 0..2 loop
    v := normaliser_texte(t, i);
    for r in select mot, mode from mots_interdits loop
      if r.mode = 'brut' then
        if i < 2 and position(btrim(normaliser_texte(r.mot, 0, false)) in normaliser_texte(t, i, false)) > 0 then return r.mot; end if;
        continue;
      end if;
      m := btrim(normaliser_texte(r.mot, 0));
      if m = '' then continue; end if;
      if r.mode = 'contient' then
        if position(m in v) > 0 then return r.mot; end if;
      else
        if position((' ' || m || ' ') in v) > 0 or position((' ' || m || 's ') in v) > 0 then return r.mot; end if;
      end if;
    end loop;
  end loop;
  return null;
end $$;

-- 4. Contrôle des annonces : contenu, code malveillant, tailles, anti-flood, champs protégés
-- Fonctions d'appui (security definer : elles lisent des tables protégées sans les exposer)
create or replace function est_admin_courant() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;
create or replace function nb_annonces_telephone(p_tel text) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from annonces where telephone = p_tel and created_at > now() - interval '1 hour';
$$;
create or replace function nb_annonces_minute() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from annonces where created_at > now() - interval '1 minute';
$$;

-- Le trigger lui-même n'est PAS security definer : ainsi current_user = le rôle de l'appelant (anon / authenticated),
-- et les mises à jour faites par vos fonctions internes (compteur de vues, premium) ne sont pas bloquées.
create or replace function moderer_annonce()
returns trigger language plpgsql set search_path = public as $$
declare mot text; est_admin boolean := est_admin_courant(); direct boolean := current_user in ('anon','authenticated');
begin
  if not est_admin then
    mot := contient_interdit(coalesce(new.titre,'') || ' . ' || coalesce(new.description,'') || ' . ' || coalesce(new.localisation,''));
    if mot is not null then
      raise exception 'Contenu interdit (« % ») : les insultes, propos vulgaires, racistes ou sexuels ne sont pas acceptés.', mot;
    end if;
    if coalesce(new.titre,'') || coalesce(new.description,'') || coalesce(new.localisation,'') ~* '<\s*/?\s*(script|iframe|object|embed|svg|style|img)|javascript\s*:|data\s*:\s*text/html' then
      raise exception 'Code non autorisé dans l''annonce.';
    end if;
    if length(coalesce(new.titre,'')) > 100 or length(coalesce(new.description,'')) > 5000 or length(coalesce(new.localisation,'')) > 500 or length(coalesce(new.telephone,'')) > 20 then
      raise exception 'Texte trop long.';
    end if;
    if new.prix is not null and (new.prix < 0 or new.prix > 999999999) then
      raise exception 'Prix invalide.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if direct and not est_admin then
      new.premium := false;  new.vues := 0;
      if nb_annonces_telephone(new.telephone) >= 5 then
        raise exception 'Trop d''annonces avec ce numéro. Réessayez plus tard.';
      end if;
      if nb_annonces_minute() >= 40 then
        raise exception 'Le service est très sollicité. Réessayez dans une minute.';
      end if;
    end if;
  elsif direct and not est_admin then
    new.premium := old.premium;  new.vues := old.vues;   -- un utilisateur ne peut pas se mettre « premium » ni truquer les vues
  end if;
  return new;
end $$;

drop trigger if exists trg_moderer_annonce on annonces;
create trigger trg_moderer_annonce before insert or update on annonces
  for each row execute function moderer_annonce();

-- 5. Contrôle du nom des comptes
create or replace function moderer_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if contient_interdit(new.nom_complet) is not null or coalesce(new.nom_complet,'') ~* '<|>|javascript\s*:' or length(coalesce(new.nom_complet,'')) > 60 then
    raise exception 'Nom non autorisé.';
  end if;
  return new;
end $$;
drop trigger if exists trg_moderer_profil on profiles;
create trigger trg_moderer_profil before insert or update of nom_complet on profiles
  for each row execute function moderer_profil();

-- 6. Stockage des photos/vidéos : types et poids limités (5 Mo max, images et vidéos uniquement)
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
 where id = 'medias';

-- 7. DIAGNOSTIC (lecture seule) : exécutez ces deux requêtes et vérifiez les résultats
--   a) Toutes les tables doivent avoir rowsecurity = true :
--        select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
--   b) Vérifiez qui peut écrire (INSERT/UPDATE/DELETE) :
--        select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by 1, 3;
--      Seuls les admins doivent pouvoir écrire dans flashs, flash_medias, infos_pratiques, categories, stats.
--      Pour annonces : suppression/modification réservées au propriétaire (user_id = auth.uid()) ou à un admin.


-- ######################################################################
-- 3. RÉPARATION (seulement si les annonces ont disparu)
-- ######################################################################
-- À exécuter dans Supabase > SQL Editor si les annonces ont disparu : rend la lecture publique de la table (comme avant la migration).
grant select on annonces to anon, authenticated;
-- Diagnostic : colonnes réellement présentes dans la table
select column_name from information_schema.columns where table_schema='public' and table_name='annonces' order by 1;