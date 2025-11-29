import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkAnswer, createTopicNotes, createTopicQuiz, getTopics } from "../controllers/topic.controller.js";

const router = Router();

router.route("/create-notes").post(verifyJwt, createTopicNotes);
router.route("/create-quiz").post(verifyJwt, createTopicQuiz);
router.route("/check-answer").post(verifyJwt, checkAnswer);
router.route("/").get(verifyJwt, getTopics);

export default router;