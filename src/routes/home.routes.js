const router = require("express").Router();
const { getHome } = require("../controllers/home.controller");
const { listActiveBanners } = require("../controllers/banner.controller");

// Public: no login needed
router.get("/home", getHome);
router.get("/banners", listActiveBanners);

module.exports = router;
