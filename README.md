finder/
README.md Q9 : ce qu'est Finder, comment démarrer, la structure des dossiers
.gitignore
docs/
spec.md Q1, cases de l'étape 1 cochées au fur et à mesure
api/
package.json
package-lock.json
node_modules/
.env
.env.example Q9 : mêmes clés que .env, valeurs vides, commité
finder-data/ Q6 : le kit, copié tel quel
hotels.json chambres.json comptes.json reservations.json README.md
src/
app.js crée et exporte l'application sans ouvrir de port ; tests Vitest/Supertest dans api/tests/
server.js importe app.js et démarre le serveur pour npm run dev ou npm start

Pour exécuter les dix tests de l'API depuis api/ :
npx prisma db seed
npm test
