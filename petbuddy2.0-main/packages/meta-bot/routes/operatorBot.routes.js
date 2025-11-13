import { Router } from "express";

// Controllers - New refactored versions
import { handlerInstagram } from "../controllers/instagram.controller.js";
import { handlerFacebook } from "../controllers/facebook.controller.js";
import * as manualFacebookController from "../controllers/facebookManualOperator.controllers.js";
import * as manualInstagramController from "../controllers/instagramManualOperator.controllers.js";

const router = Router();

// Facebook Bot - Using refactored controller
router.post("/facebook", handlerFacebook);

// Instagram Bot - Using refactored controller
router.post("/instagram", handlerInstagram);

// Manual Facebook Message Handling
router.post("/message-to-admin", manualFacebookController.sendMessageToAdmin);
router.post("/manual-facebook", manualFacebookController.handlerManualFbSend);

// Manual Instagram Message Handling
router.post("/manual-instagram", manualInstagramController.handlerManualInstagramSend);
router.post("/instagram-message-to-admin", manualInstagramController.sendMessageToAdmin);

// Future support (Telegram, etc.)
// router.post("/telegram", telegramController.handlerTelegram);

export default router;
