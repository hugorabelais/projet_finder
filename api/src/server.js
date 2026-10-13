import "dotenv/config";
import app, { prisma } from "./app.js";

const port = process.env.PORT ?? 3000;
const server = app.listen(port, () => {
  console.log(`API sur http://localhost:${port}`);
});

const fermerServeur = () => {
  server.close(async () => {
    await prisma.$disconnect();
  });
};

process.once("SIGINT", fermerServeur);
process.once("SIGTERM", fermerServeur);
