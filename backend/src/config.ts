
// export const config = {
//   port: Number(process.env.PORT) || 3001,
//   clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
// };

export const config = {
  port: Number(process.env.PORT) || 3001,
  // comma-separated list, e.g. "http://localhost:5173,http://localhost:4173"
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),
};