# CliniqueMap

Logiciel Windows (`.exe`) pour orienter un client vers les **centres d’urgence** et **cliniques vétérinaires** les plus proches.

Les cliniques sont saisies manuellement. Les mises à jour s’installent en un clic depuis l’application.

## Pour la clinique (Windows)

1. Télécharger **`CliniqueMap-Setup-x.y.z.exe`** depuis la page Releases du dépôt GitHub
2. Double-cliquer → installation automatique + raccourci Bureau
3. Ouvrir **CliniqueMap**

Quand une nouvelle version sort, l’app propose **Installer et redémarrer** en bas à gauche. Les cliniques enregistrées sont conservées.

## Développement (Mac / Windows)

```bash
npm install
npm run dev
```

## Générer l’installateur Windows

### Option A — automatique (recommandé)

1. Pousser le code sur GitHub
2. Publier une version :

```bash
# ex. nouvelle version 1.0.1
npm version patch
git push && git push --tags
```

GitHub Actions fabrique le `.exe` et le publie dans **Releases**.

### Option B — local

```bash
npm run dist:win
```

Le fichier se trouve dans `release/CliniqueMap-Setup-1.0.0.exe`.

> Astuce : le build Windows est plus fiable sur un PC Windows, ou via GitHub Actions (déjà configuré).

## Publier une mise à jour

1. Modifier le code
2. `npm version patch` (ou `minor` / `major`)
3. `git push && git push --tags`
4. Attendre la fin du workflow **Release Windows**
5. Sur les PC de la clinique : ouvrir l’app → **Installer et redémarrer**

## Cliniques centralisées (GitHub)

Le fichier **`data/cliniques.json`** sur GitHub est la source unique pour tous les PC.

### Workflow

1. Modifier les cliniques (dans l’app → **Exporter cliniques.json**, ou éditer le fichier à la main)
2. Remplacer `data/cliniques.json` dans le dépôt et **push**
3. Sous ~1 minute, chaque PC détecte le changement, affiche **« Hop modif »** et télécharge la nouvelle liste

L’app vérifie GitHub au démarrage, puis toutes les 60 secondes (bouton **Actualiser** aussi).

### Format

```json
{
  "updatedAt": "2026-11-16T00:00:00.000Z",
  "clinics": [
    {
      "id": "exemple-1",
      "name": "Urgences Vétérinaires Lyon",
      "address": "1 Avenue Tony Garnier, Lyon",
      "phone": "04 00 00 00 00",
      "notes": "24h/24",
      "category": "urgence",
      "lat": 45.7313,
      "lng": 4.8239
    }
  ]
}
```

`category` : `"urgence"` ou `"veterinaire"`.

> Le dépôt doit être **public** (ou le fichier accessible en raw) pour que les PC puissent télécharger sans token.

## Fonctionnalités

- Recherche d’adresse / ville du client
- Carte avec distances
- 2 catégories : urgence / vétérinaire
- Liste des cliniques synchronisée via GitHub
- Mise à jour automatique du logiciel (.exe)
