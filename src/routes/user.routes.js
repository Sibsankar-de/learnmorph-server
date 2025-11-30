import { Router } from "express"
import { checkAuth, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAvatar, updatePassword, updateUser } from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").get(verifyJwt, logoutUser);
router.route("/refresh-token").post(verifyJwt, refreshAccessToken);
router.route("/check-auth").get(verifyJwt, checkAuth);

router.route("/update-password").patch(verifyJwt, updatePassword);
router.route("/update-profile").patch(verifyJwt, updateUser);
router.route("/update-avatar").patch(verifyJwt, upload.single('avatar'), updateAvatar);

router.route("/current-user").get(verifyJwt, getCurrentUser);

export default router;