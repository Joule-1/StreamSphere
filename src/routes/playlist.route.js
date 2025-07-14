import { Router } from "express"
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist
} from "../controllers/playlist.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router({
    caseSensitive: true,
    strict: true,
});

router.use(verifyJWT)

router.route("/").post(createPlaylist)

router.route("/user").get(getUserPlaylists)

router.route("/:playlistId").get(getPlaylistById)
                            .patch(updatePlaylist)
                            .delete(deletePlaylist)
                            
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist)
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist)

export default router;