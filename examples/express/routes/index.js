const express = require("express");
const authRoute = require("./auth");
const targetRoute = require("./targets");
const agentsRoute = require("./agents");

const router = express.Router();

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/targets",
    route: targetRoute,
  },
  {
    path: "/agents",
    route: agentsRoute,
  },
];
defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
