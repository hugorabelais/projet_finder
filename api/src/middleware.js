import jwt from "jsonwebtoken";

export function authentifier(req, res, next) {
  const entete = req.headers.authorization || "";
  const token = entete.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erreur: "jeton absent ou invalide" });
  }
}

export function exigeRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ erreur: "acces refuse" });
}

export function valider(schema) {
  return (req, res, next) => {
    const resultat = schema.safeParse(req.body ?? {});
    if (!resultat.success) {
      return res.status(400).json({
        erreur: "donnees invalides",
        details: resultat.error.issues,
      });
    }
    req.body = resultat.data;
    next();
  };
}
